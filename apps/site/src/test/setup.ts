// `/vitest`, e não a raiz do pacote.
//
// A raiz (`@testing-library/jest-dom`) resolve para `types/index.d.ts`, que
// augmenta o namespace **global `jest`** — e o vitest não lê esse namespace. Os
// matchers então existem em tempo de execução e **não existem para o `tsc`**:
// `toEqual` passa, `toHaveAttribute` e `toBeVisible` viram `TS2339`.
//
// Com o vitest 4 isso passava por acidente; com o **vitest 5** (PR #214) o
// `site:check` reprovou com 13 erros dessa forma. O caminho `/vitest` augmenta
// `interface Assertion` de `vitest`, que é o alvo certo nos dois — e é o que a
// própria documentação do jest-dom manda usar com vitest.
import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverStub,
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  writable: true,
  value: () => null,
});
