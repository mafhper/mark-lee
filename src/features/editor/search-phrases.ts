/**
 * Os rótulos do painel de busca, no idioma do aplicativo.
 *
 * **O defeito.** O `@codemirror/search` desenha o painel chamando
 * `phrase(view, "next")` — e o pacote traz essas frases **em inglês, hard-coded**.
 * Num app cujo idioma padrão é pt-BR, `Ctrl+F` abre uma caixa que fala outra
 * língua. Nada quebra: o typecheck passa, o build passa, e o defeito é que está
 * **errado**. Nenhum portão do projeto o veria.
 *
 * **A saída é `EditorState.phrases`**, um facet de tradução que a biblioteca
 * consulta antes de usar qualquer rótulo.
 *
 * **Por que este arquivo não importa nada do projeto.** É a mesma razão de
 * `search-options.ts`: a decisão precisa ser testável no runner do Node, sem
 * navegador. O runner resolve ESM de verdade e **exige extensão explícita** nos
 * imports relativos (`allowImportingTsExtensions` está ligado, mas o fonte do
 * projeto usa imports sem extensão por convenção) — então um módulo com imports
 * locais não pode ser carregado por ele. A tabela, o facet e o `Compartment`
 * ficam juntos aqui, e `search-panel.ts` — que fala com o painel — é quem
 * importa daqui.
 *
 * **Por que a tabela não é o dicionário inteiro.** O facet aceita qualquer
 * objeto; passar `t` inteiro funcionaria hoje e passaria a *vazar* o dicionário
 * inteiro para a biblioteca — que poderia ler uma chave que ninguém revisou
 * como tradução de busca. Aqui a lista é explícita, e o teste compara as duas.
 */
import { Compartment, EditorState, type Extension, type StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/**
 * As frases que o `@codemirror/search` pede, com a chave que traduz cada uma.
 *
 * A coluna da esquerda é o **identificador da biblioteca** — não é nossa, e
 * mudar o texto dela silenciosamente quebra a tradução. A da direita é uma chave
 * de `src/translations.ts`, reaproveitada de onde já existia.
 *
 * **As seis últimas são anúncios de leitor de tela**, não rótulos visíveis: a
 * biblioteca anuncia "current match … on line N" a cada navegação. Elas não
 * aparecem na tela, mas são a mesma falha uma camada abaixo — um leitor de tela
 * em português leria a busca em inglês.
 */
const CHAVES: Record<string, string> = {
  // Campos e botões do painel.
  Find: "edit.find",
  Replace: "edit.replace",
  next: "find.next",
  previous: "find.prev",
  all: "find.selectAll",
  replace: "find.replaceOne",
  "replace all": "find.replaceAll",
  close: "find.close",
  // As três opções.
  "match case": "find.caseSensitive",
  regexp: "find.regex",
  "by word": "find.wholeWord",
  // `Mod-Alt-g`, o painel "ir para a linha".
  go: "find.go",
  "Go to line": "find.goToLine",
  // Anúncios para leitor de tela. As duas últimas **mantêm o `$`** — é o
  // marcador que a biblioteca substitui pelo número.
  "current match": "find.currentMatch",
  "on line": "find.onLine",
  "replaced match on line $": "find.replacedOnLine",
  "replaced $ matches": "find.replacedMatches",
};

/** Os identificadores da biblioteca, na ordem em que ela os usa. */
export const FRASES_DA_BUSCA: readonly string[] = Object.keys(CHAVES);

/**
 * As chaves de `translations.ts` que o painel consome.
 *
 * Existe para o teste de completude poder afirmar `chave in dicionário` — e ele
 * é o que cobre o **pt-BR**. Só ele, e é preciso saber por quê.
 *
 * **Os três idiomas têm dois fallbacks diferentes, e nenhum avisa:**
 *
 * - `ptBR` é um objeto **próprio**. Chave faltante vira `undefined`, e
 *   `frasesDaBusca` degrada para o identificador da biblioteca (`"by word"`). Só
 *   o `hasOwnProperty` disto pega: comparar contra o inglês **não** pega, porque
 *   `"by word"` é diferente de `"Whole word"` e a asserção passaria.
 * - `esES` é `{ ...enUS, ... }` — construído **sobre** o inglês. Chave faltante
 *   vira o texto **em inglês**, `hasOwnProperty` é sempre verdadeiro (o spread
 *   copiou), e este teste é vácuo para o espanhol. Quem cobre o es-ES é a
 *   asserção de "não ficou igual ao en-US".
 *
 * Ou seja: os dois testes são complementares, não redundantes. Conferido nos
 * dois sentidos — removendo a chave do pt-BR o teste daqui reprova; removendo do
 * es-ES é o outro que reprova.
 */
export const CHAVES_USADAS: readonly string[] = Object.values(CHAVES);

/**
 * O dicionário para o facet `EditorState.phrases`.
 *
 * `fallback` existe porque `t` é `Record<string, string>` e o TypeScript não
 * sabe que estas chaves existem. Se uma faltar, `state.phrase()` cai no inglês da
 * biblioteca — degradar para inglês é melhor do que `undefined` na tela, e o
 * teste de completude é o que impede a falta.
 */
export function frasesDaBusca(t: Record<string, string>): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [fraseDaBiblioteca, chave] of Object.entries(CHAVES)) {
    saida[fraseDaBiblioteca] = t[chave] ?? fraseDaBiblioteca;
  }
  return saida;
}

/**
 * O slot dos rótulos dentro da configuração do editor.
 *
 * **Por que um `Compartment` e não `reconfigure` direto.** A troca de idioma
 * precisa **substituir** o valor do facet `EditorState.phrases`, e as duas
 * alternativas erram feio:
 *
 * - `StateEffect.reconfigure.of(...)` troca a **configuração inteira**. Passar
 *   só o facet de frases apagaria busca, keymaps, linguagem e números de linha —
 *   o editor sairia funcional o suficiente para não dar erro, e quebrado o
 *   bastante para não servir.
 * - `StateEffect.appendConfig` **acumula**. O facet `phrases` combina por
 *   concatenação e `state.phrase()` usa a **primeira** entrada que casar, então
 *   o valor antigo continuaria vencendo.
 *
 * O `Compartment` existe exatamente para isto: é um slot nomeado que se reescreve
 * sem tocar no resto. Os dois defeitos acima estão como asserção de teste.
 */
const compartimentoRotulos = new Compartment();

/** A extensão que ensina o painel a falar o idioma do aplicativo. */
export function rotulosDaBusca(t: Record<string, string>): Extension {
  return compartimentoRotulos.of(EditorState.phrases.of(frasesDaBusca(t)));
}

/**
 * O efeito da troca de idioma, **separado do `dispatch`**.
 *
 * O painel do CodeMirror precisa de DOM para ser construído, mas o efeito não:
 * `EditorState` funciona headless. Devolver o efeito em vez de despachá-lo é o
 * que permite testar a troca no runner do Node — e a asserção que importa é que
 * ela **não leve o resto da configuração junto**.
 */
export function efeitoTrocarRotulos(t: Record<string, string>): StateEffect<unknown> {
  return compartimentoRotulos.reconfigure(EditorState.phrases.of(frasesDaBusca(t)));
}

/** Reaplica os rótulos a um editor vivo — usado na troca de idioma. */
export function trocarRotulosDaBusca(view: EditorView, t: Record<string, string>): void {
  view.dispatch({ effects: efeitoTrocarRotulos(t) });
}
