import { useSyncExternalStore } from "react";

import {
  updaterService,
  type InstallOutcome,
  type RestartPreflight,
  type UpdaterState,
} from "../../services/updater";

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
 *
 * `install` recebe a licença de reinício **como argumento**, e não faz parte do
 * que a tela guarda: quem sabe se a sessão pode terminar é o coordenador, que
 * vive na App. A tela só repassa.
 */
export function useUpdater(): {
  state: UpdaterState;
  check: () => void;
  download: () => void;
  install: (preflight: RestartPreflight) => Promise<InstallOutcome>;
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
    install: (preflight) => updaterService.install(preflight),
    cancel: () => updaterService.cancel(),
  };
}
