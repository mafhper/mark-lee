#!/usr/bin/env node
/**
 * Evictor de cache das pull requests fechadas.
 *
 * O `actions/cache` — e todo wrapper que o usa, como `swatinem/rust-cache` — não
 * tem input de retenção no caller: não existe `retention-days` para declarar num
 * workflow que usa a ação. A entrada morre pelo TTL do GitHub, e o cache de uma
 * PR já fechada fica parado no ref `refs/pull/<n>/merge` — um ref que não roda
 * mais, que ninguém lê e que continua ocupando a cota do repositório.
 *
 * Este script é o evictor que falta: lista, decide e (com `--apply`) apaga. Duas
 * garantias, nesta ordem:
 *
 * 1. `--apply` é obrigatório para apagar. Sem a flag, o script lista, decide e
 *    imprime o plano — um erro de digitação no workflow não apaga nada.
 * 2. Estado da PR desconhecido = cache preservado. O filtro é fail-closed:
 *    qualquer ref que não seja `refs/pull/<n>/merge` (branch, tag, `.../head`),
 *    qualquer PR aberta e qualquer número cujo estado a API não respondeu
 *    ficam de fora. "Não sei" nunca vira "apaga".
 *
 * A decisão vive em `planEvictions`, que é pura — é o que os testes exercitam
 * com dados mock, sem tocar em API nem em rede.
 */

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const PULL_MERGE_REF = /^refs\/pull\/(\d+)\/merge$/;
const DEFAULT_LIMIT = 2000;
const BYTES_PER_MB = 1024 * 1024;

/**
 * O número da PR embutido num ref, ou `null` quando o ref não é de PR merge.
 *
 * @param {unknown} ref
 * @returns {number | null}
 */
export function pullNumberFromRef(ref) {
  const match = PULL_MERGE_REF.exec(typeof ref === "string" ? ref.trim() : "");
  if (!match) return null;
  const pullNumber = Number(match[1]);
  return Number.isSafeInteger(pullNumber) && pullNumber > 0 ? pullNumber : null;
}

function readState(prStates, pullNumber) {
  if (prStates instanceof Map) return prStates.get(pullNumber) ?? "unknown";
  if (prStates && typeof prStates === "object") return prStates[pullNumber] ?? "unknown";
  return "unknown";
}

/**
 * Separa os caches em "apagar" e "preservar", com o motivo de cada um.
 *
 * @param {Array<{ id: number | string, ref?: string, key?: string, sizeInBytes?: number }>} caches
 * @param {Map<number, "open" | "closed" | "merged" | "unknown"> | Record<number, "open" | "closed" | "merged" | "unknown">} prStates
 * @returns {{ evict: Array<{ cache: object, reason: string }>, keep: Array<{ cache: object, reason: string }> }}
 */
export function planEvictions(caches, prStates) {
  const evict = [];
  const keep = [];

  for (const cache of Array.isArray(caches) ? caches : []) {
    const pullNumber = pullNumberFromRef(cache?.ref);
    if (pullNumber === null) {
      keep.push({ cache, reason: "ref-not-a-pr-merge" });
      continue;
    }

    const state = readState(prStates, pullNumber);
    if (state === "open") {
      keep.push({ cache, reason: "pr-open" });
      continue;
    }
    if (state !== "closed" && state !== "merged") {
      keep.push({ cache, reason: "pr-state-unknown" });
      continue;
    }

    evict.push({ cache, reason: state === "merged" ? "pr-merged" : "pr-closed" });
  }

  return { evict, keep };
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function firstLine(value) {
  return String(value ?? "").trim().split("\n")[0];
}

function megabytes(bytes) {
  return `${(Number(bytes ?? 0) / BYTES_PER_MB).toFixed(1)} MB`;
}

function readFlag(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} exige um valor`);
  return value;
}

function resolveRepo(explicitRepo) {
  if (explicitRepo) return explicitRepo;
  if (process.env.GH_REPO) return process.env.GH_REPO;
  const resolved = gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!resolved) throw new Error("não foi possível resolver o repositório; passe --repo ou defina GH_REPO");
  return resolved;
}

function readCaches(repo, limit) {
  const output = gh([
    "cache",
    "list",
    "--repo",
    repo,
    "--limit",
    String(limit),
    "--json",
    "id,ref,key,sizeInBytes,lastAccessedAt",
  ]);
  const caches = JSON.parse(output || "[]");
  if (!Array.isArray(caches)) throw new Error("`gh cache list` não devolveu uma lista");
  return caches;
}

/**
 * Estado de uma PR, normalizado. `merged` e `closed` são os únicos valores que
 * autorizam apagar; qualquer falha vira `unknown`, que preserva.
 */
function readPrState(repo, pullNumber) {
  try {
    const output = gh([
      "api",
      `repos/${repo}/pulls/${pullNumber}`,
      "--jq",
      '[.state, (if .merged_at then "merged" else "unmerged" end)] | @tsv',
    ]);
    const [state, merged] = output.split("\t");
    if (state === "open") return "open";
    if (state === "closed") return merged === "merged" ? "merged" : "closed";
    return "unknown";
  } catch (error) {
    console.error(`  ! PR #${pullNumber}: estado indisponível (${firstLine(error.stderr) || error.message})`);
    return "unknown";
  }
}

function main(argv) {
  const apply = argv.includes("--apply");
  const limit = Number(readFlag(argv, "--limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("--limit precisa ser um inteiro positivo");
  const repo = resolveRepo(readFlag(argv, "--repo"));

  console.log(`repo: ${repo}`);
  console.log(`mode: ${apply ? "apply" : "dry-run"}`);

  const caches = readCaches(repo, limit);
  const totalBytes = caches.reduce((sum, cache) => sum + Number(cache.sizeInBytes ?? 0), 0);
  console.log(`caches: ${caches.length} (${megabytes(totalBytes)})`);

  const pullNumbers = [...new Set(caches.map((cache) => pullNumberFromRef(cache.ref)).filter((n) => n !== null))];
  const prStates = new Map(pullNumbers.map((pullNumber) => [pullNumber, readPrState(repo, pullNumber)]));
  console.log(`pull requests referenciadas: ${pullNumbers.length}`);

  const { evict, keep } = planEvictions(caches, prStates);

  for (const { cache, reason } of keep) {
    console.log(`KEEP  ${reason.padEnd(18)} id=${cache.id} ref=${cache.ref} key=${cache.key}`);
  }
  for (const { cache, reason } of evict) {
    console.log(`EVICT ${reason.padEnd(18)} id=${cache.id} ref=${cache.ref} key=${cache.key} ${megabytes(cache.sizeInBytes)}`);
  }

  const evictBytes = evict.reduce((sum, { cache }) => sum + Number(cache.sizeInBytes ?? 0), 0);

  if (!apply) {
    console.log(
      `dry-run: ${evict.length} entrada(s) (${megabytes(evictBytes)}) seriam apagadas, ${keep.length} preservada(s). Nada foi apagado.`,
    );
    return 0;
  }

  let deleted = 0;
  let failed = 0;
  let freedBytes = 0;
  for (const { cache } of evict) {
    try {
      gh(["cache", "delete", String(cache.id), "--repo", repo]);
      deleted += 1;
      freedBytes += Number(cache.sizeInBytes ?? 0);
    } catch (error) {
      failed += 1;
      console.error(`  ! falha ao apagar id=${cache.id}: ${firstLine(error.stderr) || error.message}`);
    }
  }

  console.log(
    `apply: ${deleted} apagada(s) (${megabytes(freedBytes)}), ${failed} falha(s), ${keep.length} preservada(s).`,
  );
  return failed === 0 ? 0 : 1;
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`cache-evictor: ${error.message}`);
    process.exitCode = 1;
  }
}
