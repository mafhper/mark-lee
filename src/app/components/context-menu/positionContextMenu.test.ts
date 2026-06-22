import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMenuPosition, CLAMP_MARGIN } from "./positionContextMenu.ts";

describe("clampMenuPosition", () => {
  it("mantém posição quando cabe na viewport", () => {
    const result = clampMenuPosition(
      { x: 100, y: 100 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    assert.equal(result.x, 100);
    assert.equal(result.y, 100);
  });

  it("clampa na borda direita", () => {
    const result = clampMenuPosition(
      { x: 1200, y: 100 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    assert.equal(result.x, 1280 - 200 - CLAMP_MARGIN);
    assert.equal(result.y, 100);
  });

  it("clampa na borda inferior", () => {
    const result = clampMenuPosition(
      { x: 100, y: 700 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    assert.equal(result.x, 100);
    assert.equal(result.y, 800 - 150 - CLAMP_MARGIN);
  });

  it("clampa na borda superior (y negativo)", () => {
    const result = clampMenuPosition(
      { x: 100, y: -50 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    assert.equal(result.x, 100);
    assert.equal(result.y, CLAMP_MARGIN);
  });

  it("clampa na borda esquerda (x negativo)", () => {
    const result = clampMenuPosition(
      { x: -50, y: 100 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    assert.equal(result.x, CLAMP_MARGIN);
    assert.equal(result.y, 100);
  });

  it("trata menu maior que a viewport — posiciona em margin", () => {
    const result = clampMenuPosition(
      { x: 500, y: 400 },
      { width: 2000, height: 2000 },
      { width: 1280, height: 800 }
    );
    assert.equal(result.x, CLAMP_MARGIN);
    assert.equal(result.y, CLAMP_MARGIN);
  });

  it("respeita margin customizado", () => {
    const margin = 16;
    const result = clampMenuPosition(
      { x: 1200, y: 700 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 },
      margin
    );
    assert.equal(result.x, 1280 - 200 - margin);
    assert.equal(result.y, 800 - 150 - margin);
  });

  it("não produz valores negativos", () => {
    const result = clampMenuPosition(
      { x: -9999, y: -9999 },
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    assert.ok(result.x >= 0);
    assert.ok(result.y >= 0);
  });
});
