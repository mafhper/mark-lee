import assert from "node:assert/strict";
import test from "node:test";

import {
  BOOT_CHECK_DELAY_MS,
  CHECK_TIMEOUT_MS,
  DOWNLOAD_TIMEOUT_MS,
  createUpdaterService,
  type CheckedUpdate,
  type UpdaterClient,
  type UpdaterState,
} from "./updater.ts";

/* Seam: o **contrato do updater** — quais transições o app pode observar e
 * quando a rede é tocada. Nada de React, nada de Tauri, nada de `invoke`: o
 * cliente é o par externo que o serviço recebe, e é ele que fala com o plugin.
 *
 * O que estes testes protegem, em ordem de dano:
 *
 * 1. **Baixar exige consentimento.** Um `download()` fora do estado `available`
 *    não pode chamar o cliente — baixar binário sem o usuário pedir é o defeito
 *    que o ML-H06 existe para não ter.
 * 2. **A checagem de boot roda uma vez.** Duplo mount do React (StrictMode) não
 *    pode virar duas requisições; a trava é do serviço, não do efeito.
 * 3. **Cancelar uma checagem não vira "disponível".** O resultado tardio é
 *    ignorado, senão a tela oferece baixar o que a pessoa já dispensou.
 */

interface FakeCalls {
  check: Array<{ timeout: number }>;
  download: Array<{ update: CheckedUpdate; timeout: number }>;
  close: CheckedUpdate[];
  install: CheckedUpdate[];
}

function createFakeClient(options: {
  checkResult?: () => CheckedUpdate | null;
  checkError?: () => Error;
  downloadError?: () => Error;
  installError?: () => Error;
  onDownload?: (emit: (progress: { receivedBytes: number; totalBytes: number | null }) => void) => void;
} = {}) {
  const calls: FakeCalls = { check: [], download: [], close: [], install: [] };

  const client: UpdaterClient = {
    async check({ timeout }) {
      calls.check.push({ timeout });
      if (options.checkError) throw options.checkError();
      return options.checkResult ? options.checkResult() : null;
    },
    async download(update, onProgress, { timeout }) {
      calls.download.push({ update, timeout });
      if (options.downloadError) throw options.downloadError();
      options.onDownload?.(onProgress);
    },
    async close(update) {
      calls.close.push(update);
    },
    async install(update) {
      calls.install.push(update);
      if (options.installError) throw options.installError();
    },
  };

  return { client, calls };
}

function createHarness(
  clientOptions: Parameters<typeof createFakeClient>[0] = {},
  overrides: { supported?: () => boolean; online?: () => boolean } = {}
) {
  const { client, calls } = createFakeClient(clientOptions);
  const statuses: string[] = [];
  let clock = 0;
  const service = createUpdaterService({
    client,
    supported: overrides.supported ?? (() => true),
    online: overrides.online ?? (() => true),
    now: () => clock,
  });
  service.subscribe((state) => {
    // Só as **transições**: o progresso emite vários estados com o mesmo
    // status, e repetir "downloading" na lista não diz nada sobre a ordem.
    if (statuses[statuses.length - 1] !== state.status) statuses.push(state.status);
  });
  return {
    service,
    calls,
    statuses,
    advance(ms: number) {
      clock += ms;
    },
    state(): UpdaterState {
      return service.getState();
    },
  };
}

const update: CheckedUpdate = {
  version: "1.9.0",
  currentVersion: "1.8.3",
  notes: "Notas da 1.9.0",
};

test("checagem com atualização disponível passa por checking e expõe a versão anunciada", async () => {
  const harness = createHarness({ checkResult: () => update });

  await harness.service.check();

  assert.deepEqual(harness.statuses, ["checking", "available"]);
  assert.equal(harness.state().status, "available");
  assert.equal(harness.state().version, "1.9.0");
  assert.equal(harness.state().currentVersion, "1.8.3");
  assert.equal(harness.state().notes, "Notas da 1.9.0");
});

test("checagem sem atualização volta para idle e registra quando foi checada", async () => {
  const harness = createHarness({ checkResult: () => null });
  harness.advance(1_000);

  await harness.service.check();

  assert.deepEqual(harness.statuses, ["checking", "idle"]);
  assert.equal(harness.state().checkedAt, 1_000);
});

test("a checagem usa o timeout declarado", async () => {
  const harness = createHarness({ checkResult: () => null });

  await harness.service.check();

  assert.deepEqual(harness.calls.check, [{ timeout: CHECK_TIMEOUT_MS }]);
});

test("baixar sem consentimento não toca a rede", async () => {
  const harness = createHarness({ checkResult: () => update });

  await harness.service.download();

  assert.equal(harness.calls.download.length, 0);
  assert.equal(harness.state().status, "idle");
});

test("instalar fora do estado ready não chega ao cliente nem com preflight permissivo", async () => {
  // O primeiro portão é o consentimento: `ready` só existe depois de dois
  // pedidos explícitos (checar e baixar). Instalar a partir de `available`
  // seria instalar um binário que ninguém mandou baixar.
  const harness = createHarness({ checkResult: () => update });
  let preflights = 0;
  const permissive = async () => {
    preflights += 1;
    return { allowed: true };
  };

  await harness.service.check();
  const outcome = await harness.service.install(permissive);

  assert.equal(outcome.installed, false);
  assert.equal(outcome.blocker, "not-consented");
  assert.equal(harness.calls.install.length, 0);
  assert.equal(preflights, 0, "perguntou ao coordenador uma licença que não seria usada");
  assert.equal(harness.state().status, "available", "recusar não pode consumir a atualização anunciada");
});

test("baixar depois da checagem vai de downloading a ready com progresso", async () => {
  const harness = createHarness({
    checkResult: () => update,
    onDownload: (emit) => {
      emit({ receivedBytes: 0, totalBytes: 1_000 });
      harness.advance(200);
      emit({ receivedBytes: 400, totalBytes: 1_000 });
      harness.advance(200);
      emit({ receivedBytes: 1_000, totalBytes: 1_000 });
    },
  });

  await harness.service.check();
  await harness.service.download();

  assert.deepEqual(harness.statuses, ["checking", "available", "downloading", "ready"]);
  assert.equal(harness.state().version, "1.9.0");
  assert.equal(harness.state().receivedBytes, 1_000);
  assert.equal(harness.state().totalBytes, 1_000);
  assert.deepEqual(harness.calls.download, [{ update, timeout: DOWNLOAD_TIMEOUT_MS }]);
});

test("falha no download vira error de download e não vira ready", async () => {
  const harness = createHarness({
    checkResult: () => update,
    downloadError: () => new Error("assinatura inválida"),
  });

  await harness.service.check();
  await harness.service.download();

  assert.equal(harness.state().status, "error");
  assert.equal(harness.state().error?.code, "download-failed");
  assert.equal(harness.state().error?.message, "assinatura inválida");
});

test("preflight que recusa não instala e deixa o pacote pronto para outra tentativa", async () => {
  // O segundo portão. Recusar não pode custar o download: o pacote continua em
  // `ready`, e o motivo fica visível para a tela dizer por quê.
  const harness = createHarness({ checkResult: () => update });
  await harness.service.check();
  await harness.service.download();
  assert.equal(harness.state().status, "ready");

  const refused = await harness.service.install(async () => ({ allowed: false, blocker: "cancelled" }));

  assert.equal(refused.installed, false);
  assert.equal(refused.blocker, "preflight-refused");
  assert.equal(harness.calls.install.length, 0);
  assert.equal(harness.state().status, "ready");
  assert.equal(harness.state().installBlocker, "cancelled");

  const second = await harness.service.install(async () => ({ allowed: true }));
  assert.equal(second.installed, true);
  assert.equal(harness.calls.install.length, 1, "a recusa consumiu a tentativa em vez da atualização");
});

test("preflight que estoura conta como recusa", async () => {
  const harness = createHarness({ checkResult: () => update });
  await harness.service.check();
  await harness.service.download();

  const outcome = await harness.service.install(async () => {
    throw new Error("coordenador indisponível");
  });

  assert.equal(outcome.blocker, "preflight-refused");
  assert.equal(harness.calls.install.length, 0);
  assert.equal(harness.state().status, "ready", "um preflight quebrado encerrou a atualização");
});

test("com os dois portões abertos, o preflight roda antes da instalação", async () => {
  const events: string[] = [];
  const harness = createHarness({ checkResult: () => update });
  const original = harness.calls.install;
  await harness.service.check();
  await harness.service.download();

  const outcome = await harness.service.install(async () => {
    events.push(`preflight:${harness.state().status}`);
    return { allowed: true };
  });
  events.push(`install:${original.length}`);

  assert.equal(outcome.installed, true);
  assert.deepEqual(events, ["preflight:ready", "install:1"], "instalou antes de perguntar se podia");
  assert.deepEqual(harness.calls.install, [update]);
  assert.equal(harness.state().status, "installing");
});

test("instalação que falha vira error de instalação e aceita nova tentativa", async () => {
  let fail = true;
  const { client, calls } = createFakeClient({ checkResult: () => update });
  client.install = async (target) => {
    calls.install.push(target);
    if (fail) throw new Error("o instalador não abriu");
  };
  const service = createUpdaterService({ client, supported: () => true, online: () => true, now: () => 0 });

  await service.check();
  await service.download();
  const first = await service.install(async () => ({ allowed: true }));

  assert.equal(first.installed, false);
  assert.equal(first.blocker, "install-failed");
  assert.equal(service.getState().status, "error");
  assert.equal(service.getState().error?.code, "install-failed");

  fail = false;
  const second = await service.install(async () => ({ allowed: true }));
  assert.equal(second.installed, true);
  assert.equal(calls.install.length, 2);
});

test("clicar Instalar duas vezes não instala duas vezes", async () => {
  const harness = createHarness({ checkResult: () => update });
  await harness.service.check();
  await harness.service.download();

  const preflight = async () => ({ allowed: true });
  const [first, second] = await Promise.all([
    harness.service.install(preflight),
    harness.service.install(preflight),
  ]);

  assert.equal(first.installed, true);
  assert.equal(second.installed, true);
  assert.equal(harness.calls.install.length, 1, "o segundo clique lançou outro instalador");
});

test("instalar sem ter baixado não instala, mesmo com preflight permissivo", async () => {
  const harness = createHarness({ checkResult: () => update });
  await harness.service.check();

  const outcome = await harness.service.install(async () => ({ allowed: true }));

  assert.equal(outcome.blocker, "not-consented");
  assert.equal(harness.calls.install.length, 0);
});

test("depois de um download que falhou, a retentativa é permitida", async () => {
  let fail = true;
  const { client, calls } = createFakeClient({ checkResult: () => update });
  client.download = async (updated) => {
    calls.download.push({ update: updated, timeout: DOWNLOAD_TIMEOUT_MS });
    if (fail) throw new Error("conexão caiu");
  };
  const service = createUpdaterService({
    client,
    supported: () => true,
    online: () => true,
    now: () => 0,
  });

  await service.check();
  await service.download();
  assert.equal(service.getState().status, "error");

  fail = false;
  await service.download();

  assert.equal(service.getState().status, "ready");
  assert.equal(calls.download.length, 2);
});

test("cancelar a checagem descarta o resultado tardio", async () => {
  let resolveCheck = (_value: CheckedUpdate | null) => {};
  const pending = new Promise<CheckedUpdate | null>((resolve) => {
    resolveCheck = resolve;
  });
  const service = createUpdaterService({
    client: {
      check: async () => pending,
      download: async () => {},
      close: async () => {},
    },
    supported: () => true,
    online: () => true,
    now: () => 0,
  });

  const started = service.check();
  service.cancel();
  resolveCheck(update);
  await started;

  assert.equal(service.getState().status, "cancelled");
  assert.equal(service.getState().version, null);
});

test("sem rede a checagem reporta offline sem chamar o cliente", async () => {
  const harness = createHarness({ checkResult: () => update }, { online: () => false });

  await harness.service.check();

  assert.equal(harness.state().status, "offline");
  assert.equal(harness.calls.check.length, 0);
});

test("fora do runtime Tauri a checagem reporta plataforma não suportada", async () => {
  const harness = createHarness({ checkResult: () => update }, { supported: () => false });

  await harness.service.check();

  assert.equal(harness.state().status, "unsupported-platform");
  assert.equal(harness.calls.check.length, 0);
});

test("erro de transporte vira offline; erro do feed vira error", async () => {
  const transport = createHarness({
    checkError: () => new Error("error sending request for url: dns error"),
  });
  await transport.service.check();
  assert.equal(transport.state().status, "offline");

  const feed = createHarness({ checkError: () => new Error("manifesto sem assinatura") });
  await feed.service.check();
  assert.equal(feed.state().status, "error");
  assert.equal(feed.state().error?.code, "check-failed");
});

test("a checagem de boot agenda uma vez só, com o atraso declarado", async () => {
  const { client, calls } = createFakeClient({ checkResult: () => null });
  const tasks: Array<() => void> = [];
  const delays: number[] = [];
  const service = createUpdaterService({
    client,
    supported: () => true,
    online: () => true,
    now: () => 0,
    schedule: (task, delayMs) => {
      tasks.push(task);
      delays.push(delayMs);
      return () => {
        const index = tasks.indexOf(task);
        if (index >= 0) tasks.splice(index, 1);
      };
    },
  });

  service.scheduleBootCheck();
  service.scheduleBootCheck();
  assert.equal(tasks.length, 1);
  assert.deepEqual(delays, [BOOT_CHECK_DELAY_MS]);

  tasks[0]();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(calls.check.length, 1);
  assert.equal(service.getState().status, "idle");

  // Depois de rodar, um novo agendamento não refaz a requisição.
  service.scheduleBootCheck();
  assert.equal(tasks.length, 0);
  assert.equal(delays.length, 1);
});

test("a checagem manual desarma a de boot", async () => {
  const { client, calls } = createFakeClient({ checkResult: () => null });
  const tasks: Array<() => void> = [];
  const service = createUpdaterService({
    client,
    supported: () => true,
    online: () => true,
    now: () => 0,
    schedule: (task) => {
      tasks.push(task);
      return () => {
        const index = tasks.indexOf(task);
        if (index >= 0) tasks.splice(index, 1);
      };
    },
  });

  service.scheduleBootCheck();
  assert.equal(tasks.length, 1);

  await service.check();
  assert.equal(tasks.length, 0);

  service.scheduleBootCheck();
  assert.equal(tasks.length, 0);
  assert.equal(calls.check.length, 1);
});
