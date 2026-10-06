import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  getSearchQuery,
  openSearchPanel,
  SearchQuery,
  searchPanelOpen,
  setSearchQuery,
} from "@codemirror/search";
import {
  consultaDasOpcoes,
  mesmasOpcoes,
  proximasOpcoes,
  type ConsultaPainel,
  type OpcoesBusca,
} from "./search-options";

/**
 * A metade da busca que fala com o CodeMirror.
 *
 * Duas outras metades, ambas testáveis no runner do Node:
 * `search-options.ts` guarda o vocabulário das três opções e a decisão de quando
 * gravar em disco; `search-phrases.ts` guarda os rótulos do painel no idioma do
 * aplicativo e o `Compartment` que os troca. Aqui só o que precisa de um
 * `EditorView` de verdade.
 */

/**
 * Monta a consulta aplicando as três opções, preservando termo e substituição.
 *
 * `literal` é repassado porque é o parente próximo de `regexp` (busca textual x.
 * regex) e não faz parte das três opções gravadas. Perder o valor dele aqui
 * trocaria a semântica da busca sem que nenhum interruptor tivesse mudado.
 */
function comOpcoes(base: SearchQuery, opcoes: ConsultaPainel, termo?: string): SearchQuery {
  return new SearchQuery({
    search: termo ?? base.search,
    replace: base.replace,
    literal: base.literal,
    caseSensitive: opcoes.caseSensitive,
    wholeWord: opcoes.wholeWord,
    regexp: opcoes.regexp,
  });
}

/**
 * Ponte entre o painel do editor e a configuração persistida.
 *
 * **Por que uma extensão, e não um `onChange` do React:** o painel é estado do
 * CodeMirror, não do React — o mesmo motivo que fez `useSearchPanelOpen`
 * existir. Não há elemento do React cujo `onChange` pudesse gravar isto.
 *
 * **Restaura na abertura, grava na escolha.** A distinção é o que impede duas
 * coisas ruins. Restaurar a cada tecla faria o "regex" se marcar sozinho no meio
 * da digitação, porque o painel nasce com os três desligados e a pessoa não teve
 * tempo de clicar nada. Gravar na abertura gravaria o valor de partida, e
 * desligar um interruptor na mesma sessão não se guardava.
 *
 * **A restauração acontece na transição de "fechado" para "aberto"**, e não num
 * `onClick` nosso: `Mod-f` chega pelo keymap da própria biblioteca, e um caminho
 * só nosso deixaria o atalho de fora.
 */
export function syncDasOpcoes(
  ler: () => OpcoesBusca,
  gravar: (opcoes: OpcoesBusca) => void
): Extension {
  // Guarda de reentrância: o `dispatch` da restauração dispara este mesmo
  // listener, e sem a guarda ela se realimentaria indefinidamente.
  let restaurando = false;

  return EditorView.updateListener.of((update) => {
    const abriu = !searchPanelOpen(update.startState) && searchPanelOpen(update.state);
    if (abriu && !restaurando) {
      const atual = getSearchQuery(update.state);
      const alvo = consultaDasOpcoes(ler());
      if (!mesmasOpcoes(atual, alvo)) {
        restaurando = true;
        try {
          update.view.dispatch({ effects: setSearchQuery.of(comOpcoes(atual, alvo)) });
        } finally {
          restaurando = false;
        }
        // A restauração **não** grava: o valor veio de onde foi lido, e gravar de
        // volta não distingue "o painel estava desligado" de "a pessoa escolheu
        // desligado".
        return;
      }
    }

    for (const tr of update.transactions) {
      for (const efeito of tr.effects) {
        if (!efeito.is(setSearchQuery)) continue;
        const proximas = proximasOpcoes(ler(), {
          caseSensitive: efeito.value.caseSensitive,
          wholeWord: efeito.value.wholeWord,
          regexp: efeito.value.regexp,
        });
        if (proximas) gravar(proximas);
      }
    }
  });
}

/**
 * O painel só existe **depois** do quadro em que `openSearchPanel` despachou.
 *
 * Não é folklore: `openSearchPanel` faz `togglePanel.of(true)` e o campo é
 * construído no ciclo de update seguinte — no mesmo instante, `querySelector`
 * devolve `null`. Medido antes de existir esta espera.
 */
function noProximoQuadro(view: EditorView, aoEncontrar: (campo: HTMLInputElement) => void): void {
  requestAnimationFrame(() => {
    const campo = view.dom.querySelector<HTMLInputElement>('.cm-search input[name="search"]');
    if (!campo) return;
    aoEncontrar(campo);
  });
}

/**
 * `Substituir` (Ctrl+H) — abre o painel **no campo de substituição**.
 *
 * É o que o atalho promete: abrir no termo obrigaria a pessoa a clicar duas
 * vezes para chegar lá. A biblioteca não expõe isso, porque `openSearchPanel` só
 * conhece o campo principal (`main-field`).
 */
export function focarSubstituicao(view: EditorView): void {
  if (!searchPanelOpen(view.state)) openSearchPanel(view);
  noProximoQuadro(view, (campo) => {
    const substituto = campo.form?.elements.namedItem("replace");
    if (substituto instanceof HTMLInputElement) {
      substituto.focus();
      substituto.select();
      return;
    }
    campo.focus();
    campo.select();
  });
}

/**
 * Abre a busca já com um termo — o "Buscar seleção" do menu do preview.
 *
 * **Por que este caminho continua existindo se `openSearchPanel` já semeia a
 * seleção:** a semeadura da biblioteca lê a seleção do **editor**. A do menu de
 * contexto do preview vem da **própria visualização**, onde não há cursor nem
 * seleção do CodeMirror — e o campo sairia vazio, que é o item de menu que não
 * faz nada.
 *
 * As opções vêm do chamador porque a busca precisa nascer com os três
 * interruptores que a pessoa deixou da última vez, e não com os padrões da
 * biblioteca.
 */
export function abrirComTermo(view: EditorView, termo: string, opcoes: OpcoesBusca): void {
  if (!searchPanelOpen(view.state)) openSearchPanel(view);
  noProximoQuadro(view, (campo) => {
    view.dispatch({
      effects: setSearchQuery.of(comOpcoes(getSearchQuery(view.state), consultaDasOpcoes(opcoes), termo)),
    });
    campo.focus();
    campo.select();
  });
}
