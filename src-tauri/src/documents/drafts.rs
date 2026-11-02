//! Rascunhos duráveis de documentos abertos (`ML-H05`, recuperação após crash).
//!
//! **Por que existe:** a única cópia de uma aba sem caminho e de uma edição não
//! salva morava no `localStorage` do webview. Isso é cache, não garantia: o
//! armazenamento do webview pode ser limpo (ou despejado sob pressão de disco), e
//! o texto some sem nenhum erro. O ML-H05 pede o rascunho no **armazenamento
//! durável do aplicativo**, com o mesmo primitivo seguro de gravação do
//! documento (`safe_write`): um arquivo por documento, escrito por troca
//! atômica, dentro de `<app-data>/recovery/drafts/<document-id>.json`.
//!
//! **O que este módulo faz e o que não faz:** ele grava, lê e remove bytes. O
//! formato do rascunho (nome, caminho, conteúdo, hash de disco) pertence ao
//! front-end, que é quem sabe o que é uma aba; aqui o conteúdo é opaco de
//! propósito, para o backend não precisar de esquema novo a cada campo de
//! interface.
//!
//! **Identificador:** o nome do arquivo é o `documentId` **validado**, não
//! sanitizado. Dois ids diferentes nunca podem cair no mesmo arquivo, e um id
//! hostil como `../../x` não pode escapar da pasta. Quem não passa na validação
//! é recusado — e um rascunho com id inválido continua no disco, apenas não é
//! listado: apagar dado que não se entende é a pior forma de "limpar".

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use super::persistence::safe_write;

/// Subdiretórios, a partir do diretório de dados do aplicativo.
pub const DRAFT_DIRECTORY: [&str; 2] = ["recovery", "drafts"];

/// Maior identificador aceito como nome de arquivo (UUID tem 36).
const MAX_IDENTIFIER_LENGTH: usize = 128;

/// Raiz dos rascunhos para um diretório de dados.
pub fn root(app_data_dir: &Path) -> PathBuf {
    let mut path = app_data_dir.to_path_buf();
    for segment in DRAFT_DIRECTORY {
        path.push(segment);
    }
    path
}

/// Nome de arquivo de um documento, ou `None` quando o identificador não é
/// aceitável. Aceita só ASCII alfanumérico, `-`, `_` e `.`; recusa vazio, `.` e
/// `..`.
pub fn file_name(document_id: &str) -> Option<String> {
    if document_id.is_empty() || document_id.len() > MAX_IDENTIFIER_LENGTH {
        return None;
    }
    let acceptable = document_id
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'));
    if !acceptable || document_id == "." || document_id == ".." {
        return None;
    }
    Some(format!("{document_id}.json"))
}

/// Rascunho lido do disco. `payload` é opaco para o backend.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct StoredDraft {
    pub document_id: String,
    pub payload: String,
}

/// Grava (ou substitui) o rascunho de `document_id`.
///
/// A troca é a do `safe_write`: o rascunho anterior continua íntegro até o novo
/// estar no disco, e um crash no meio não deixa JSON pela metade.
pub fn write(root: &Path, document_id: &str, payload: &str) -> Result<PathBuf, String> {
    let file =
        file_name(document_id).ok_or_else(|| format!("invalid draft identifier: {document_id}"))?;
    fs::create_dir_all(root).map_err(|error| error.to_string())?;
    let path = root.join(file);
    safe_write(&path, payload).map_err(|error| error.to_string())?;
    Ok(path)
}

/// Todos os rascunhos legíveis da pasta.
///
/// Arquivos de outra extensão, nomes fora do contrato e arquivos ilegíveis ficam
/// de fora — e **não** são apagados. A lista é determinística (ordenada por id),
/// para o teste e a recuperação não dependerem da ordem do sistema de arquivos.
pub fn read_all(root: &Path) -> Vec<StoredDraft> {
    let Ok(entries) = fs::read_dir(root) else {
        // Pasta ausente = nenhum rascunho. Criá-la aqui só para falhar na
        // escrita seria pior: a leitura não muda o disco.
        return Vec::new();
    };

    let mut drafts: Vec<StoredDraft> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
                return None;
            }
            let document_id = path.file_stem().and_then(|stem| stem.to_str())?;
            if file_name(document_id).is_none() {
                return None;
            }
            let payload = fs::read_to_string(&path).ok()?;
            Some(StoredDraft {
                document_id: document_id.to_string(),
                payload,
            })
        })
        .collect();

    drafts.sort_by(|a, b| a.document_id.cmp(&b.document_id));
    drafts
}

/// Remove o rascunho de `document_id`.
///
/// Rascunho já ausente **não** é erro: quem remove está fechando um documento e
/// uma segunda tentativa (ou uma remoção depois de o arquivo nunca ter sido
/// escrito) não pode virar falha na interface.
pub fn remove(root: &Path, document_id: &str) -> Result<(), String> {
    let file =
        file_name(document_id).ok_or_else(|| format!("invalid draft identifier: {document_id}"))?;
    match fs::remove_file(root.join(file)) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::{file_name, read_all, remove, root, write, StoredDraft};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestDir {
        root: PathBuf,
    }

    impl TestDir {
        fn new(name: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("relógio do sistema")
                .as_nanos();
            let base = std::env::temp_dir().join(format!(
                "mark-lee-h05b-{name}-{}-{unique}",
                std::process::id()
            ));
            fs::create_dir_all(&base).expect("criar diretório de teste");
            let root = root(&base);
            Self { root }
        }

        fn drafts(&self) -> &std::path::Path {
            &self.root
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            if let Some(base) = self.root.parent().and_then(|drafts| drafts.parent()) {
                let _ = fs::remove_dir_all(base);
            }
        }
    }

    fn entries(directory: &std::path::Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(directory)
            .map(|entries| {
                entries
                    .filter_map(Result::ok)
                    .map(|entry| entry.file_name().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();
        names.sort();
        names
    }

    #[test]
    fn grava_le_e_remove_rascunho() {
        let dir = TestDir::new("ciclo");

        write(dir.drafts(), "aba-1", r#"{"content":"oi"}"#).expect("gravar rascunho");
        assert_eq!(
            fs::read_to_string(dir.drafts().join("aba-1.json")).unwrap(),
            r#"{"content":"oi"}"#
        );

        let drafts = read_all(dir.drafts());
        assert_eq!(
            drafts,
            vec![StoredDraft {
                document_id: "aba-1".to_string(),
                payload: r#"{"content":"oi"}"#.to_string(),
            }]
        );

        remove(dir.drafts(), "aba-1").expect("remover rascunho");
        assert!(read_all(dir.drafts()).is_empty());
        assert!(
            entries(dir.drafts()).is_empty(),
            "{:?}",
            entries(dir.drafts())
        );
    }

    #[test]
    fn rascunho_substituido_nao_deixa_temporario() {
        let dir = TestDir::new("substitui");

        write(dir.drafts(), "aba-1", "primeira").expect("primeira gravação");
        write(dir.drafts(), "aba-1", "segunda").expect("segunda gravação");

        assert_eq!(read_all(dir.drafts())[0].payload, "segunda");
        assert_eq!(
            entries(dir.drafts()),
            vec!["aba-1.json".to_string()],
            "o temporário da troca sobrou na pasta de rascunhos"
        );
    }

    #[test]
    fn identificador_hostil_eh_recusado() {
        for hostil in [
            "",
            ".",
            "..",
            "../escape",
            "a/b",
            "a\\b",
            "a b",
            "acentuação",
        ] {
            assert_eq!(
                file_name(hostil),
                None,
                "identificador {hostil:?} foi aceito como nome de arquivo"
            );
        }
        assert_eq!(file_name("aba-1").as_deref(), Some("aba-1.json"));
        assert_eq!(
            file_name("1b4e28ba-2fa1-11d2-883f-0016d3cca427").as_deref(),
            Some("1b4e28ba-2fa1-11d2-883f-0016d3cca427.json")
        );
    }

    #[test]
    fn listagem_ignora_arquivo_estranho_sem_apaga_lo() {
        let dir = TestDir::new("estranho");
        write(dir.drafts(), "aba-1", "válido").expect("gravar rascunho");
        fs::write(dir.drafts().join("nota.txt"), "não é rascunho").unwrap();
        fs::write(dir.drafts().join("nome inválido.json"), "outro").unwrap();

        let drafts = read_all(dir.drafts());

        assert_eq!(drafts.len(), 1, "{drafts:?}");
        assert_eq!(drafts[0].document_id, "aba-1");
        assert!(
            dir.drafts().join("nota.txt").exists(),
            "a leitura apagou um arquivo que não entende"
        );
        assert!(
            dir.drafts().join("nome inválido.json").exists(),
            "a leitura apagou um rascunho de nome fora do contrato"
        );
    }

    #[test]
    fn remover_rascunho_ausente_nao_eh_erro() {
        let dir = TestDir::new("ausente");

        remove(dir.drafts(), "aba-inexistente").expect("remover o que não existe não é falha");
    }

    #[test]
    fn gravar_cria_a_pasta_de_rascunhos() {
        let dir = TestDir::new("cria-pasta");
        assert!(!dir.drafts().exists());

        write(dir.drafts(), "aba-1", "oi").expect("gravar criando a pasta");

        assert!(dir.drafts().is_dir());
        assert_eq!(read_all(dir.drafts()).len(), 1);
    }
}
