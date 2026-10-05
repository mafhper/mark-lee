import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { EditorView } from "@codemirror/view";
import { subscribeActiveEditor } from "./active-editor";

/**
 * Diz se o painel de busca do CodeMirror está aberto **agora**.
 *
 * Existe porque o painel é estado do CodeMirror, não do React: guardar um booleano
 * no React e virá-lo no handler do botão funciona até alguém abrir a busca por
 * outro caminho — e o primeiro caminho é o `Ctrl+F`, que é justamente o atalho
 * que a gente mais usa. O botão ficaria com `aria-pressed` mentindo.
 *
 * Por que `MutationObserver` e não `EditorView.updateListener`: o listener exige
 * que o editor seja criado **com** ele, e o editor é montado noutro componente,
 * longe deste. Observer na DOM do editor pega o painel aparecendo e sumindo sem
 * tocar na construção do editor — inclusive quando o `Escape` fecha, que é um
 * caminho que nenhum estado do React enxergaria.
 *
 * A classe é `cm-search`, e **não** `cm-search-panel`: a primeira versão sondava
 * `cm-search-panel`, que não existe na biblioteca, e o `aria-pressed` ficava
 * `false` com o painel aberto na tela. Só a sonda com o nome certo pegou.
 *
 * E a view chega por **assinatura**, não por ref: `viewRef.current` muda sem que
 * o `ref` mude de identidade, então depender de `[viewRef]` observava a primeira
 * view para sempre. Era o mesmo sintoma, por um caminho diferente.
 */
export function useSearchPanelOpen(viewRef: RefObject<EditorView | null>): boolean {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    /* O `desligar` é um **ponteiro**, não um valor: cada troca de view cria um
       observador novo, e o cleanup precisa desligar o observador **atual** — não
       o primeiro. Capturar a função de cleanup numa variável faria o desmonte
       desligar sempre o observador original, e o novo continuaria vivo
       escrevendo em estado de um componente morto. */
    let desligar: (() => void) | null = null;

    const observar = (view: EditorView | null) => {
      desligar?.();
      desligar = null;
      if (!view) {
        setAberto(false);
        return;
      }
      const ler = () => setAberto(!!view.dom.querySelector(".cm-search"));
      ler();
      const observador = new MutationObserver(ler);
      observador.observe(view.dom, { childList: true, subtree: true });
      desligar = () => observador.disconnect();
    };

    observar(viewRef.current);
    const pararAssinatura = subscribeActiveEditor(observar);

    return () => {
      pararAssinatura();
      desligar?.();
    };
  }, [viewRef]);

  return aberto;
}