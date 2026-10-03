import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Portão de superfície pública.
 *
 * O `.dev/` é workspace privado, local-only. Nada da sua existência ou do seu
 * vocabulário pode aparecer em arquivo versionado: nem em README, nem em
 * `docs/`, nem — e este é o motivo de o script existir — **em comentário de
 * código-fonte**. Comentário parece inofensivo e é o que mais escapa, porque
 * ninguém revisa `src/` procurando referência interna.
 *
 * A regra é **por formato, não por nome**: o que se caça é o padrão
 * (`ADR-\d{3}`, `MKL-\d`), não a lista do que existe hoje. Um item novo nasce
 * coberto sem ninguém editar este arquivo.
 *
 * Este script cita o que caça porque não dá para aplicá-lo sem nomeá-lo — a
 * mesma legitimidade que a regra do `.gitignore`. Ele se isenta, e isenta o
 * `.gitignore`, pelo mesmo motivo: os dois precisam conter o padrão para poder
 * proibir que ele vaze.
 */

const raiz = process.cwd();

const ISENTOS = new Set([".gitignore", "scripts/superficie-check.mjs"]);

// Arquivos de build e de dependência não são superfície pública de verdade:
// o conteúdo deles é de terceiros e versioná-los não expõe nada do projeto.
const EXTENSOES = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
  ".yml",
  ".yaml",
]);

const PADROES = [
  { rotulo: "workspace privado", re: /(?:^|[^\w./-])\.dev\// },
  { rotulo: "código de decisão interna", re: /\bADR-\d{2,3}\b/ },
  { rotulo: "código de tarefa interna", re: /\b(?:MKL|ML|GTH|SPR|IC|TUKB)-\d+[A-Z]?\b/ },
];

function versionados() {
  const saida = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return saida.split("\0").filter(Boolean);
}

function textoDe(arquivo) {
  // `.gitignore` é o único arquivo que precisa ser lido apesar de não ter
  // extensão; o resto passa pelo filtro de extensão.
  if (arquivo === ".gitignore") return fs.readFileSync(path.join(raiz, arquivo), "utf8");
  if (!EXTENSOES.has(path.extname(arquivo).toLowerCase())) return null;
  try {
    return fs.readFileSync(path.join(raiz, arquivo), "utf8");
  } catch {
    return null;
  }
}

const violacoes = [];

for (const arquivo of versionados()) {
  if (ISENTOS.has(arquivo)) continue;
  const texto = textoDe(arquivo);
  if (texto === null) continue;

  const linhas = texto.split(/\r?\n/);
  linhas.forEach((linha, indice) => {
    const numero = indice + 1;
    // URL não é citação: `vite.dev/config/` e `getferrite.dev/features` casam
    // com o padrão do workspace e não dizem nada sobre ele.
    if (/https?:\/\//.test(linha)) return;
    for (const { rotulo, re } of PADROES) {
      const achado = re.exec(linha);
      if (!achado) continue;
      violacoes.push({ arquivo, linha: numero, rotulo, trecho: achado[0], texto: linha.trim() });
      break;
    }
  });
}

if (violacoes.length === 0) {
  console.log("Surface check: OK (nenhuma referência ao workspace privado em arquivo versionado).");
  process.exit(0);
}

console.error(`\nSurface check: ${violacoes.length} referencia(s) a workspace privado em arquivo versionado.\n`);
for (const v of violacoes) {
  console.error(`  ${v.arquivo}:${v.linha}  [${v.rotulo}]`);
  console.error(`      ${v.trecho}`);
  console.error(`      ${v.texto.slice(0, 110)}`);
}
console.error(
  "\nO `.dev/` e local-only. A razao da mudanca fica no workspace, nao no codigo:\n" +
    "reescreva o comentario com o motivo tecnico e tire o codigo interno.\n" +
    "Se a citacao for legitima (esta regra e o proprio .gitignore), o caminho e\n" +
    "isentar o arquivo em ISENTOS, acima.\n",
);
process.exitCode = 1;