import assert from "node:assert/strict";
import test from "node:test";

import type { UpdaterState } from "../../services/updater.ts";
import {
  describeBlocker,
  describeInstalled,
  describeInstalling,
  showsInstallBlocker,
  type Tr,
} from "./updaterCard.ts";

/* Seam: a **decisão de tela** do cartão de atualização — em que estado o
 * bloqueador de instalação aparece e o que cada código diz.
 *
 * Por que aqui, e não renderizando o componente: o cartão é `.tsx`, e o runner
 * deste projeto (`node:test` + `--experimental-strip-types`) remove tipo mas não
 * transforma JSX — nenhum componente é executável num teste. O que a revisão
 * cobrou é justamente a condição que estava errada: o bloqueador era renderizado
 * só em `ready`, e uma recusa do preflight na **retentativa** (que acontece em
 * `error`/`install-failed`) ficava invisível. Essa condição é uma função, e é
 * ela que este arquivo prova; que o cartão a use é vigiado pelo
 * `lifecycleWiring.test.ts`.
 */

/** O tradutor dos testes: devolve o português, que é o texto comparado aqui. */
const tr: Tr = (pt) => pt;

function state(patch: Partial<UpdaterState> = {}): UpdaterState {
  return {
    status: "ready",
    platform: "unix",
    currentVersion: "1.8.3",
    version: "1.9.0",
    notes: null,
    checkedAt: 1,
    receivedBytes: 0,
    totalBytes: null,
    error: null,
    installBlocker: null,
    ...patch,
  };
}

test("o bloqueador aparece em ready e na retentativa de uma instalação que falhou", () => {
  // O caso da B3: depois de `install-failed` a tela oferece "Tentar instalar de
  // novo", e uma recusa do preflight nessa tentativa precisa aparecer.
  assert.equal(
    showsInstallBlocker(state({ status: "ready", installBlocker: "cancelled" })),
    true,
    "a recusa sumiu do estado em que a instalação é possível"
  );
  assert.equal(
    showsInstallBlocker(
      state({
        status: "error",
        error: { code: "install-failed", message: "o instalador não abriu" },
        installBlocker: "pending_flush_failed",
      })
    ),
    true,
    "a recusa na retentativa ficou invisível: a tela mostraria só a falha antiga"
  );
});

test("o bloqueador não aparece onde não há instalação em jogo", () => {
  assert.equal(showsInstallBlocker(state({ status: "ready" })), false, "sem recusa não há o que dizer");
  assert.equal(
    showsInstallBlocker(state({ status: "downloading", installBlocker: "cancelled" })),
    false,
    "mostrou o motivo de uma recusa enquanto baixa"
  );
  assert.equal(
    showsInstallBlocker(
      state({
        status: "error",
        error: { code: "download-failed", message: "conexão caiu" },
        installBlocker: "cancelled",
      })
    ),
    false,
    "misturou falha de download com recusa de reinício"
  );
  assert.equal(
    showsInstallBlocker(state({ status: "installing", installBlocker: "cancelled" })),
    false,
    "mostrou recusa depois que a instalação começou"
  );
});

test("cada motivo de recusa tem texto próprio, e nenhum é vazio", () => {
  const textos = (["cancelled", "not_released", "pending_flush_failed", "preflight-failed"] as const).map(
    (blocker) => describeBlocker(blocker, tr)
  );

  for (const texto of textos) assert.ok(texto.trim().length > 0, "motivo sem tradução");
  assert.equal(new Set(textos).size, textos.length, "dois motivos diferentes dizem a mesma frase");
});

test("a promessa enquanto instala muda com a plataforma", () => {
  const windows = describeInstalling(state({ status: "installing", platform: "windows" }), tr);
  const unix = describeInstalling(state({ status: "installing", platform: "unix" }), tr);

  assert.notEqual(windows, unix, "as duas plataformas prometem o mesmo mecanismo de reinício");
  assert.match(windows, /instalador/, "no Windows quem reinicia é o instalador");
  assert.ok(!/instalador/.test(unix), "fora do Windows quem reinicia é o app, não o instalador");
});

test("depois de instalar, a tela diz o que fazer em vez de girar", () => {
  const normal = describeInstalled(state({ status: "installed" }), tr);
  const semReinicio = describeInstalled(
    state({ status: "installed", error: { code: "relaunch-failed", message: "plugin process indisponível" } }),
    tr
  );

  assert.match(normal, /instalada/i);
  assert.equal(/reiniciar sozinho/.test(normal), false, "prometeu um reinício que não vai acontecer");
  assert.match(semReinicio, /não conseguiu reiniciar sozinho/, "o relançamento que falhou sumiu da tela");
});
