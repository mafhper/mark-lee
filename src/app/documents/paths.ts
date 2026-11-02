/**
 * Relação entre caminhos locais (comparação, não I/O).
 *
 * **Por que existe:** a pergunta "este caminho está dentro daquele?" apareceu em
 * dois lugares que precisam concordar — a origem da aba (`workspace` vs
 * `external`, no app) e a operação destrutiva que não pode apagar por cima de um
 * buffer sujo (`lifecycleCoordinator`). Duas cópias da mesma normalização
 * divergem na primeira correção, e a que sobra é sempre a errada.
 *
 * **Case-insensitive de propósito:** o produto roda primeiro no Windows, onde
 * `C:/Notas/a.md` e `c:/notas/A.md` são o mesmo arquivo. Comparar com
 * sensibilidade a caixa faria a guarda não reconhecer o próprio documento.
 */

/** Forma canônica de comparação: `/`, sem barra final, minúscula. */
export function normalizePathForCompare(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .toLowerCase();
}

/**
 * `candidate` é `container` ou está dentro dele?
 *
 * O prefixo é comparado **com** a barra, para `notas-velhas/a.md` não ser
 * tratado como estando dentro de `notas`. A raiz vazia nunca contém nada — sem
 * essa guarda, um caminho vazio "conteria" todo caminho absoluto.
 */
export function isSameOrInsidePath(container: string, candidate: string): boolean {
  const root = normalizePathForCompare(container);
  const target = normalizePathForCompare(candidate);
  if (!root || !target) return false;
  return target === root || target.startsWith(`${root}/`);
}
