// Alinhamento npm x crate das dependencias do Tauri.
//
// Uso: node scripts/check-tauri-versoes.mjs
//
// **O defeito que este portao existe para pegar.** O `tauri build` recusa quando
// o pacote npm `@tauri-apps/x` e o crate `tauri-plugin-x` estao em minors
// diferentes:
//
//     Found version mismatched Tauri packages. Make sure the NPM package and
//     Rust crate versions are on the same major/minor releases:
//     tauri (v2.11.5) : @tauri-apps/api (v2.12.0)
//
// E **nenhum job de CI roda `tauri build`** — o build de release e' o primeiro
// lugar onde isso aparece. Foi assim que um `dependabot` de npm passou verde nos
// seis checks e matou o release v1.8.2 nos tres runners, deixando so' um draft.
//
// **Por que um portao proprio e nao rodar `tauri build`:** o build de release
// custa dezenas de minutos e tres runners. A regra do Tauri e' comparavel
// offline, lendo dois arquivos que ja' estao no repositorio — o `package-lock.json`
// e o `src-tauri/Cargo.lock`. Segundos, sem toolchain.
//
// **O que ele NAO faz:** nao olha `@tauri-apps/cli` (nao tem crate par) nem
// `tauri-build`/`tauri-codegen` (nao tem pacote npm par). O par e' explicito, e o
// portao confere que ele cobre todo `@tauri-apps/plugin-*` que existir no
// `package.json` — senao um plugin novo entraria sem par e sem ninguem notar.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/** npm (em `package-lock.json`) -> crate (em `src-tauri/Cargo.lock`). */
const PARES = [
  ["@tauri-apps/api", "tauri"],
  ["@tauri-apps/plugin-cli", "tauri-plugin-cli"],
  ["@tauri-apps/plugin-dialog", "tauri-plugin-dialog"],
  ["@tauri-apps/plugin-fs", "tauri-plugin-fs"],
  ["@tauri-apps/plugin-opener", "tauri-plugin-opener"],
  ["@tauri-apps/plugin-process", "tauri-plugin-process"],
  ["@tauri-apps/plugin-window-state", "tauri-plugin-window-state"],
];

const falhas = [];
const ok = (cond, msg, detalhe) => {
  if (cond) console.log("  ok    " + msg);
  else {
    console.log("  FAIL  " + msg + (detalhe ? "\n          " + detalhe : ""));
    falhas.push(msg);
  }
};

const lerJson = (rel) => JSON.parse(readFileSync(join(RAIZ, rel), "utf8"));
const minor = (v) => v.split(".").slice(0, 2).join(".");

// npm: `node_modules/<nome>` no lockfile.
function versaoNpm(lock, nome) {
  const entrada = lock.packages?.[`node_modules/${nome}`];
  return entrada?.version ?? null;
}

// cargo: bloco `[[package]]` com o `name` exato.
function versaoCrate(texto, nome) {
  for (const bloco of texto.split("[[package]]")) {
    if (new RegExp(`^name = "${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"$`, "m").test(bloco)) {
      return bloco.match(/^version = "([^"]+)"/m)?.[1] ?? null;
    }
  }
  return null;
}

console.log("dependencias do Tauri — npm x crate\n");

const lockNpm = lerJson("package-lock.json");
const cargoLock = readFileSync(join(RAIZ, "src-tauri", "Cargo.lock"), "utf8");
const pacote = lerJson("package.json");

// ── Guarda anti-vacuidade ──────────────────────────────────────────────────
// Sem isto, um lockfile vazio ou um arquivo renomeado fariam o portao passar
// varrendo nada.
ok(Boolean(lockNpm.packages), "package-lock.json tem `packages` (formato v3)");
ok(cargoLock.includes("[[package]]"), "Cargo.lock tem blocos `[[package]]`");

// Todo `@tauri-apps/plugin-*` declarado no package.json precisa ter par na lista.
const declarados = Object.keys({ ...pacote.dependencies, ...pacote.devDependencies }).filter(
  (n) => n.startsWith("@tauri-apps/plugin-")
);
const semPar = declarados.filter((n) => !PARES.some(([npmNome]) => npmNome === n));
ok(
  semPar.length === 0,
  "todo `@tauri-apps/plugin-*` declarado tem crate par nesta lista",
  semPar.length ? `sem par: ${semPar.join(", ")} — acrescente o par em PARES` : ""
);
ok(declarados.length >= 6, `a lista cobre os plugins declarados (${declarados.length} encontrados)`);

// ── A regra do Tauri, par a par ────────────────────────────────────────────
for (const [npmNome, crate] of PARES) {
  const a = versaoNpm(lockNpm, npmNome);
  const b = versaoCrate(cargoLock, crate);
  if (a === null || b === null) {
    ok(false, `${npmNome} x ${crate}: ambos resolvidos`, `npm=${a ?? "ausente"} crate=${b ?? "ausente"}`);
    continue;
  }
  ok(
    minor(a) === minor(b),
    `${npmNome} ${a} x ${crate} ${b} — mesmo minor`,
    minor(a) === minor(b)
      ? ""
      : `"${npmNome}" esta em ${minor(a)} e o crate em ${minor(b)}. O \`tauri build\` recusa esta combinacao.` +
        ` Rode \`cargo update\` em src-tauri e \`npm update ${npmNome}\` ate os dois minors casarem.`
  );
}

console.log("\n" + (falhas.length ? `FALHOU (${falhas.length})` : "TUDO VERDE"));
process.exit(falhas.length ? 1 : 0);
