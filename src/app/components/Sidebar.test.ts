import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* O CRUD da árvore do workspace é controlado por `hoveredPath` — estado do
 * React — e não por `group-hover` de CSS. O teste é uma trava sobre essa
 * escolha, não sobre o desenho.
 *
 * A versão em CSS dependia de um invariante que nada guardava: nenhum
 * ancestral da árvore pode ter a classe `group`. Bastava um `group` a mais em
 * um wrapper para que `.group:hover .group-hover\:flex` acendesse todas as
 * linhas descendentes de uma vez — que é o sintoma de "mouse sobre um arquivo
 * e o CRUD de todos aparece".
 *
 * Por que teste de fonte, e não de render: o componente abre diálogo de
 * sistema para criar e renomear arquivo, e a árvore só existe com workspace
 * aberto. Um teste de render exigiria Tauri. O que este arquivo trava é a
 * invariante — que a visibilidade vem de estado — e ela é o que quebra em
 * silêncio. */

const F = "src/app/components/Sidebar.tsx";
const src = readFileSync(F, "utf8");

/* Remove comentários, para não casar a **discussão** do defeito como se fosse o
 * defeito. Este arquivo comenta `group-hover` em três lugares de propósito. */
const codigo = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("o CRUD não depende mais de group-hover", () => {
  assert.ok(
    !/group-hover/.test(codigo),
    "a árvore ainda usa group-hover: a visibilidade volta a depender de nenhum ancestral ter `group`",
  );
});

test("o estado da linha sob o mouse existe e é único", () => {
  assert.match(
    codigo,
    /useState<string \| null>\(null\)/,
    "falta o estado hoveredPath: sem ele não há como acender uma linha por vez",
  );
  assert.match(
    codigo,
    /hoveredPath === node\.path \? "flex" : "none"/,
    "a visibilidade do CRUD precisa vir da comparação com hoveredPath",
  );
});

test("o hover entra e sai na linha inteira, não só no nome", () => {
  /* O `onMouseLeave` no botão do nome apagaria os ícones na passagem do nome
   * para eles — e os ícones estão fora do botão. */
  assert.match(codigo, /onMouseEnter=\{\(\) => onHoveredPathChange\(node\.path\)\}/);
  assert.match(codigo, /onMouseLeave=\{\(\) => onHoveredPathChange\(null\)\}/);
});

test("o DOM expõe qual linha está acesa, para o teste de layout poder medir", () => {
  assert.match(
    codigo,
    /data-crud-visible=/,
    "sem data-crud-visible nenhum teste de navegador consegue contar os CRUD acesos",
  );
});

test("a recursão repassa o estado para os filhos", () => {
  const usos = codigo.match(/<SidebarTreeNode/g) ?? [];
  assert.equal(usos.length, 2, "a árvore tem dois pontos de montagem: raiz e recursão");
  /* Se a recursão não repassar, os filhos nunca acendem — e isso passa
   * despercebido, porque a raiz continua funcionando. */
  const ocorrencias = codigo.match(/hoveredPath=\{hoveredPath\}/g) ?? [];
  assert.equal(
    ocorrencias.length,
    2,
    "raiz e recursão precisam receber hoveredPath; uma delas ficou de fora",
  );
});
