//! Primitivo único de gravação de arquivo do Mark-Lee (ML-H02).
//!
//! ## Contrato
//!
//! - **Temporário único no mesmo diretório**: `.<stem>.<pid>.<seq>.<nanos>.tmp`.
//!   O PID separa processos, o contador atômico separa chamadas concorrentes do
//!   mesmo processo e o relógio reduz a chance de colisão entre processos que
//!   reciclaram o mesmo PID. O temporário nasce com `create_new`, então um nome
//!   já ocupado nunca é sobrescrito: o nome é regerado.
//! - **Sincronização**: bytes escritos → `flush` → `sync_all` → só então a troca.
//!   No Unix o diretório também recebe `fsync` (a entrada de diretório só é
//!   durável depois disso); no Windows a troca é feita com `WRITE_THROUGH`.
//! - **Troca sem remover o destino antes**: `rename(2)` no Unix e `ReplaceFileW`
//!   no Windows, que preserva ACL, atributos e data de criação do arquivo
//!   substituído. `MoveFileExW` com `REPLACE_EXISTING | WRITE_THROUGH` entra só
//!   como queda, quando o destino desapareceu durante a operação ou o volume não
//!   implementa a troca.
//! - **Permissões preservadas**: no Unix o `rename` não herda o modo do destino,
//!   então o modo do arquivo anterior é copiado para o temporário antes da troca.
//!   No Windows quem preserva é o `ReplaceFileW`; copiar o atributo *somente
//!   leitura* para o temporário só criaria um arquivo que nem a troca nem a
//!   limpeza conseguiriam tocar.
//! - **Limpeza**: o temporário é removido por guarda RAII em qualquer saída que
//!   não seja sucesso. Nenhum temporário sobrevive a uma operação concluída.
//! - **Erro tipado**: bloqueio, permissão, destino removido, symlink,
//!   diretório-pai ausente e E/S genérica.
//! - **Criação exclusiva** (`Salvar cópia`): [`create_new`] grava somente em nome
//!   livre. Um destino ocupado nunca é tocado — nem para descobrir o que havia
//!   nele.
//!
//! ## Políticas documentadas
//!
//! - **Symlink como destino é recusado** (`SymlinkTarget`). Seguir o link e
//!   substituir o alvo esconderia do chamador onde o conteúdo foi parar. Quem
//!   resolve links é a camada de comandos, com `canonicalize`, exatamente como
//!   já fazia antes da migração.
//! - **Destino removido durante a operação não é erro**: o primitivo garante que
//!   os bytes pedidos estão no disco, então o arquivo é recriado. Detectar a
//!   remoção e pedir decisão ao usuário pertence ao contrato de sessão
//!   (ML-H03/ML-H05), não a este primitivo.
//! - **Bloqueio nunca vira sucesso**: no Windows a tentativa de troca de um
//!   arquivo aberto por outro processo sem compartilhamento falha com
//!   `ERROR_SHARING_VIOLATION`/`ERROR_LOCK_VIOLATION` e o original permanece
//!   intacto.

use std::fs::{self, File, OpenOptions, Permissions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Quantas vezes o nome do temporário é regerado quando o nome já está ocupado.
const TEMP_NAME_ATTEMPTS: usize = 8;

/// Quantos caracteres do nome original entram no nome do temporário, para não
/// esbarrar no limite de tamanho de nome de arquivo.
const TEMP_STEM_LIMIT: usize = 48;

/// Contador intra-processo do nome do temporário. Dois `safe_write` simultâneos
/// recebem nomes diferentes mesmo no mesmo nanossegundo.
static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

/// Classificação do erro de escrita. A camada de comandos ainda devolve `String`
/// (assinaturas preservadas), mas quem chamar o primitivo direto consegue
/// distinguir bloqueio de permissão de remoção sem interpretar mensagem.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SafeWriteFailureKind {
    /// Destino aberto por outro processo sem compartilhamento (Windows).
    Locked,
    /// Sem permissão de escrita no destino ou no diretório.
    PermissionDenied,
    /// O destino ou o diretório-pai deixou de existir durante a operação.
    TargetRemoved,
    /// O destino é um link simbólico; o primitivo não escreve através dele.
    SymlinkTarget,
    /// O destino já existe e a operação era de criação exclusiva.
    AlreadyExists,
    /// O diretório-pai não existe (ou não é diretório).
    MissingParent,
    /// Qualquer outra falha de E/S, incluindo disco cheio e volume removido.
    Io,
}

/// Erro de escrita segura: tipo + caminho + causa original do sistema.
#[derive(Debug)]
pub struct SafeWriteError {
    kind: SafeWriteFailureKind,
    path: PathBuf,
    source: Option<io::Error>,
}

impl SafeWriteError {
    fn new(kind: SafeWriteFailureKind, path: &Path, source: Option<io::Error>) -> Self {
        Self {
            kind,
            path: path.to_path_buf(),
            source,
        }
    }

    /// Tipo do erro, para decisão sem interpretar texto.
    pub fn kind(&self) -> SafeWriteFailureKind {
        self.kind
    }

    /// Destino da escrita que falhou.
    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl std::fmt::Display for SafeWriteError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let path = self.path.display();
        match self.kind {
            SafeWriteFailureKind::Locked => {
                write!(
                    formatter,
                    "destination is locked by another process: {path}"
                )?;
            }
            SafeWriteFailureKind::PermissionDenied => {
                write!(formatter, "permission denied: {path}")?;
            }
            SafeWriteFailureKind::TargetRemoved => {
                write!(formatter, "destination was removed while writing: {path}")?;
            }
            SafeWriteFailureKind::SymlinkTarget => {
                write!(formatter, "refusing to replace a symlink: {path}")?;
            }
            SafeWriteFailureKind::AlreadyExists => {
                write!(formatter, "destination already exists: {path}")?;
            }
            SafeWriteFailureKind::MissingParent => {
                write!(formatter, "parent directory does not exist: {path}")?;
            }
            SafeWriteFailureKind::Io => write!(formatter, "failed to write: {path}")?,
        }

        if let Some(source) = &self.source {
            write!(formatter, " ({source})")?;
        }

        Ok(())
    }
}

impl std::error::Error for SafeWriteError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.source
            .as_ref()
            .map(|source| source as &(dyn std::error::Error + 'static))
    }
}

/// O que a escrita produziu, para quem precisa saber se o arquivo já existia.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SafeWriteOutcome {
    /// Destino que recebeu o conteúdo.
    pub path: PathBuf,
    /// `true` quando já havia um arquivo no destino no início da operação.
    pub replaced: bool,
    /// Bytes confirmados no disco pelo `sync_all`.
    pub bytes: u64,
}

/// Escreve `content` em `path` sem nunca deixar o destino em estado parcial.
pub fn safe_write(
    path: impl AsRef<Path>,
    content: &str,
) -> Result<SafeWriteOutcome, SafeWriteError> {
    let bytes = content.as_bytes();
    safe_write_with(path, |file| file.write_all(bytes))
}

/// Variante com escrita por closure, usada para fluxos grandes e para injetar
/// falha no meio da gravação em teste. O temporário e a troca são os mesmos de
/// [`safe_write`]; se a closure falhar, o destino original fica intacto.
pub fn safe_write_with<F>(
    path: impl AsRef<Path>,
    write: F,
) -> Result<SafeWriteOutcome, SafeWriteError>
where
    F: FnOnce(&mut File) -> io::Result<()>,
{
    let destination = path.as_ref();
    let parent = ensure_parent(destination)?;
    let state = inspect_destination(destination)?;

    // A guarda é devolvida junto do `File` de propósito: nas saídas de escopo a
    // guarda é declarada antes, então o `File` fecha primeiro e só depois o
    // temporário é removido. No Windows, remover um arquivo aberto falha.
    let (mut temporary, mut file) = create_unique_temp(|| unique_temp_path(&parent, destination))
        .map_err(|error| classify(destination, error))?;

    if let Err(error) = write(&mut file) {
        drop(file);
        return Err(classify(destination, error));
    }

    if let Err(error) = file.flush().and_then(|()| file.sync_all()) {
        drop(file);
        return Err(classify(destination, error));
    }

    let bytes = file.metadata().map(|metadata| metadata.len()).unwrap_or(0);
    drop(file);

    if let Err(error) = preserve_permissions(temporary.path(), state.permissions.as_ref()) {
        return Err(classify(destination, error));
    }

    if let Err(error) = platform::replace_destination(temporary.path(), destination, state.existed)
    {
        return Err(classify(destination, error));
    }

    temporary.commit();

    Ok(SafeWriteOutcome {
        path: destination.to_path_buf(),
        replaced: state.existed,
        bytes,
    })
}

/// Cria o destino **somente se ele ainda não existir** (`Salvar cópia`).
///
/// **Por que não reutiliza [`safe_write`]:** `safe_write` troca o destino, e
/// trocar é exatamente o que uma cópia não pode fazer — o arquivo escolhido pode
/// ser trabalho de outra pessoa. Aqui o `create_new` no destino final é a
/// garantia: ou o nome estava livre e os bytes são nossos, ou nada é tocado.
///
/// **Durabilidade igual à do `safe_write`:** bytes → `flush` → `sync_all`. Não
/// há temporário porque não há troca; se a gravação falhar no meio, o arquivo
/// parcial é removido — ele não existia antes, então deixá-lo seria inventar um
/// destino com metade do conteúdo.
pub fn create_new(
    path: impl AsRef<Path>,
    content: &str,
) -> Result<SafeWriteOutcome, SafeWriteError> {
    let bytes = content.as_bytes();
    create_new_with(path, |file| file.write_all(bytes))
}

/// Variante com escrita por closure, para fluxos grandes e para injetar falha no
/// meio da criação em teste.
pub fn create_new_with<F>(
    path: impl AsRef<Path>,
    write: F,
) -> Result<SafeWriteOutcome, SafeWriteError>
where
    F: FnOnce(&mut File) -> io::Result<()>,
{
    let destination = path.as_ref();
    let _parent = ensure_parent(destination)?;

    let mut file = match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)
    {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
            // Inclui o caso de link simbólico: ele já ocupa o nome, e o
            // primitivo não escreve através dele nem o substitui.
            return Err(SafeWriteError::new(
                SafeWriteFailureKind::AlreadyExists,
                destination,
                Some(error),
            ));
        }
        Err(error) => return Err(classify(destination, error)),
    };

    let written = write(&mut file)
        .and_then(|()| file.flush())
        .and_then(|()| file.sync_all());
    let bytes = match &written {
        Ok(()) => file.metadata().map(|metadata| metadata.len()).unwrap_or(0),
        Err(_) => 0,
    };
    drop(file);

    if let Err(error) = written {
        let _ = fs::remove_file(destination);
        return Err(classify(destination, error));
    }

    Ok(SafeWriteOutcome {
        path: destination.to_path_buf(),
        replaced: false,
        bytes,
    })
}

/// Estado do destino antes da escrita: existia? com que permissões?
struct DestinationState {
    existed: bool,
    permissions: Option<Permissions>,
}

/// Diretório que recebe o temporário, validado antes de qualquer criação.
fn ensure_parent(destination: &Path) -> Result<PathBuf, SafeWriteError> {
    let parent = match destination.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => {
            return Err(SafeWriteError::new(
                SafeWriteFailureKind::MissingParent,
                destination,
                None,
            ))
        }
    };

    match fs::metadata(parent) {
        Ok(metadata) if metadata.is_dir() => Ok(parent.to_path_buf()),
        Ok(_) => Err(SafeWriteError::new(
            SafeWriteFailureKind::MissingParent,
            destination,
            None,
        )),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Err(SafeWriteError::new(
            SafeWriteFailureKind::MissingParent,
            destination,
            Some(error),
        )),
        Err(error) => Err(classify(destination, error)),
    }
}

/// Inspeciona o destino sem seguir link simbólico.
fn inspect_destination(destination: &Path) -> Result<DestinationState, SafeWriteError> {
    match fs::symlink_metadata(destination) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                return Err(SafeWriteError::new(
                    SafeWriteFailureKind::SymlinkTarget,
                    destination,
                    None,
                ));
            }

            let permissions = fs::metadata(destination)
                .ok()
                .map(|metadata| metadata.permissions());

            Ok(DestinationState {
                existed: true,
                permissions,
            })
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(DestinationState {
            existed: false,
            permissions: None,
        }),
        Err(error) => Err(classify(destination, error)),
    }
}

/// Nome do temporário: único no processo, no espaço e no volume do destino.
fn unique_temp_path(parent: &Path, destination: &Path) -> PathBuf {
    let stem: String = destination
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("document")
        .chars()
        .take(TEMP_STEM_LIMIT)
        .collect();
    let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or(0);

    parent.join(format!(
        ".{stem}.{}.{sequence}.{nanos}.tmp",
        std::process::id()
    ))
}

/// Cria o temporário com `create_new`, regerando o nome quando o candidato já
/// existe (resíduo de execução anterior, por exemplo).
fn create_unique_temp<F>(mut next_name: F) -> io::Result<(TempFile, File)>
where
    F: FnMut() -> PathBuf,
{
    let mut last_collision = None;

    for _ in 0..TEMP_NAME_ATTEMPTS {
        let candidate = next_name();

        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&candidate)
        {
            Ok(file) => return Ok((TempFile::new(candidate), file)),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                last_collision = Some(error);
            }
            Err(error) => return Err(error),
        }
    }

    Err(last_collision.unwrap_or_else(|| {
        io::Error::new(
            io::ErrorKind::AlreadyExists,
            "could not allocate a unique temporary file name",
        )
    }))
}

/// Temporário que se apaga sozinho, a menos que a troca tenha sido confirmada.
#[derive(Debug)]
struct TempFile {
    path: PathBuf,
    committed: bool,
}

impl TempFile {
    fn new(path: PathBuf) -> Self {
        Self {
            path,
            committed: false,
        }
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn commit(&mut self) {
        self.committed = true;
    }
}

impl Drop for TempFile {
    fn drop(&mut self) {
        if !self.committed {
            let _ = fs::remove_file(&self.path);
        }
    }
}

/// Traduz o erro do sistema para o tipo do contrato.
fn classify(destination: &Path, error: io::Error) -> SafeWriteError {
    let kind = if error.raw_os_error().is_some_and(is_lock_violation) {
        SafeWriteFailureKind::Locked
    } else {
        match error.kind() {
            io::ErrorKind::PermissionDenied => SafeWriteFailureKind::PermissionDenied,
            io::ErrorKind::NotFound => SafeWriteFailureKind::TargetRemoved,
            _ => SafeWriteFailureKind::Io,
        }
    };

    SafeWriteError::new(kind, destination, Some(error))
}

#[cfg(windows)]
fn is_lock_violation(code: i32) -> bool {
    // ERROR_SHARING_VIOLATION e ERROR_LOCK_VIOLATION.
    code == 32 || code == 33
}

#[cfg(not(windows))]
fn is_lock_violation(_code: i32) -> bool {
    false
}

#[cfg(unix)]
fn preserve_permissions(temporary: &Path, previous: Option<&Permissions>) -> io::Result<()> {
    match previous {
        // `rename(2)` mantém o inode do temporário; sem esta cópia o documento
        // trocaria de modo pelo padrão de criação (0666 & ~umask) a cada gravação.
        Some(permissions) => fs::set_permissions(temporary, permissions.clone()),
        None => Ok(()),
    }
}

#[cfg(not(unix))]
fn preserve_permissions(_temporary: &Path, _previous: Option<&Permissions>) -> io::Result<()> {
    // No Windows a troca é `ReplaceFileW`, que já preserva ACL, atributos e data
    // de criação do destino. Copiar `readonly` para o temporário produziria um
    // arquivo que nem a troca nem a limpeza conseguiriam tocar.
    Ok(())
}

#[cfg(windows)]
mod platform {
    //! Troca de destino no Windows.
    //!
    //! `ReplaceFileW` é a operação que preserva a identidade do arquivo
    //! substituído (ACL, atributos, data de criação) e grava com
    //! `REPLACEFILE_WRITE_THROUGH`. `MoveFileExW` só entra quando o destino
    //! desapareceu antes da troca ou quando o volume não implementa
    //! `ReplaceFile`. Bloqueio e permissão **não** caem para a queda: ali
    //! `MoveFileExW` falharia igual e só trocaria a mensagem de erro.

    use super::{io, Path};
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::GetLastError;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, ReplaceFileW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
        REPLACEFILE_WRITE_THROUGH,
    };

    /// ERROR_INVALID_FUNCTION, ERROR_FILE_NOT_FOUND, ERROR_PATH_NOT_FOUND,
    /// ERROR_NOT_SAME_DEVICE, ERROR_NOT_SUPPORTED, ERROR_CALL_NOT_IMPLEMENTED.
    const REPLACE_FALLBACK_CODES: [i32; 6] = [1, 2, 3, 17, 50, 120];

    pub(super) fn replace_destination(
        temporary: &Path,
        destination: &Path,
        existed: bool,
    ) -> io::Result<()> {
        if !existed {
            return move_file_ex(temporary, destination);
        }

        let destination_wide = wide(destination);
        let temporary_wide = wide(temporary);
        let replaced = unsafe {
            ReplaceFileW(
                destination_wide.as_ptr(),
                temporary_wide.as_ptr(),
                std::ptr::null(),
                REPLACEFILE_WRITE_THROUGH,
                std::ptr::null(),
                std::ptr::null(),
            )
        };

        if replaced != 0 {
            return Ok(());
        }

        let code = unsafe { GetLastError() } as i32;
        if !REPLACE_FALLBACK_CODES.contains(&code) {
            return Err(io::Error::from_raw_os_error(code));
        }

        move_file_ex(temporary, destination)
    }

    fn move_file_ex(temporary: &Path, destination: &Path) -> io::Result<()> {
        let temporary_wide = wide(temporary);
        let destination_wide = wide(destination);
        let flags = MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH;
        let moved =
            unsafe { MoveFileExW(temporary_wide.as_ptr(), destination_wide.as_ptr(), flags) };

        if moved != 0 {
            Ok(())
        } else {
            Err(io::Error::last_os_error())
        }
    }

    fn wide(path: &Path) -> Vec<u16> {
        path.as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }
}

#[cfg(unix)]
mod platform {
    //! Troca de destino no Unix: `rename(2)` substitui atomicamente, sem remover
    //! o destino antes.

    use super::{fs, io, File, Path};

    pub(super) fn replace_destination(
        temporary: &Path,
        destination: &Path,
        _existed: bool,
    ) -> io::Result<()> {
        fs::rename(temporary, destination)?;
        sync_parent_directory(destination);
        Ok(())
    }

    /// A troca é atômica, mas a entrada de diretório só é durável depois do
    /// `fsync` do diretório. Falha aqui não desfaz uma troca já concluída:
    /// sucesso com durabilidade incerta é melhor do que reportar falha com o
    /// conteúdo novo já no lugar.
    fn sync_parent_directory(destination: &Path) {
        if let Some(parent) = destination.parent() {
            if let Ok(directory) = File::open(parent) {
                let _ = directory.sync_all();
            }
        }
    }
}

#[cfg(not(any(unix, windows)))]
mod platform {
    use super::{fs, io, Path};

    pub(super) fn replace_destination(
        temporary: &Path,
        destination: &Path,
        _existed: bool,
    ) -> io::Result<()> {
        fs::rename(temporary, destination)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        create_new, create_new_with, create_unique_temp, safe_write, safe_write_with,
        SafeWriteFailureKind, SafeWriteOutcome,
    };
    use std::fs;
    use std::io::{self, Write};
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Diretório de teste isolado, removido no fim mesmo quando o teste falha.
    struct TestDir {
        root: PathBuf,
    }

    impl TestDir {
        fn new(name: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("relógio do sistema")
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "mark-lee-h02-{name}-{}-{unique}",
                std::process::id()
            ));
            fs::create_dir_all(&root).expect("criar diretório de teste");
            Self { root }
        }

        fn path(&self) -> &Path {
            &self.root
        }

        fn join(&self, name: &str) -> PathBuf {
            self.root.join(name)
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    fn entries(directory: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(directory)
            .expect("listar diretório de teste")
            .map(|entry| entry.expect("entrada do diretório").file_name())
            .map(|name| name.to_string_lossy().to_string())
            .collect();
        names.sort();
        names
    }

    fn temporaries(directory: &Path) -> Vec<String> {
        entries(directory)
            .into_iter()
            .filter(|name| name.ends_with(".tmp"))
            .collect()
    }

    fn write(caminho: &Path, conteudo: &str) -> SafeWriteOutcome {
        safe_write(caminho, conteudo).expect("escrita segura")
    }

    #[test]
    fn escreve_arquivo_novo_sem_deixar_temporario() {
        let dir = TestDir::new("novo");
        let destino = dir.join("nota.md");

        let resultado = write(&destino, "# título\n");

        assert_eq!(fs::read_to_string(&destino).unwrap(), "# título\n");
        assert!(!resultado.replaced);
        assert_eq!(resultado.bytes, "# título\n".len() as u64);
        assert_eq!(entries(dir.path()), vec!["nota.md".to_string()]);
    }

    #[test]
    fn substitui_destino_existente_sem_remover_antes_da_troca() {
        let dir = TestDir::new("substitui");
        let destino = dir.join("nota.md");
        fs::write(&destino, "versão antiga").unwrap();

        let mut lido_durante = String::new();
        let resultado = safe_write_with(&destino, |file| {
            // Neste ponto o temporário já existe e a troca ainda não aconteceu:
            // o destino precisa continuar com o conteúdo anterior.
            lido_durante = fs::read_to_string(&destino)?;
            file.write_all(b"versao nova")
        })
        .expect("troca do destino");

        assert_eq!(
            lido_durante, "versão antiga",
            "o destino foi removido ou truncado antes da troca"
        );
        assert_eq!(fs::read_to_string(&destino).unwrap(), "versao nova");
        assert!(resultado.replaced);
        assert_eq!(entries(dir.path()), vec!["nota.md".to_string()]);
    }

    #[test]
    fn criacao_exclusiva_nao_sobrescreve_destino_existente() {
        let dir = TestDir::new("exclusiva-ocupado");
        let destino = dir.join("copia.md");
        fs::write(&destino, "trabalho de outra pessoa").unwrap();

        let erro = create_new(&destino, "meu texto").expect_err("destino ocupado");

        assert_eq!(erro.kind(), SafeWriteFailureKind::AlreadyExists);
        assert_eq!(
            fs::read_to_string(&destino).unwrap(),
            "trabalho de outra pessoa"
        );
        assert_eq!(entries(dir.path()), vec!["copia.md".to_string()]);
    }

    #[test]
    fn criacao_exclusiva_grava_em_nome_livre() {
        let dir = TestDir::new("exclusiva-livre");
        let destino = dir.join("copia.md");

        let resultado = create_new(&destino, "meu texto").expect("nome livre");

        assert_eq!(fs::read_to_string(&destino).unwrap(), "meu texto");
        assert!(!resultado.replaced);
        assert_eq!(resultado.bytes, "meu texto".len() as u64);
        assert_eq!(entries(dir.path()), vec!["copia.md".to_string()]);
    }

    #[test]
    fn criacao_exclusiva_com_falha_no_meio_nao_deixa_arquivo_parcial() {
        let dir = TestDir::new("exclusiva-falha");
        let destino = dir.join("copia.md");

        let erro = create_new_with(&destino, |file| {
            file.write_all(b"metade")?;
            Err(io::Error::other("falha injetada no meio da criação"))
        })
        .expect_err("a escrita injetada precisa falhar");

        assert_eq!(erro.kind(), SafeWriteFailureKind::Io);
        assert!(
            !destino.exists(),
            "arquivo parcial ficou no destino de uma criação que falhou"
        );
        assert!(entries(dir.path()).is_empty(), "{:?}", entries(dir.path()));
    }

    #[test]
    fn ultima_revisao_vence_quando_as_escritas_sao_sequenciais() {
        let dir = TestDir::new("sequencial");
        let destino = dir.join("nota.md");

        write(&destino, "primeira");
        write(&destino, "segunda");
        write(&destino, "terceira");

        assert_eq!(fs::read_to_string(&destino).unwrap(), "terceira");
        assert!(
            temporaries(dir.path()).is_empty(),
            "{:?}",
            entries(dir.path())
        );
    }

    #[test]
    fn escritas_concorrentes_nao_colidem_no_temporario() {
        let dir = TestDir::new("concorrente");
        let destino = dir.join("nota.md");
        let payloads: Vec<String> = (0..24)
            .map(|indice| format!("revisao {indice}\n{}", "x".repeat(indice * 64)))
            .collect();

        let barreira = std::sync::Arc::new(std::sync::Barrier::new(payloads.len()));
        let mut handles = Vec::new();

        for payload in payloads.clone() {
            let destino = destino.clone();
            let barreira = barreira.clone();
            handles.push(std::thread::spawn(move || {
                barreira.wait();
                safe_write(&destino, &payload)
            }));
        }

        let mut sucessos = 0usize;
        for handle in handles {
            match handle.join().expect("nenhuma thread pode entrar em panic") {
                Ok(_) => sucessos += 1,
                Err(error) => {
                    // Concorrência no Windows pode recusar a troca. O que não
                    // pode acontecer é sucesso falso, corrupção ou nome
                    // compartilhado de temporário.
                    assert_ne!(error.kind(), SafeWriteFailureKind::SymlinkTarget, "{error}");
                }
            }
        }

        let conteudo_final = fs::read_to_string(&destino).unwrap();
        assert!(
            payloads.contains(&conteudo_final),
            "conteúdo final não é nenhuma das revisões: {conteudo_final:?}"
        );
        assert!(sucessos >= 1, "nenhuma escrita concorrente venceu");
        assert!(
            temporaries(dir.path()).is_empty(),
            "{:?}",
            entries(dir.path())
        );
    }

    #[test]
    fn temporario_colidente_nao_sobrescreve_arquivo_existente() {
        let dir = TestDir::new("colisao");
        let ocupado = dir.join(".nota.md.1.0.0.tmp");
        let livre = dir.join(".nota.md.1.1.0.tmp");
        fs::write(&ocupado, "resíduo de execução anterior").unwrap();

        let mut tentativas = 0;
        let (temporary, _file) = create_unique_temp(|| {
            tentativas += 1;
            if tentativas <= 3 {
                ocupado.clone()
            } else {
                livre.clone()
            }
        })
        .expect("nome livre depois das colisões");

        assert_eq!(temporary.path(), livre.as_path());
        assert_eq!(
            fs::read_to_string(&ocupado).unwrap(),
            "resíduo de execução anterior",
            "o temporário de outra gravação foi sobrescrito"
        );
        assert_eq!(tentativas, 4, "o nome deve ser regerado a cada colisão");
    }

    #[test]
    fn temporario_sempre_colidente_falha_sem_tocar_no_destino() {
        let dir = TestDir::new("colisao-total");
        let destino = dir.join("nota.md");
        let ocupado = dir.join(".nota.md.2.0.0.tmp");
        fs::write(&destino, "original").unwrap();
        fs::write(&ocupado, "resíduo").unwrap();

        let erro = create_unique_temp(|| ocupado.clone()).expect_err("sem nome livre");

        assert_eq!(erro.kind(), io::ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(&destino).unwrap(), "original");
        assert_eq!(
            fs::read_to_string(&ocupado).unwrap(),
            "resíduo",
            "o resíduo precisa ficar como estava"
        );
    }

    #[test]
    fn falha_no_meio_da_escrita_preserva_original_e_remove_temporario() {
        let dir = TestDir::new("recuperacao");
        let destino = dir.join("nota.md");
        fs::write(&destino, "conteúdo íntegro").unwrap();

        let erro = safe_write_with(&destino, |file| {
            file.write_all(b"metade")?;
            Err(io::Error::other("falha injetada no meio da escrita"))
        })
        .expect_err("a escrita injetada precisa falhar");

        assert_eq!(erro.kind(), SafeWriteFailureKind::Io);
        assert_eq!(fs::read_to_string(&destino).unwrap(), "conteúdo íntegro");
        assert_eq!(
            entries(dir.path()),
            vec!["nota.md".to_string()],
            "o temporário da escrita que falhou sobrou no diretório"
        );
    }

    #[test]
    fn destino_removido_durante_a_escrita_eh_recriado_com_o_conteudo_novo() {
        let dir = TestDir::new("removido");
        let destino = dir.join("nota.md");
        fs::write(&destino, "antes").unwrap();

        let resultado = safe_write_with(&destino, |file| {
            // Outro programa apaga o documento com a escrita já em andamento.
            fs::remove_file(&destino)?;
            file.write_all(b"depois")
        })
        .expect("a escrita precisa concluir");

        assert_eq!(fs::read_to_string(&destino).unwrap(), "depois");
        assert!(resultado.replaced, "havia arquivo no destino no início");
        assert!(
            temporaries(dir.path()).is_empty(),
            "{:?}",
            entries(dir.path())
        );
    }

    #[test]
    fn diretorio_pai_ausente_falha_tipado() {
        let dir = TestDir::new("sem-pai");
        let destino = dir.join("nao-existe").join("nota.md");

        let erro = safe_write(&destino, "x").expect_err("diretório-pai ausente");

        assert_eq!(erro.kind(), SafeWriteFailureKind::MissingParent);
        assert_eq!(erro.path(), destino.as_path());
        assert!(erro.to_string().contains("parent directory"), "{erro}");
    }

    #[test]
    fn destino_simbolico_eh_recusado_sem_tocar_no_alvo() {
        let dir = TestDir::new("symlink");
        let alvo = dir.join("real.md");
        let link = dir.join("link.md");
        fs::write(&alvo, "original").unwrap();

        if !create_file_symlink(&alvo, &link) {
            eprintln!("plataforma sem permissão para criar symlink; teste não aplicável");
            return;
        }

        let erro = safe_write(&link, "invasor").expect_err("symlink como destino");

        assert_eq!(erro.kind(), SafeWriteFailureKind::SymlinkTarget);
        assert_eq!(fs::read_to_string(&alvo).unwrap(), "original");
    }

    #[cfg(unix)]
    fn create_file_symlink(alvo: &Path, link: &Path) -> bool {
        std::os::unix::fs::symlink(alvo, link).is_ok()
    }

    #[cfg(windows)]
    fn create_file_symlink(alvo: &Path, link: &Path) -> bool {
        std::os::windows::fs::symlink_file(alvo, link).is_ok()
    }

    #[cfg(not(any(unix, windows)))]
    fn create_file_symlink(_alvo: &Path, _link: &Path) -> bool {
        false
    }

    #[cfg(unix)]
    #[test]
    fn preserva_permissao_do_arquivo_existente() {
        use std::os::unix::fs::PermissionsExt;

        let dir = TestDir::new("permite");
        let destino = dir.join("nota.md");
        fs::write(&destino, "antes").unwrap();
        fs::set_permissions(&destino, fs::Permissions::from_mode(0o640)).unwrap();

        write(&destino, "depois");

        let modo = fs::metadata(&destino).unwrap().permissions().mode() & 0o777;
        assert_eq!(modo, 0o640, "o rename trocou o modo do documento");
    }

    #[cfg(unix)]
    #[test]
    fn diretorio_sem_permissao_de_escrita_falha_com_permissao() {
        use std::os::unix::fs::PermissionsExt;

        let dir = TestDir::new("sem-permissao");
        let trancado = dir.join("trancado");
        let destino = trancado.join("nota.md");
        fs::create_dir(&trancado).unwrap();
        fs::write(&destino, "antes").unwrap();
        fs::set_permissions(&trancado, fs::Permissions::from_mode(0o500)).unwrap();

        let erro = safe_write(&destino, "depois").expect_err("diretório sem escrita");

        fs::set_permissions(&trancado, fs::Permissions::from_mode(0o700)).unwrap();
        assert_eq!(erro.kind(), SafeWriteFailureKind::PermissionDenied);
        assert_eq!(fs::read_to_string(&destino).unwrap(), "antes");
    }

    #[cfg(windows)]
    #[test]
    fn destino_somente_leitura_falha_com_permissao() {
        let dir = TestDir::new("somente-leitura");
        let destino = dir.join("nota.md");
        fs::write(&destino, "antes").unwrap();
        let mut permissoes = fs::metadata(&destino).unwrap().permissions();
        permissoes.set_readonly(true);
        fs::set_permissions(&destino, permissoes).unwrap();

        let erro = safe_write(&destino, "depois").expect_err("destino somente leitura");

        let mut permissoes = fs::metadata(&destino).unwrap().permissions();
        permissoes.set_readonly(false);
        let _ = fs::set_permissions(&destino, permissoes);

        assert_eq!(
            erro.kind(),
            SafeWriteFailureKind::PermissionDenied,
            "{erro}"
        );
        assert_eq!(fs::read_to_string(&destino).unwrap(), "antes");
        assert!(
            temporaries(dir.path()).is_empty(),
            "{:?}",
            entries(dir.path())
        );
    }

    #[cfg(windows)]
    #[test]
    fn arquivo_bloqueado_por_outro_processo_falha_tipado() {
        let dir = TestDir::new("bloqueado");
        let destino = dir.join("nota.md");
        fs::write(&destino, "antes").unwrap();

        let bloqueio = ExclusiveLock::acquire(&destino).expect("travar o documento");
        let erro = safe_write(&destino, "depois").expect_err("arquivo bloqueado");
        drop(bloqueio);

        assert_eq!(erro.kind(), SafeWriteFailureKind::Locked, "{erro}");
        assert_eq!(fs::read_to_string(&destino).unwrap(), "antes");
        assert!(
            temporaries(dir.path()).is_empty(),
            "{:?}",
            entries(dir.path())
        );
    }

    /// Trava exclusiva de arquivo, como um editor que mantém o documento aberto
    /// sem compartilhar escrita. Só existe para o teste de bloqueio.
    #[cfg(windows)]
    struct ExclusiveLock {
        handle: *mut std::ffi::c_void,
    }

    #[cfg(windows)]
    impl ExclusiveLock {
        fn acquire(path: &Path) -> io::Result<Self> {
            use std::os::windows::ffi::OsStrExt;
            use windows_sys::Win32::Foundation::{GENERIC_READ, INVALID_HANDLE_VALUE};
            use windows_sys::Win32::Storage::FileSystem::{
                CreateFileW, FILE_ATTRIBUTE_NORMAL, OPEN_EXISTING,
            };

            let wide: Vec<u16> = path
                .as_os_str()
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let handle = unsafe {
                CreateFileW(
                    wide.as_ptr(),
                    GENERIC_READ,
                    0,
                    std::ptr::null(),
                    OPEN_EXISTING,
                    FILE_ATTRIBUTE_NORMAL,
                    std::ptr::null_mut(),
                )
            };

            if handle == INVALID_HANDLE_VALUE {
                Err(io::Error::last_os_error())
            } else {
                Ok(Self { handle })
            }
        }
    }

    #[cfg(windows)]
    impl Drop for ExclusiveLock {
        fn drop(&mut self) {
            unsafe {
                windows_sys::Win32::Foundation::CloseHandle(self.handle);
            }
        }
    }
}
