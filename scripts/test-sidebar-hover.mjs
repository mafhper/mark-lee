/* O CRUD do sidebar acende **um por vez**.
 *
 * Este teste existe porque a árvore do workspace não renderizava no navegador:
 * `readWorkspaceTree` chama `requireTauri`, que lança fora do desktop. Sem
 * pasta aberta em `npm run dev` não há linha nenhuma, e portanto não havia porta
 * para verificar o hover — foi assim que "o CRUD de todas as linhas aceso" passou
 * sem ninguém ver.
 *
 * A árvore sintética vem de `?demo=workspace`, que só existe em DEV.
 *
 * O que é medido, e por quê cada caso:
 *   - sem hover: nenhum CRUD — senão a linha apagada continua com os ícones;
 *   - hover numa linha: **um**, e o `data-crud-for` é o **dela**;
 *   - hover em outra linha: **um**, e o `data-crud-for` mudou;
 *   - sair da árvore: nenhum.
 *
 * O segundo caso é o que o dono viu antes: mais de um aceso. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as dormir } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORTA = 5280;
const BASE = `http://${HOST}:${PORTA}`;

let falhas = 0;
const p = (m) => { falhas++; console.log(`  FALHA  ${m}`); };
const ok = (m) => console.log(`  ok      ${m}`);

const vivo = async () => {
  try {
    const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch { return false; }
};

let servidor = null;
if (!(await vivo())) {
  console.log("  subir o dev server...");
  servidor = spawn("npm", ["run", "dev"], { shell: true, stdio: "ignore", detached: false });
  for (let i = 0; i < 40 && !(await vivo()); i++) await dormir(500);
  if (!(await vivo())) { console.log("  FALHA: o servidor nao subiu"); process.exit(1); }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));

await page.goto(`${BASE}/?demo=workspace`, { waitUntil: "networkidle" });
await page.waitForSelector(".group.relative", { timeout: 8000 }).catch(() => {});

const linhas = await page.locator(".group.relative").count();
console.log(`  linhas renderizadas: ${linhas}`);
if (linhas < 2) p(`sao ${linhas} linha(s); o teste precisa de pelo menos 2`);

const contar = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-crud-for]")]
      .filter((s) => getComputedStyle(s).display !== "none" && s.getBoundingClientRect().width > 0)
      .map((s) => s.getAttribute("data-crud-for")),
  );

const semHover = await contar();
if (semHover.length === 0) ok("sem hover: nenhum CRUD aceso");
else p(`${semHover.length} CRUD aceso sem hover`);
if (semHover.length > 1) p("<<< mais de um CRUD sem hover: e' o defeito que o dono viu");

/* A linha é localizada pelo **próprio `data-crud-for`**, e o hover vai no pai
 * dele.
 *
 * Duas versões anteriores erraram aqui, e a segunda delas é instrutiva:
 *
 *  1. por índice (`nth`) — as duas medidas caíram na **mesma** linha, e o teste
 *     reportou "o CRUD não mudou" como se fosse defeito.
 *  2. por `filter({ hasText })` sobre `.group.relative` — o nó da raiz é um
 *     `group` que **envolve a árvore inteira**, então o texto de qualquer arquivo
 *     está dentro dele. Todo filtro casava a raiz, e o hover caía sempre na
 *     mesma linha.
 *
 *  O `data-crud-for` é único por linha e está dentro da linha, então `xpath=..`
 *  sobe para exatamente o elemento certo, sem depender de ordem nem de
 *  quantos `group` existem acima. */
const linhaDe = (trecho) =>
  page.locator(`[data-crud-for*="${trecho}"]`).first().locator("xpath=..");

const porNome = async (trecho) => {
  const alvo = linhaDe(trecho);
  const nome = (await alvo.locator("span.truncate").first().textContent())?.trim();
  await alvo.hover();
  await page.waitForTimeout(200);
  return { nome, acesos: await contar() };
};

const a = await porNome("a_arte_de_escrever");
if (a.acesos.length === 1) ok(`hover em "${a.nome}": 1 CRUD`);
else p(`hover em "${a.nome}": ${a.acesos.length} acesos`);
if (a.acesos[0]?.includes("a_arte_de_escrever")) ok("o CRUD é da linha sob o mouse");
else p(`o CRUD aceso é ${a.acesos[0]}, e a linha é ${a.nome}`);

const b = await porNome("dicas_de_produtividade");
if (b.acesos.length === 1) ok(`hover em "${b.nome}": 1 CRUD`);
else p(`hover em "${b.nome}": ${b.acesos.length} acesos`);
if (b.acesos[0]?.includes("dicas_de_produtividade")) ok("o CRUD mudou para a linha nova");
else p(`o CRUD é ${b.acesos[0]}, e a linha é ${b.nome}`);
if (a.acesos[0] !== b.acesos[0]) ok("duas linhas distintas, e só uma acesa por vez");

await page.mouse.move(1000, 520);
await page.waitForTimeout(200);
const fora = await contar();
if (fora.length === 0) ok("ao sair da arvore: nenhum CRUD aceso");
else p(`${fora.length} CRUD continua aceso apos sair`);

if (erros.length) p(`${erros.length} erro(s) de pagina: ${erros[0].slice(0, 90)}`);

console.log(`\n  ${falhas === 0 ? "CRUD: um por vez" : `${falhas} falha(s)`}`);
await browser.close();
if (servidor) servidor.kill();
process.exit(falhas === 0 ? 0 : 1);
