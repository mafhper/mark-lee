import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ContextMenuDevHarness from "./app/components/context-menu/ContextMenuDevHarness";
import "./index.css";

// import.meta.env.DEV é false em produção: o Vite elimina o branch morto
// (incluindo o import estático do ContextMenuDevHarness) via tree-shaking.
const isDev = Boolean(import.meta.env.DEV);
const devHarness = new URLSearchParams(window.location.search).get("dev");

if (isDev && devHarness === "context-menu") {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ContextMenuDevHarness />
    </React.StrictMode>,
  );
} else {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// H01 — instrumentação mínima de boot, sem efeito no comportamento.
// input-ready: 1º rAF após o render — o root já commitou e os listeners do React estão
// anexados, então o documento aceita interação. O mount do CodeMirror mora em App.tsx
// (fora do escopo desta medição), logo este é o ponto decidível mais próximo daqui.
// first-paint: 2º rAF — o frame anterior já foi pintado (aproximação usual de first paint).
function markBoot(name: string) {
  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    performance.mark(name);
  }
}

requestAnimationFrame(() => {
  markBoot("mark-lee-first-input-ready");
  requestAnimationFrame(() => markBoot("mark-lee-first-paint"));
});
