# Mark-Lee

<p align="center">
  <img src="assets/logo.svg" alt="Mark-Lee Logo" width="120" />
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.pt-BR.md">Portugues</a> |
  <a href="README.es.md">Espanol</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.zh.md">中文</a> |
  <a href="README.ja.md">日本語</a>
</p>

Mark-Lee est un editeur Markdown de bureau concu pour la performance et la concentration, alliant les technologies web modernes aux capacites natives du systeme d'exploitation grace au framework Tauri. Il offre un environnement d'ecriture sans distraction avec un rendu d'apercu en temps reel et une gestion robuste des fichiers.

![App Screenshot](assets/screen.jpg)

## Fonctionnalites

- **Mode Zen** - L'interface disparait lorsque vous cessez de bouger la souris
- **Mode Focus** - Effet de projecteur mettant en valeur uniquement le paragraphe actif
- **Defilement Synchronise** - L'editeur et l'apercu se deplacent ensemble
- **Export PDF Professionnel** - Mise en page A4 avec typographie soignee pour l'impression
- **9 Themes** - Clair, Sombre, Minuit, Sepia, Nord, Synthwave, Forest, Coffee, Terminal
- **Outils de Productivite** - Sauvegarde automatique, Temps de Lecture et Raccourcis Personnalisables
- **Leger** - Installateur de ~3MB, faible empreinte memoire
- **Multiplateforme** - Windows, macOS et Linux

## Architecture Technique

L'application est construite sur une architecture hybride qui exploite l'ecosysteme de developpement web tout en maintenant les performances et l'acces systeme d'une application native.

*   **Frontend Core**: Construit avec **React 19** et **TypeScript**, garantissant la securite des types et la modularite des composants.
*   **Outils de Build**: Utilise **Vite 7** pour un HMR (Hot Module Replacement) rapide et un bundling optimise pour la production.
*   **Moteur de Styles**: Implemente **TailwindCSS 3** pour un style utility-first, traite via PostCSS.
*   **Runtime Desktop**: Propulse par **Tauri 2 (Rust)**. Cette couche gere les fenetres, les E/S du systeme de fichiers et les dialogues natifs, resultant en un binaire significativement plus petit et une empreinte memoire reduite par rapport aux alternatives basees sur Electron.

## Structure du Projet

```
mark-lee/
├── src/                    # Code source du frontend React
│   ├── App.tsx            # Composant principal de l'editeur
│   ├── components/        # Elements d'interface reutilisables
│   └── services/          # Operations du systeme de fichiers
├── src-tauri/             # Backend Rust
│   ├── tauri.conf.json    # Configuration de fenetre native
│   └── src/               # Fichiers source Rust
├── scripts/               # Scripts d'automatisation Node.js
└── .github/workflows/     # Definitions CI/CD
```

## Demarrage

### Prerequis

Vous pouvez verifier et installer automatiquement la plupart des prerequis en executant notre script de setup:
```bash
npm run setup
```

**Prerequis Manuels:**
*   Node.js (v18+)
*   Rust (Derniere version stable)
*   **Utilisateurs Windows**: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++").

### Developpement

1.  **Installation**:
    ```bash
    npm install
    npm run setup  # Verifie/installe les prerequis systeme
    ```
2.  **Developpement Local (Web)**:
    ```bash
    npm run dev
    ```
    Cela demarre le serveur de developpement Vite pour l'interface web.

3.  **Developpement Local (Desktop)**:
    ```bash
    npm run tauri dev
    ```
    Cela lance l'application dans la fenetre native Tauri.

### Build et Release

Pour compiler l'application pour la production localement:

```bash
npm run tauri build
```

Le processus de build compile les assets React via Vite et les integre dans le binaire Rust. L'executable final est genere dans `src-tauri/target/release/`.

## Licence

Ce projet est open source et disponible sous la Licence MIT.

---

<p align="center">

```
                          Ecrivez. Concentrez-vous. Creez.
```

</p>
