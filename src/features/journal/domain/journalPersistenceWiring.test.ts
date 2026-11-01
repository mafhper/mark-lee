import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";

/* Seam: a **fiação de persistência das Memórias**. O contrato comum
 * (H05) pede três coisas — o primitivo seguro do ML-H02, uma escrita por
 * caminho e um ponto único de saída. O editor já tinha as três; as Memórias
 * tinham o primitivo e nenhuma das outras duas.
 *
 * Aqui não se testa o comportamento da gravação (ela fala com o Tauri e não roda
 * fora do desktop): testa-se que o **caminho** é o contratado. É o mesmo recurso
 * de `conflictWiring.test.ts` e `lifecycleWiring.test.ts`, e a cadeia inteira é
 * percorrida de ponta a ponta — do `saveEntry` até o `safe_write` do Rust — para
 * que nenhum elo possa ser trocado em silêncio.
 */

function semComentarios(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Corpo de uma declaração `export async function nome(` até a chave de fim. */
function funcao(fonte: string, assinatura: string): string | null {
  const inicio = fonte.indexOf(assinatura);
  if (inicio === -1) return null;
  const fim = fonte.indexOf("\n}", inicio);
  return fim === -1 ? null : fonte.slice(inicio, fim);
}

const ENTRY = "src/features/journal/domain/entry-service.ts";
const MANIFEST = "src/features/journal/domain/manifest-service.ts";
const LIBRARY = "src/features/journal/domain/library-service.ts";
const BRIDGE = "src/services/filesystem.ts";
const SERIAL = "src/services/serialWrites.ts";
const RUST_LIB = readFileSync("src-tauri/src/lib.rs", "utf8");
const RUST_FS = semComentarios("src-tauri/src/commands/filesystem.rs");

test("a entrada do diário grava pelo primitivo seguro, do frontend ao Rust", () => {
  const entry = semComentarios(ENTRY);
  const bridge = semComentarios(BRIDGE);

  assert.match(
    entry,
    /import \{[^}]*atomicWriteText[^}]*\} from "\.\.\/\.\.\/\.\.\/services\/filesystem"/,
    "a entrada do diário não usa `atomicWriteText` para gravar",
  );
  assert.ok(
    !/\bwriteFile\(/.test(entry),
    "a entrada voltou a usar `writeFile` em vez do primitivo atômico do contrato",
  );

  // Elo 1: a ponte chama o comando atômico.
  assert.match(
    bridge,
    /invoke(?:<[^>]*>)?\("atomic_write_text"/,
    "`atomicWriteText` deixou de chegar ao backend",
  );
  // Elo 2: o comando atômico é o primitivo seguro do ML-H02.
  const comando = RUST_FS.slice(RUST_FS.indexOf("pub fn atomic_write_text"));
  assert.match(
    comando.slice(0, 400),
    /safe_write\(/,
    "`atomic_write_text` deixou de usar o `safe_write` do ML-H02",
  );
  // Elo 3: o comando está registrado — um comando não registrado é um 404 em
  // tempo de execução que nenhum tipo pega.
  assert.ok(
    RUST_LIB.includes("commands::filesystem::atomic_write_text"),
    "`atomic_write_text` não está registrado no invoke_handler",
  );
});

test("a gravação de entrada é uma seção crítica por caminho", () => {
  const entry = semComentarios(ENTRY);
  const save = funcao(entry, "export async function saveEntry(");
  assert.ok(save, "`saveEntry` não existe mais em `entry-service`");

  assert.match(
    save,
    /writes\.run\(path,/,
    "`saveEntry` voltou a ser um check-then-write solto entre superfícies",
  );
  // A checagem de mtime continua sendo o gatilho de conflito (P0.5 compara a
  // versão-base antes de sobrescrever); o que mudou é ela estar dentro da fila.
  assert.match(save, /captureMtime\(path\)/, "a checagem de mtime foi removida");
  assert.match(save, /ConflictError/, "o conflito externo deixou de ser recusado");
  assert.match(
    entry,
    /import \{ createSerialWrites \} from "\.\.\/\.\.\/\.\.\/services\/serialWrites"/,
    "a fila serial por caminho não é a do contrato comum",
  );
});

test("criar e duplicar não entram na fila — cada um grava um caminho novo", () => {
  // Justificativa registrada: as duas escolhem um caminho com `randomUUID`, então
  // não existe segundo escritor para a fila serializar. Se alguém trocar isso por
  // um caminho derivado do título, o teste cai e a decisão volta a ser pensada.
  const entry = semComentarios(ENTRY);
  for (const nome of ["createEntry", "duplicateEntry"]) {
    const corpo = funcao(entry, `export async function ${nome}(`);
    assert.ok(corpo, `${nome} não existe mais em entry-service`);
    assert.ok(!/writes\.run\(/.test(corpo), `${nome} entrou na fila sem precisar`);
    assert.match(corpo, /crypto\.randomUUID\(\)/, `${nome} deixou de gerar um caminho exclusivo`);
  }
});

test("todo write do manifesto passa pela mesma fila do caminho", () => {
  const manifest = semComentarios(MANIFEST);

  assert.ok(!/\bwriteFile\(/.test(manifest), "o manifesto voltou a usar `writeFile`");

  // Cada `atomicWriteText` do manifesto é um read-modify-write do mesmo arquivo:
  // dois setters concorrentes leem o mesmo JSON, cada um aplica a sua chave e o
  // último a gravar apaga a do outro. O invariante é um write por trava.
  const escritas = manifest.match(/atomicWriteText\(/g) ?? [];
  const travas = manifest.match(/withManifestWrite\(/g) ?? [];
  assert.ok(escritas.length > 0, "o manifesto não grava mais nada");
  assert.equal(
    travas.length,
    escritas.length,
    `${escritas.length} escritas para ${travas.length} travas — alguma ficou fora da fila`,
  );

  for (const setter of ["setBlogView", "setPinsConfig", "setEntryFieldDefinitions", "setTemplatePreferences"]) {
    const corpo = funcao(manifest, `export async function ${setter}(`);
    assert.ok(corpo, `${setter} não existe mais`);
    assert.match(corpo, /withManifestWrite\(rootPath/, `${setter} grava o manifesto fora da fila`);
  }
});

test("a biblioteca de cadernos grava e faz read-modify-write na fila", () => {
  const library = semComentarios(LIBRARY);

  assert.ok(!/\bwriteFile\(/.test(library), "a biblioteca voltou a usar `writeFile`");

  const save = funcao(library, "export async function saveLibrary(");
  assert.ok(save, "`saveLibrary` não existe mais");
  assert.match(
    save,
    /libraryWrites\.run\(/,
    "backup e principal voltaram a ser duas gravações soltas",
  );

  // `addJournal`/`removeJournal`/`setActiveJournal` fazem load → muta → save; sem
  // a trava, dois cliques em cadernos diferentes perdem um deles.
  for (const nome of ["addJournal", "removeJournal", "setActiveJournal"]) {
    const corpo = funcao(library, `export async function ${nome}(`);
    assert.ok(corpo, `${nome} não existe mais`);
    assert.match(corpo, /libraryWrites\.run\(/, `${nome} muta a biblioteca fora da fila`);
  }

  // O backup também sai pelo primitivo seguro: ele é o que recupera a biblioteca
  // quando o principal corrompe, e protegê-la com um arquivo que pode ser
  // truncado no meio da própria gravação é proteger nada.
  assert.match(
    library,
    /writeLibraryFile\(LIBRARY_BACKUP, prev\)/,
    "o backup da biblioteca voltou a ser gravado fora do primitivo seguro",
  );
  assert.match(
    library,
    /async function writeLibraryFile\(fileName: string, content: string\)[\s\S]{0,400}?atomicWriteText/,
    "a gravação da biblioteca deixou de usar o primitivo atômico",
  );
});

test("o painel só declara limpo quando a revisão gravada é a de agora", () => {
  // A regra do P0.4, aplicada ao diário: a gravação assíncrona não pode marcar
  // limpo se uma edição chegou durante o I/O. O painel é a superfície que decide
  // isso (o debounce é dele), então é na fonte dele que a regra se verifica.
  const painel = semComentarios("src/features/journal/components/JournalEntryPanel.tsx");
  assert.match(
    painel,
    /snap\.revision === draftRevisionRef\.current\) setSaveState\("clean"\)/,
    "o diário voltou a marcar limpo sem comparar a revisão gravada com a de agora",
  );
  assert.match(
    painel,
    /revision: \+\+draftRevisionRef\.current/,
    "a revisão do rascunho deixou de ser monotônica",
  );
});

test("nenhum escritor de texto das Memórias usa o primitivo direto", () => {
  // Varredura do domínio inteiro. A regra da casa é sair por `atomicWriteText`:
  // desde o ML-H02 o `write_file` do backend também chama `safe_write`, mas o
  // nome dele é histórico e o atômico é o único que declara a intenção — quem lê
  // o domínio não precisa saber qual dos dois comandos faz o quê hoje.
  //
  // `export-service.ts` fica de fora de propósito e nomeado: o destino dele é o
  // que o usuário escolheu no diálogo, e ali o contrato é outro (gravação
  // derivada, sem baseline de sessão). Nomear a exceção é o que impede um
  // escritor novo de entrar nela sem ninguém notar.
  const derivados = new Set(["export-service.ts"]);
  const arquivos = readdirSync("src/features/journal/domain")
    .filter((nome) => nome.endsWith(".ts") && !nome.endsWith(".test.ts"));

  const infratores = arquivos.filter((nome) => {
    if (derivados.has(nome)) return false;
    return /\bwriteFile\(/.test(semComentarios(`src/features/journal/domain/${nome}`));
  });

  assert.deepEqual(infratores, [], "escritor de texto das Memórias no caminho direto");
  assert.match(
    semComentarios("src/features/journal/domain/template-service.ts"),
    /atomicWriteText\(templatePath\(journalRoot, name\), body\)/,
    "o template voltou a ser gravado fora do primitivo seguro",
  );
});

test("a fila usada pelas Memórias é a do contrato comum", () => {
  const serial = semComentarios(SERIAL);
  const bridge = semComentarios(BRIDGE);

  assert.match(serial, /export function createSerialWrites\(\): SerialWrites/);

  // Do primitivo da ponte, as Memórias importam o atômico — não o `writeFile`
  // direto. É esta lista de import que decide por onde o texto sai daqui.
  for (const arquivo of [ENTRY, MANIFEST, LIBRARY]) {
    const fonte = semComentarios(arquivo);
    const importacao = fonte.slice(0, fonte.indexOf("\n\n"));
    assert.match(
      importacao,
      /from "\.\.\/\.\.\/\.\.\/services\/serialWrites"/,
      `${arquivo} não importa a fila do contrato comum`,
    );
    assert.ok(
      !/\bwriteFile\b/.test(importacao),
      `${arquivo} importa o \`writeFile\`, que substitui o destino sem passar pelo seguro`,
    );
  }

  // E a garantia de atomicidade vem da ponte, não de uma rotina local.
  assert.match(
    semComentarios(ENTRY),
    /atomicWriteText/,
    "a entrada não usa o primitivo seguro da ponte",
  );
  assert.match(bridge, /export async function atomicWriteText\(/);
});
