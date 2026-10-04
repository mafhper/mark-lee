// Mede o contraste dos icones e rotulos da barra **por pixel**, nao por
// `getComputedStyle`. A diferenca nao e academica: os icones sao duotone
// (`ml-duotone-icon__front`/`__back`) e pintados com fill proprio, entao a cor
// computada nao e a que sai na tela. Medido: 1,63:1 por `computedStyle` contra
// 8,96:1 por pixel — o primeiro e um defeito que nao existe.
//
// Motivo de existir: `contrast:check` valida **tokens** do site de promocao e nao
// mede nenhum pixel do app. Sem esta porta, "contraste verificado na barra" seria
// afirmacao sem prova.
//
// Alvos: WCAG 1.4.11 (graficos significativos, 3:1) para os icones e
// WCAG 1.4.3 (texto normal, 4.5:1) para o rotulo de 10px do modo `stacked`.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORTA = 5280;
const ALVO_ICONE = 3.0;
const ALVO_TEXTO = 4.5;

async function servidorPronto() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/`);
      if (r.ok) return true;
    } catch {
      /* ainda subindo */
    }
    await sleep(500);
  }
  return false;
}

/**
 * Derriba o servidor em árvore.
 *
 * `shell: true` põe um `cmd` entre o Node e o vite, e `kill()` no Node derruba
 * só o `cmd`: o `node` do vite continua escutando na porta. Foi o que aconteceu
 * — o portão terminava com exit 0 e deixava um servidor órfão, e a próxima
 * medição pegava o servidor velho em vez do código novo, que é a forma mais
 * silenciosa de medir a coisa errada. `taskkill /T` derruba a árvore inteira.
 */
function derrubarVite() {
  if (!proprio || !vite || vite.derrubado) return;
  vite.derrubado = true;
  try {
    if (process.platform === "win32") {
      // **Sincrono.** Lancado de dentro de `process.on("exit")`, um `spawn` async
      // nao completa antes do processo sair — e o `node` do vite sobrevive, escutando
      // na porta. Foi assim que este portao passou a enxertar o servidor orfao na
      // medicao seguinte. `spawnSync` bloqueia ate a arvore cair.
      spawnSync("taskkill", ["/pid", String(vite.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      vite.kill("SIGTERM");
    }
  } catch {
    // Se nao conseguir derrubar, o servidor orfao fica com a porta e o proximo
    // portao cai em `servidorPronto()` — visivel, nao silencioso.
  }
}

// Encerrar em qualquer situacao, inclusive Ctrl+C ou excecao: um portao que
// deixa servidor no ar envenena a medicao seguinte.
process.on("exit", derrubarVite);
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => {
    derrubarVite();
    process.exit(1);
  });
}

const proprio = !(await servidorPronto());
const vite = proprio
  ? spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(PORTA)], {
      stdio: "ignore",
      shell: true,
    })
  : null;
if (proprio && !(await servidorPronto())) {
  console.error("portao: o dev server nao subiu em " + PORTA);
  derrubarVite();
  process.exit(1);
}

const navegador = await chromium.launch();
let falhas = 0;
const linhas = [];

for (const modo of ["icon_only", "stacked"]) {
  const p = await navegador.newPage({ viewport: { width: 1440, height: 700 } });
  await p.goto(`http://127.0.0.1:${PORTA}/`, { waitUntil: "networkidle" });
  await p.evaluate((m) => {
    const st = JSON.parse(localStorage.getItem("mark-lee-settings") || "{}");
    st.toolbarDisplayMode = m;
    st.toolbarByAnchor = {
      integrated: { ...(st.toolbarByAnchor?.integrated || {}), toolbarDisplayMode: m },
    };
    localStorage.setItem("mark-lee-settings", JSON.stringify(st));
  }, modo);
  await p.reload();
  await p.waitForTimeout(2000);

  // Um alvo por botao: o glifo (icone) e, no modo empilhado, o rotulo.
  const alvos = await p.evaluate(() => {
    const emMedida = (el) => {
      for (let n = el; n; n = n.parentElement) {
        if (String(n.className).includes("opacity-0")) return true;
      }
      return false;
    };
    const caixa = (el) => {
      const q = el.getBoundingClientRect();
      if (q.width < 4 || q.height < 4) return null;
      return { x: Math.round(q.x), y: Math.round(q.y), width: Math.round(q.width), height: Math.round(q.height) };
    };
    const saida = [];
    for (const sec of document.querySelectorAll(".ml-toolbar-section")) {
      if (emMedida(sec)) continue;
      for (const btn of sec.querySelectorAll("button")) {
        if (emMedida(btn)) continue;
        const svg = btn.querySelector("svg");
        const icone = svg ? caixa(svg) : null;
        let rotulo = null;
        if (modoRotulo()) {
          for (const s of btn.querySelectorAll("span")) {
            const t = (s.textContent || "").trim();
            if (t.length < 2) continue;
            const c = caixa(s);
            if (c) {
              rotulo = { texto: t, fs: parseFloat(getComputedStyle(s).fontSize), ...c };
            }
            break;
          }
        }
        if (icone || rotulo) {
          saida.push({ nome: (btn.getAttribute("aria-label") || "?").split(" (")[0], icone, rotulo });
        }
      }
    }
    function modoRotulo() {
      return !!document.querySelector(".ml-toolbar-section .max-w-full.truncate");
    }
    return saida;
  });

  // Mede por pixel: fundo = cor dominante da area; tinta = a cor mais distante.
  const medir = async (buf) =>
    p.evaluate(async (bytes) => {
      const img = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
      const cv = new OffscreenCanvas(img.width, img.height);
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, img.width, img.height).data;
      const lum = (r, g, b) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const razao = (a, c) => {
        const [x, y] = [lum(a[0], a[1], a[2]), lum(c[0], c[1], c[2])].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
      };
      const cont = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = (d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3);
        const e = cont.get(k) || { n: 0, r: 0, g: 0, b: 0 };
        e.n++;
        e.r += d[i];
        e.g += d[i + 1];
        e.b += d[i + 2];
        cont.set(k, e);
      }
      const cores = [...cont.values()]
        .map((e) => ({ n: e.n, c: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)] }))
        .sort((x, y) => y.n - x.n);
      if (cores.length < 2) return null;
      const fundo = cores[0].c;
      const tinta = cores
        .filter((x) => x.c.join() !== fundo.join() && x.n >= 1)
        .map((x) => ({ ...x, d: razao(x.c, fundo) }))
        .sort((a, b2) => b2.d - a.d)[0];
      return tinta ? tinta.d : null;
    }, Array.from(buf));

  let piorIcone = { r: Infinity, nome: "" };
  let piorRotulo = { r: Infinity, nome: "" };

  for (const a of alvos) {
    if (a.icone) {
      const r = await medir(await p.screenshot({ clip: a.icone }));
      if (r !== null && r < piorIcone.r) piorIcone = { r, nome: a.nome };
    }
    if (a.rotulo) {
      const r = await medir(await p.screenshot({ clip: a.rotulo }));
      if (r !== null && r < piorRotulo.r) piorRotulo = { r, nome: a.rotulo.texto };
    }
  }

  const rel = (r, alvo, oQue) => {
    // Contraste passa quando é **maior ou igual** ao alvo. E "não mediu" não é
    // aprovação: sem prova não há PASS — cai em FALHA para aparecer na CI.
    const ok = Number.isFinite(r) && r >= alvo;
    if (!ok) falhas++;
    linhas.push(
      `  ${modo.padEnd(10)} ${oQue.padEnd(22)} pior=${r === Infinity ? "n/a" : r.toFixed(2) + ":1"}  alvo=${alvo}:1  ${ok ? "PASS" : "FALHA"}`,
    );
  };
  rel(piorIcone.r, ALVO_ICONE, `icones (${piorIcone.nome})`);
  if (piorRotulo.r !== Infinity) rel(piorRotulo.r, ALVO_TEXTO, `rotulo 10px (${piorRotulo.nome})`);
  await p.close();
}

await navegador.close();
derrubarVite();

console.log("Contraste da barra, medido por pixel");
linhas.forEach((l) => console.log(l));
if (falhas > 0) {
  console.error(`\n${falhas} medida(s) abaixo do alvo.`);
  process.exit(1);
}
console.log("\nTodas as medidas passam.");