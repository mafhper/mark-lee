import { useSyncExternalStore } from "react";

import { updaterService, type UpdaterState } from "../../services/updater";

/**
 * Liga a tela ao estado do updater.
 *
 * A instância é a **da sessão** (`updaterService`), e não uma por componente:
 * a paleta e os Ajustes precisam ver o mesmo `available`/`ready`, senão a
 * mesma atualização aparece duas vezes e o download de uma some na outra.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o serviço já é a
 * fonte da verdade e continua vivo fora do React — o estado sobrevive ao
 * fechamento do painel, que é justamente quando o download termina.
 */
export function useUpdater(): {
  state: UpdaterState;
  check: () => void;
  download: () => void;
  cancel: () => void;
} {
  const state = useSyncExternalStore(updaterService.subscribe, updaterService.getState, updaterService.getState);

  return {
    state,
    check: () => {
      void updaterService.check();
    },
    download: () => {
      void updaterService.download();
    },
    cancel: () => updaterService.cancel(),
  };
}
