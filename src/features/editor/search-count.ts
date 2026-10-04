import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getSearchQuery } from "@codemirror/search";

/**
 * Contador de ocorrências da busca — que a biblioteca **não tem**.
 *
 * `@codemirror/search` 6.7.2 realça e navega, mas o painel não mostra "x de y":
 * `matchCount` e `count` não aparecem no pacote. A busca precisa do contador: é o
 * que diz, de relance, se o termo existe no documento e se o resultado é o
 * esperado.
 *
 * **TrêsRejected approaches, e por que importam.**
 *
 * 1. *Contar as decorações.* Parecia o caminho sem risco — as marcas são da própria
 *    biblioteca. Mas `searchHighlighter` só decora dentro de `view.visibleRanges`
 *    (mais uma margem), porque **a biblioteca nunca calcula o total do
 *    documento**: ela só sabe o que está à vista. Contar decorações — ou nós do
 *    DOM — daria o total da página visível, e o número mentiria exatamente onde
 *    mais importa: num documento longo.
 *
 * 2. *Refazer a busca com `SearchCursor`.* Contaria o documento todo, mas exige
 *    remontar o padrão: a biblioteca tem dois cursores (`SearchCursor` literal e
 *    `RegExpCursor`), decide entre eles por `regexp`, escapa metacaracteres e
 *    acrescenta `\b` conforme `wholeWord`. Espelhar essa regra é exatamente como
 *    um contador passa a discordar do realce — o usuário leria "12" com três
 *    trechos pintados.
 *
 * 3. *`searchPanelOpen` para decidir se escreve.* O painel é destruído junto com
 *    o nó, então perguntar a um campo de estado interno se o próprio DOM existe é
 *    indireção que só erra — foi assim que o contador não apareceu, sem erro
 *    nenhum no console.
 *
 * **O caminho usado:** `SearchQuery.getCursor()` é público na biblioteca e
 * devolve **o cursor que ela própria usa**, com a mesma semântica das três
 * opções. Iterar sobre ele conta o documento inteiro sem duplicar regra nenhuma:
 * se a biblioteca mudar como casa o termo, o contador muda junto, e não pode
 * divergir do realce porque é a mesma coisa contando.
 *
 * Por que escrever direto no DOM: o contador precisa ficar **dentro** do painel,
 * ao lado do campo, e esse ponto pertence à biblioteca — uma decoração exigiria
 * uma âncora que não temos. A escrita é idempotente e some com o painel.
 */

const CLASSE_CONTADOR = "cm-search-count";

export interface ContagemBusca {
  total: number;
  /** Índice da ocorrência em foco, 1-based. `0` quando o cursor não está em nenhuma. */
  atual: number;
}

/**
 * Teto de segurança, não otimização: um termo de uma letra num documento grande
 * pode dar centenas de milhares de ocorrências, e o contador é para leitura
 * humana. Acima do teto o número exato deixa de importar, e o custo de percorrer
 * o documento passaria a pesar a cada tecla.
 */
const TETO_MATCHES = 20000;

/**
 * O cursor de busca expõe `done`/`value`/`next()` em tempo de execução, mas o
 * `.d.ts` o declara só como `Iterator<{from,to}>`. E o cursor começa **antes** da
 * primeira ocorrência: ler `value` sem avançar antes conta uma vez a mais — foi o
 * que fez "alfa" aparecer três vezes no texto e quatro no contador.
 */
interface CursorReal {
  done: boolean;
  value: { from: number; to: number; precise?: boolean };
  next(): boolean | undefined;
}

/**
 * Conta as ocorrências do termo ativo e diz qual está em foco.
 *
 * Percorre uma vez: o mesmo cursor que conta também localiza a ocorrência que
 * contém a cabeça da seleção. Um segundo cursor custaria o dobro da travessia
 * para responder à mesma pergunta.
 */
export function contarOcorrencias(state: EditorState): ContagemBusca {
  const query = getSearchQuery(state);
  if (!query.search || !query.valid) return { total: 0, atual: 0 };

  const cabeca = state.selection.main.head;
  let total = 0;
  let atual = 0;

  try {
    const cursor = query.getCursor(state) as unknown as CursorReal;
    // Avançar **antes** de ler: o cursor nasce posicionado antes da primeira
    // ocorrência, e ler sem isso soma uma ocorrência fantasma.
    while (cursor.next() && !cursor.done) {
      const { from, to } = cursor.value;
      if (cursor.value.precise === false) {
        cursor.next();
        continue;
      }
      total += 1;
      if (atual === 0 && from <= cabeca && cabeca <= to) atual = total;
      if (total >= TETO_MATCHES) break;
    }
  } catch {
    // Padrão inválido como regex: a biblioteca também não realça nada, e zero é o
    // comportamento coerente — mostrar um número aqui seria mentir.
    return { total: 0, atual: 0 };
  }

  return { total, atual };
}

/** `atual/total`; `0/0` quando não há o que anunciar. */
function rotulo(c: ContagemBusca): string {
  if (c.total === 0) return "0/0";
  return `${c.atual > 0 ? c.atual : 1}/${c.total}`;
}

function escreverContador(view: EditorView): void {
  const painel = view.dom.querySelector(".cm-search");
  if (!painel) return;

  const contagem = contarOcorrencias(view.state);
  const existente = painel.querySelector(`.${CLASSE_CONTADOR}`) as HTMLElement | null;

  if (contagem.total === 0 && view.state.doc.length === 0) {
    // Documento vazio não é "0 resultados": é nada a procurar.
    existente?.remove();
    return;
  }

  let el = existente;
  if (!el) {
    el = document.createElement("span");
    el.className = CLASSE_CONTADOR;
    el.setAttribute("aria-live", "polite");
    const campo = painel.querySelector('input[name="search"]');
    if (campo && campo.parentNode) campo.parentNode.insertBefore(el, campo.nextSibling);
    else painel.appendChild(el);
  }
  el.textContent = rotulo(contagem);
}

/**
 * Extensão que mantém o contador em dia.
 *
 * O critério é o **DOM do painel**, não estado interno (ver abordagem 3 acima).
 * Uma transação pode abrir o painel e construir o DOM depois do listener, daí o
 * retrabalho único: ele cobre essa corrida sem varrer o documento a cada quadro.
 */
export function searchCount() {
  let agendado = false;
  const tentar = (view: EditorView) => {
    if (!view.dom.isConnected) return;
    const painel = view.dom.querySelector(".cm-search");
    if (!painel) {
      if (agendado) return;
      agendado = true;
      setTimeout(() => {
        agendado = false;
        tentar(view);
      }, 0);
      return;
    }
    escreverContador(view);
  };

  return EditorView.updateListener.of((update) => {
    tentar(update.view);
  });
}