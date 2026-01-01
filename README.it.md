# Mark-Lee

<p align="center">
  <img src="assets/logo.svg" alt="Mark-Lee Logo" width="120" />
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.pt-BR.md">Portugues</a> |
  <a href="README.es.md">Espanol</a> |
  <a href="README.fr.md">Francais</a> |
  <a href="README.zh.md">中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

Mark-Lee e un editor Markdown desktop progettato per prestazioni e concentrazione, unendo tecnologie web moderne con capacita native del sistema operativo attraverso il framework Tauri. Offre un ambiente di scrittura senza distrazioni con rendering dell'anteprima in tempo reale e gestione robusta dei file.

![App Screenshot](assets/screen.jpg)

## Funzionalita

- **Modalita Zen** - L'interfaccia scompare quando smetti di muovere il mouse
- **Modalita Focus** - Effetto spotlight che evidenzia solo il paragrafo attivo
- **Scorrimento Sincronizzato** - Editor e anteprima si muovono insieme
- **Esportazione PDF Professionale** - Layout A4 con tipografia pulita per la stampa
- **9 Temi** - Chiaro, Scuro, Mezzanotte, Seppia, Nord, Synthwave, Forest, Coffee, Terminal
- **Strumenti di Produttivita** - Salvataggio automatico, Tempo di Lettura e Scorciatoie Personalizzabili
- **Leggero** - Installer di ~3MB, basso consumo di memoria
- **Multipiattaforma** - Windows, macOS e Linux

## Architettura Tecnica

L'applicazione e costruita su un'architettura ibrida che sfrutta l'ecosistema di sviluppo web mantenendo le prestazioni e l'accesso al sistema di un'applicazione nativa.

*   **Frontend Core**: Costruito con **React 19** e **TypeScript**, garantendo type safety e modularita dei componenti.
*   **Build Tooling**: Usa **Vite 7** per HMR (Hot Module Replacement) veloce e bundling ottimizzato per la produzione.
*   **Motore di Stili**: Implementa **TailwindCSS 3** per styling utility-first, processato via PostCSS.
*   **Runtime Desktop**: Powered by **Tauri 2 (Rust)**. Questo layer gestisce finestre, IO del file system e dialoghi nativi, risultando in un binario significativamente piu piccolo e minor consumo di memoria rispetto alle alternative basate su Electron.

## Struttura del Progetto

```
mark-lee/
├── src/                    # Codice sorgente frontend React
│   ├── App.tsx            # Componente principale dell'editor
│   ├── components/        # Elementi UI riutilizzabili
│   └── services/          # Operazioni del file system
├── src-tauri/             # Backend Rust
│   ├── tauri.conf.json    # Configurazione finestra nativa
│   └── src/               # File sorgente Rust
├── scripts/               # Script di automazione Node.js
└── .github/workflows/     # Definizioni CI/CD
```

## Per Iniziare

### Prerequisiti

Puoi verificare e installare automaticamente la maggior parte dei requisiti eseguendo il nostro script di setup:
```bash
npm run setup
```

**Requisiti Manuali:**
*   Node.js (v18+)
*   Rust (Ultima versione stabile)
*   **Utenti Windows**: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++").

### Sviluppo

1.  **Installazione**:
    ```bash
    npm install
    npm run setup  # Verifica/installa i requisiti di sistema
    ```
2.  **Sviluppo Locale (Web)**:
    ```bash
    npm run dev
    ```
    Questo avvia il server di sviluppo Vite per l'interfaccia web.

3.  **Sviluppo Locale (Desktop)**:
    ```bash
    npm run tauri dev
    ```
    Questo lancia l'applicazione nella finestra nativa Tauri.

### Build e Release

Per compilare l'applicazione per la produzione localmente:

```bash
npm run tauri build
```

Il processo di build compila gli asset React tramite Vite e li incorpora nel binario Rust. L'eseguibile finale viene generato in `src-tauri/target/release/`.

## Licenza

Questo progetto e open source e disponibile sotto la Licenza MIT.

---

<p align="center">

```
                          Scrivi. Concentrati. Crea.
```

</p>
