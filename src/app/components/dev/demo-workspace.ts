/* Árvore de workspace sintética, só para desenvolvimento.
 *
 * POR QUE ISTO EXISTE
 *
 * `readWorkspaceTree` chama `requireTauri`, que **lança** fora do desktop. Em
 * `npm run dev` — navegador puro — a árvore nunca renderiza: sem pasta aberta,
 * sem linhas, sem sidebar para testar. O mesmo vale para `test:ui-layout`, que
 * dirige o app pelo navegador e por isso nunca cobriu o sidebar.
 *
 * O resultado é uma classe de defeito inteira fora do alcance de qualquer
 * teste: o CRUD da árvore, o hover das linhas, a largura da coluna, o
 * recolhimento. Foi assim que "o CRUD acende em todas as linhas" passou: não
 * havia porta para ele ser testado, e ninguém tinha como ver.
 *
 * COMO ABRIR
 *
 *   npm run dev   →   http://127.0.0.1:5280/?demo=workspace
 *
 * A porta é explícita e o módulo é **inerte fora de DEV**: o Vite elimina o
 * branch morto na build de produção, então isto não existe no binário publicado.
 */

/* `../../../types` e nao `../../types`: este arquivo esta um nivel mais fundo
 * que `Sidebar.tsx` (que esta em `components/` e usa `../../types`). Aqui o
 * caminho passa por `components/dev/` antes de chegar em `src/`. */
import type { WorkspaceNode } from "../../../types";

const RAIZ = "C:/fixtures/markdown_sample";

const arquivo = (nome: string): WorkspaceNode => ({
  name: nome,
  path: `${RAIZ}/${nome}`,
  is_dir: false,
});

const pasta = (nome: string, children: WorkspaceNode[]): WorkspaceNode => ({
  name: nome,
  path: `${RAIZ}/${nome}`,
  is_dir: true,
  children,
});

/** Nomes longos de propósito: o nome é truncado, e o CRUD entra por cima do
 *  texto. São os dois que disputam a mesma faixa de largura. */
export function buildDemoWorkspaceTree(): WorkspaceNode {
  return pasta("markdown_sample", [
    arquivo("a_arte_de_escrever_codigo_li.md"),
    arquivo("a_histria_dos_videogames_computadores.md"),
    arquivo("a_revoluo_do_5g_e_iot.md"),
    arquivo("carreira_em_ti_dicas_para_iniciantes.md"),
    arquivo("desenvolvimento_web_moderno_com_jamstack.md"),
    arquivo("dicas_de_produtividade_para_trabalhar.md"),
    arquivo("entendendo_blockchain_e_criptomoedas.md"),
    arquivo("explorando_o_universo_com_astronomia.md"),
    pasta("guias", [
      arquivo("guia_completo_de_css_grid_layout.md"),
      arquivo("guia_completo_de_flexbox.md"),
    ]),
    pasta("notas", [
      arquivo("introducao_ao_machine_learning.md"),
      arquivo("minimalismo_digital_menos_telas.md"),
      arquivo("o_futuro_da_inteligencia_artificial.md"),
      arquivo("o_poder_do_open_source.md"),
      arquivo("por_que_usar_nodesjs_em_2026.md"),
    ]),
  ]);
}

/** A porta é `?demo=workspace`. Qualquer outro valor é ignorado. */
export function demoWorkspaceRequested(search: string): boolean {
  return new URLSearchParams(search).get("demo") === "workspace";
}
