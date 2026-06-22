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
