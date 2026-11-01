import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/* A regra do coordenador está provada em `lifecycleCoordinator.test.ts`, de
 * fora, com pergunta/gravação/flush injetados. O que falta provar é a **fiação**:
 * o app poderia continuar saindo por fora dele — `window.confirm` em "Arquivo →
 * Novo", apagar arquivo com aba suja, fechar a janela sem olhar as abas — e aí a
 * regra certa não protegeria ninguém.
 *
 * `App` só monta dentro do Tauri (editor, sidebar, watcher), então o teste é de
 * fonte — o mesmo recurso que `closeWiring.test.ts` usa para as invariantes que
 * não dá para renderizar.
 */

const FONTE = "src/App.tsx";
const src = readFileSync(FONTE, "utf8");
const CARTAO_UPDATER = "src/app/components/UpdaterStatusCard.tsx";
const cartaoUpdater = readFileSync(CARTAO_UPDATER, "utf8");

/* Comentários fora: este arquivo e o App citam `window.confirm` de propósito
 * (o de apagar item continua sendo uma confirmação simples), e casar a discussão
 * do defeito como se fosse o defeito já mordeu o teste da Sidebar. */
const codigo = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Bloco de uma declaração `const nome = …` até a linha `  };` (indentação da App). */
function bloco(nome: string): string | null {
  const inicio = codigo.indexOf(`const ${nome} = `);
  if (inicio === -1) return null;
  const fim = codigo.indexOf("\n  };", inicio);
  return fim === -1 ? null : codigo.slice(inicio, fim);
}

test("Arquivo → Novo pergunta pelas três ações, nunca por confirm booleano", () => {
  const novo = bloco("handleNewFile");
  assert.ok(novo, "handleNewFile não existe mais em App.tsx");
  assert.ok(
    !/window\.confirm/.test(novo),
    "o arquivo novo voltou ao `window.confirm`, que só sabe 'sim/não' e ignora o resultado da gravação",
  );
  assert.match(
    novo,
    /lifecycle\.requestReplace\(/,
    "criar documento não consulta o coordenador de ciclo de vida",
  );
});

test("apagar caminho do workspace não destrói buffer sujo sem decisão", () => {
  const apagar = bloco("handleWorkspaceDelete");
  assert.ok(apagar, "handleWorkspaceDelete não existe mais em App.tsx");
  assert.match(
    apagar,
    /lifecycle\.requestDestructive\(/,
    "apagar arquivo não consulta o coordenador — uma aba suja perderia a única cópia",
  );
  assert.match(apagar, /deleteWorkspacePath\(/, "apagar deixou de apagar: o efeito sumiu");
});

test("trocar de workspace passa pelo coordenador", () => {
  assert.match(
    codigo,
    /lifecycle\.requestWorkspaceSwitch\(/,
    "abrir outra pasta troca o workspace sem consultar os documentos abertos",
  );
});

test("fechar a janela consulta as abas, não só o flush do diário", () => {
  const fechamento = codigo.slice(
    codigo.indexOf("onCloseRequested"),
    codigo.indexOf("onCloseRequested") + 2400,
  );
  assert.ok(fechamento.length > 0, "o tratador de fechamento da janela sumiu");
  assert.match(
    fechamento,
    /lifecycle\.requestExit\(/,
    "fechar a janela deixou de consultar o coordenador (P0.3: aba suja encerrada sem pergunta)",
  );
  assert.ok(
    !/\.flushAll\(\)/.test(fechamento.split("lifecycle.requestExit")[0] ?? ""),
    "o fechamento voltou a resolver o trabalho pendente por conta própria, antes do coordenador",
  );
});

test("instalar atualização pede licença ao coordenador antes de instalar", () => {
  /* No Windows o instalador **pode encerrar o app por conta própria** — o
     `process::exit(0)` é do plugin, depois de lançar o instalador. Então a
     licença tem de existir antes da chamada, e quem assina é o coordenador
     (ML-H05), o único que conhece abas sujas e trabalho prometido. Sem esta
     fiação o botão "Instalar" seria a única saída do app que não passa por
     ninguém — exatamente o P0.3 de volta por outra porta. */
  const cartao = cartaoUpdater
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  assert.ok(
    /lifecycle\.prepareForRestart\(\)/.test(codigo),
    "o app não liga a pré-autorização de reinício ao coordenador de ciclo de vida",
  );
  assert.ok(
    /prepareRestart=\{prepareRestart\}/.test(codigo),
    "a pré-autorização não chega ao cartão de atualização",
  );
  assert.ok(
    /install\(prepareRestart\)/.test(cartao),
    "o botão Instalar chama o serviço sem o veredito do coordenador",
  );
  assert.ok(
    !/(?<![.\w])install\(\s*\)/.test(cartao),
    "o cartão voltou a chamar install() sem preflight: instalar virou um clique só",
  );
});

test("fechar abas entra no coordenador, e não em `runClose` solto", () => {
  const fechar = bloco("closeTabs");
  assert.ok(fechar, "closeTabs não existe mais em App.tsx");
  assert.match(fechar, /lifecycle\.requestClose\(/, "closeTabs deixou de passar pelo coordenador");
});

test("o autosave não é agendado por render", () => {
  // O defeito do P0.4 era o efeito depender de `tabs`/`activeTab` e o
  // `setInterval` recomeçar a cada tecla. A configuração do agendador não pode
  // voltar a citar esses dois como dependência.
  const indice = codigo.indexOf("updateOptions({");
  assert.ok(indice > 0, "o app não configura mais o agendador de autosave");

  const recorte = codigo.slice(Math.max(0, indice - 600), indice + 600);
  assert.ok(
    !/setInterval\(/.test(recorte),
    "o autosave voltou a ter o próprio `setInterval` dentro do componente",
  );
  assert.match(
    codigo,
    /\}, \[settings\.autoSave, settings\.autoSaveInterval\]\);/,
    "a configuração do autosave depende de outra coisa além das preferências",
  );
  // Criar o agendador no corpo do render deixa `setInterval` órfão quando o
  // React descarta um render — e, no StrictMode, a segunda montagem herda um
  // agendador já descartado. Ele nasce dentro de um efeito, como o resto do I/O.
  assert.ok(
    !/if \(autosaveRef\.current === null\)/.test(codigo),
    "o agendador voltou a ser criado durante o render",
  );
  assert.match(
    codigo,
    /createDocumentAutosaveScheduler\(\{/,
    "o agendador de autosave não é mais criado em App.tsx",
  );
});

test("a edição avisa o agendador do documento editado", () => {
  const edicao = bloco("updateActiveTabContent");
  assert.ok(edicao, "updateActiveTabContent não existe mais em App.tsx");
  assert.match(edicao, /autosaveRef\.current\?\.note\(activeTab\.id\)/, "editar não avisa o autosave");
  assert.match(edicao, /noteEdit\(\)/, "editar parou de avançar a revisão da sessão");
});
