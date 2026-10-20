import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";
import { planEvictions, pullNumberFromRef } from "./cache-evictor.mjs";

const cache = (id, ref, sizeInBytes = 1024 * 1024) => ({ id, ref, key: `key-${id}`, sizeInBytes });

const ids = (entries) => entries.map(({ cache: entry }) => entry.id);
const reasons = (entries) => entries.map(({ reason }) => reason);

test("apaga cache de PR mergeada e de PR fechada sem merge", () => {
  const { evict, keep } = planEvictions(
    [cache(1, "refs/pull/10/merge"), cache(2, "refs/pull/11/merge")],
    new Map([
      [10, "merged"],
      [11, "closed"],
    ]),
  );

  assert.deepEqual(ids(evict), [1, 2]);
  assert.deepEqual(reasons(evict), ["pr-merged", "pr-closed"]);
  assert.deepEqual(keep, []);
});

test("preserva cache de PR aberta", () => {
  const { evict, keep } = planEvictions([cache(7, "refs/pull/42/merge")], new Map([[42, "open"]]));

  assert.deepEqual(evict, []);
  assert.deepEqual(ids(keep), [7]);
  assert.deepEqual(reasons(keep), ["pr-open"]);
});

test("preserva cache quando o estado da PR é desconhecido", () => {
  // Duas formas do mesmo "não sei": a API respondeu `unknown` e a PR nem chegou
  // a ser consultada. Nenhuma das duas autoriza apagar.
  const { evict, keep } = planEvictions(
    [cache(1, "refs/pull/50/merge"), cache(2, "refs/pull/51/merge")],
    new Map([[50, "unknown"]]),
  );

  assert.deepEqual(evict, []);
  assert.deepEqual(ids(keep), [1, 2]);
  assert.deepEqual(reasons(keep), ["pr-state-unknown", "pr-state-unknown"]);
});

test("preserva branch, tag e ref de PR que não é merge", () => {
  const { evict, keep } = planEvictions(
    [
      cache(1, "refs/heads/main"),
      cache(2, "refs/heads/chore/alguma-coisa"),
      cache(3, "refs/tags/v1.6.2"),
      cache(4, "refs/pull/42/head"),
      cache(5, undefined),
      cache(6, ""),
    ],
    new Map([
      [42, "closed"],
      [1, "closed"],
    ]),
  );

  assert.deepEqual(evict, []);
  assert.deepEqual(ids(keep), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(new Set(reasons(keep)), new Set(["ref-not-a-pr-merge"]));
});

test("pullNumberFromRef só aceita refs/pull/<n>/merge", () => {
  assert.equal(pullNumberFromRef("refs/pull/233/merge"), 233);
  assert.equal(pullNumberFromRef(" refs/pull/7/merge "), 7);
  assert.equal(pullNumberFromRef("refs/pull/7/head"), null);
  assert.equal(pullNumberFromRef("refs/heads/main"), null);
  assert.equal(pullNumberFromRef("refs/pull/7/merge/extra"), null);
  assert.equal(pullNumberFromRef("refs/pull//merge"), null);
  assert.equal(pullNumberFromRef(undefined), null);
  assert.equal(pullNumberFromRef(null), null);
});

test("lista vazia não produz nada para apagar", () => {
  const { evict, keep } = planEvictions([], new Map());
  assert.deepEqual(evict, []);
  assert.deepEqual(keep, []);
});

// --- contrato do workflow ------------------------------------------------
//
// O evictor apaga cache de verdade, então o workflow em si é parte do teste: um
// `--all` reintroduzido, um `actions: write` a mais ou um dry-run que deixou de
// ser o padrão do disparo manual não aparecem em nenhum outro portão.

const workflowSource = readFileSync(".github/workflows/cache-cleanup.yml", "utf8");
const workflow = parse(workflowSource);
const trigger = workflow.on ?? workflow[true] ?? {};
const permissions = workflow.permissions ?? {};

test("o evictor roda semanalmente e sob demanda", () => {
  assert.equal(trigger.schedule?.length, 1, "esperado um único agendamento");
  const cron = trigger.schedule[0].cron;
  const fields = String(cron).trim().split(/\s+/);
  assert.equal(fields.length, 5, `cron inválido: ${cron}`);
  assert.notEqual(fields[4], "*", `cron precisa ser semanal, não diário: ${cron}`);

  const dispatch = trigger.workflow_dispatch;
  assert.ok(dispatch, "workflow_dispatch é necessário para rodar o evictor fora do agendamento");
  assert.equal(dispatch.inputs?.dry_run?.default, true, "disparo manual precisa nascer em dry-run");
});

test("o workflow tem o mínimo de permissão que o evictor precisa", () => {
  assert.equal(permissions.actions, "write", "`gh cache delete` exige actions: write");
  assert.equal(permissions.contents, "read");
  assert.equal(permissions["pull-requests"], "read", "sem pull-requests: read o estado da PR vira 403");

  const writes = Object.entries(permissions)
    .filter(([, level]) => level === "write")
    .map(([scope]) => scope);
  assert.deepEqual(writes, ["actions"], `escopo de escrita inesperado: ${writes.join(", ")}`);
});

test("o workflow nunca usa delete em lote", () => {
  // `gh cache delete --all` apaga tudo do repositório. O evictor apaga por id,
  // um a um, depois de o filtro aprovar — e é isso que precisa continuar true.
  assert.ok(!workflowSource.includes("--all"), "`--all` apaga cache fora do escopo de PR fechada");
  assert.match(workflowSource, /scripts\/cache-evictor\.mjs/, "o workflow precisa chamar o evictor testado");
  assert.match(workflowSource, /args\+=\(--apply\)/, "--apply precisa existir para o agendado apagar");
  assert.match(workflowSource, /GH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
});

test("o header documenta por que a retenção é delete, e não retention-days", () => {
  assert.match(workflowSource, /retention-days/, "o header precisa dizer que o caller não tem esse input");
  assert.match(workflowSource, /TTL/);
});
