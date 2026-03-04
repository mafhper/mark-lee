# Mark-Lee

<p align="center">
  <img src="assets/logo.svg" alt="Mark-Lee Logo" width="120" />
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.pt-BR.md">Portugues</a>
</p>

Mark-Lee es un editor Markdown de escritorio disenado para rendimiento y concentracion, uniendo tecnologias web modernas con capacidades nativas del sistema operativo a traves del framework Tauri. Ofrece un entorno de escritura sin distracciones con renderizado de vista previa en tiempo real y gestion robusta de archivos.

![App Screenshot](assets/screen.jpg)

## Caracteristicas

- **Modo Zen** - La interfaz desaparece cuando dejas de mover el raton
- **Modo Enfoque** - Efecto de foco destacando solo el parrafo activo
- **Desplazamiento Sincronizado** - Editor y vista previa se mueven juntos
- **Exportacion PDF Profesional** - Diseno A4 con tipografia limpia para impresion
- **9 Temas** - Claro, Oscuro, Medianoche, Sepia, Nord, Synthwave, Forest, Coffee, Terminal
- **Herramientas de Productividad** - Guardado automatico, Tiempo de Lectura y Atajos Personalizables
- **Ligero** - Instalador de ~3MB, bajo consumo de memoria
- **Multiplataforma** - Windows, macOS y Linux

## Arquitectura Tecnica

La aplicacion esta construida sobre una arquitectura hibrida que aprovecha el ecosistema de desarrollo web manteniendo el rendimiento y acceso al sistema de una aplicacion nativa.

*   **Frontend Core**: Construido con **React 19** y **TypeScript**, garantizando seguridad de tipos y modularidad de componentes.
*   **Build Tooling**: Usa **Vite 7** para HMR (Hot Module Replacement) rapido y bundling optimizado para produccion.
*   **Motor de Estilos**: Implementa **TailwindCSS 3** para estilizacion utility-first, procesado via PostCSS.
*   **Runtime de Escritorio**: Powered by **Tauri 2 (Rust)**. Esta capa maneja ventanas, IO de sistema de archivos y dialogos nativos, resultando en un binario significativamente mas pequeno y menor consumo de memoria comparado con alternativas basadas en Electron.

## Estructura del Proyecto

```
mark-lee/
├── src/                    # Codigo fuente del frontend React
│   ├── App.tsx            # Componente principal del editor
│   ├── components/        # Elementos de UI reutilizables
│   └── services/          # Operaciones del sistema de archivos
├── src-tauri/             # Backend Rust
│   ├── tauri.conf.json    # Configuracion de ventana nativa
│   └── src/               # Archivos fuente Rust
├── scripts/               # Scripts de automatizacion Node.js
└── .github/workflows/     # Definiciones de CI/CD
```

## Comenzando

### Requisitos Previos

Puedes verificar e instalar automaticamente la mayoria de los requisitos ejecutando nuestro script de setup:
```bash
npm run setup
```

**Requisitos Manuales:**
*   Node.js (v18+)
*   Rust (Version Estable mas reciente)
*   **Usuarios de Windows**: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++").

### Desarrollo

1.  **Instalacion**:
    ```bash
    npm install
    npm run setup  # Verifica/instala requisitos del sistema
    ```
2.  **Desarrollo Local (Web)**:
    ```bash
    npm run dev
    ```
    Esto inicia el servidor de desarrollo Vite para la interfaz web.

3.  **Desarrollo Local (Escritorio)**:
    ```bash
    npm run tauri dev
    ```
    Esto lanza la aplicacion en la ventana nativa de Tauri.

### Build y Release

Para compilar la aplicacion para produccion localmente:

```bash
npm run tauri build
```

El proceso de build compila los assets de React via Vite y los embebe en el binario de Rust. El ejecutable final se genera en `src-tauri/target/release/`.

## Licencia

Este proyecto es open source y esta disponible bajo la Licencia MIT.

---

<p align="center">

```
                          Escribe. Enfocate. Crea.
```

</p>
