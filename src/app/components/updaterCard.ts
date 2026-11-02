import type { InstallBlocker, UpdaterState } from "../../services/updater";

/**
 * As decisões de tela do cartão de atualização — visibilidade e texto — sem
 * JSX.
 *
 * **Por que existe:** o cartão é `.tsx`, e o runner de teste deste projeto é o
 * `node:test` com `--experimental-strip-types`, que remove tipo mas não
 * transforma JSX — componente não é executável num teste. O que dá para provar,
 * e é o que a revisão cobrou, é **a decisão**: em que estado o bloqueador
 * aparece, o que cada código diz e o que a tela promete em cada plataforma. O
 * JSX só consome estas funções; que ele as consuma é vigiado pelo
 * `lifecycleWiring.test.ts`.
 *
 * **Cor, tamanho e layout ficam no componente.** Aqui só há o que se pode
 * afirmar sem olhar a tela.
 */

export type Tr = (pt: string, en: string, es: string) => string;

/**
 * Em que estados o bloqueador de instalação aparece.
 *
 * O bloqueador responde "por que a última tentativa não começou", então ele só
 * faz sentido onde **tentar de novo é possível**: em `ready` (o pacote está
 * baixado e o botão Instalar existe) e em `error` de `install-failed` (a
 * tentativa anterior não lançou, e a tela oferece outra). Mostrá-lo em
 * `downloading` ou em `error` de download falaria de um pedido que não está em
 * jogo.
 */
export function showsInstallBlocker(state: UpdaterState): boolean {
  if (!state.installBlocker) return false;
  if (state.status === "ready") return true;
  return state.status === "error" && state.error?.code === "install-failed";
}

/**
 * Por que o reinício não foi autorizado, em linguagem de tela.
 *
 * O tipo é fechado (`InstallBlocker`), e é ele que faz o interruptor funcionar:
 * um código novo do coordenador faz o `switch` deixar de ser exaustivo e
 * **reprova no typecheck** até alguém escrever o texto. Com `string`, o código
 * novo caía no genérico em silêncio.
 */
export function describeBlocker(blocker: InstallBlocker, tr: Tr): string {
  switch (blocker) {
    case "cancelled":
      return tr("Reinício cancelado.", "Restart cancelled.", "Reinicio cancelado.");
    case "not_released":
      return tr(
        "Um documento não terminou de ser gravado.",
        "A document could not finish saving.",
        "Un documento no terminó de guardarse."
      );
    case "pending_flush_failed":
      return tr(
        "Uma alteração prometida não chegou ao disco.",
        "A promised change did not reach disk.",
        "Un cambio prometido no llegó al disco."
      );
    case "preflight-failed":
      return tr(
        "A sessão não pôde ser preparada para reiniciar.",
        "The session could not be prepared to restart.",
        "La sesión no pudo prepararse para reiniciar."
      );
  }
}

/**
 * O que a tela promete enquanto instala.
 *
 * A frase muda com a plataforma porque o mecanismo muda: no Windows o
 * instalador encerra o app e abre a versão nova; fora dele o pacote é trocado no
 * disco e quem sobe o app é o `relaunch()`. Dizer a mesma frase nos dois casos
 * prometeria, num deles, o que não acontece.
 */
export function describeInstalling(state: UpdaterState, tr: Tr): string {
  return state.platform === "windows"
    ? tr(
        "Instalando. O instalador fecha o app e abre a versão nova.",
        "Installing. The installer closes the app and opens the new version.",
        "Instalando. El instalador cierra la app y abre la versión nueva."
      )
    : tr(
        "Instalando. O app fecha e volta sozinho com a versão nova.",
        "Installing. The app closes and comes back on its own with the new version.",
        "Instalando. La app se cierra y vuelve sola con la versión nueva."
      );
}

/**
 * O que a tela diz depois de instalar.
 *
 * Chegar aqui com o app ainda de pé significa que a troca de processo não
 * aconteceu — no Windows o instalador não levou o processo, ou o `relaunch()`
 * falhou. Nos dois casos a instrução é a mesma, e não há o que girar.
 */
export function describeInstalled(state: UpdaterState, tr: Tr): string {
  if (state.error?.code === "relaunch-failed") {
    return tr(
      "Atualização instalada, mas o app não conseguiu reiniciar sozinho. Feche e abra o Mark-Lee para usar a versão nova.",
      "Update installed, but the app could not restart on its own. Close and open Mark-Lee to run the new version.",
      "Actualización instalada, pero la app no pudo reiniciarse sola. Cierre y abra Mark-Lee para usar la versión nueva."
    );
  }
  return tr(
    "Atualização instalada. Feche e abra o Mark-Lee para usar a versão nova.",
    "Update installed. Close and open Mark-Lee to run the new version.",
    "Actualización instalada. Cierre y abra Mark-Lee para usar la versión nueva."
  );
}
