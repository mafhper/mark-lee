<a href="https://mafhper.github.io/mark-lee/" >
  <img alt="Mark-Lee" src="assets/bg-hero.webp" />
</a>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.pt-BR.md">Português</a>
</p>

**Escribe lo que necesitas. Guarda lo que importa.**

Mark-Lee es un editor Markdown de escritorio y un espacio de memorias construidos
sobre **los mismos archivos locales**. Sin cuenta, sin formato cerrado, sin servidor
obligatorio. Abre una carpeta, escribe con precision y vuelve a encontrar el mismo
contenido por tiempo y lugar.

<p align="center">
  <a href="https://mafhper.github.io/mark-lee/">Sitio</a> ·
  <a href="#download">Descargar</a> ·
  <a href="#desarrollo">Compilar desde el codigo</a>
</p>

---

## Un archivo, dos contextos

Los dos modos no son productos separados que se sincronizan entre si. Son dos maneras
de mirar el mismo Markdown en tu disco — nada se convierte, se duplica ni queda
atrapado en un formato propietario.

| | **Editor** | **Memorias** |
|---|---|---|
| Para | Trabajar con precision | Redescubrir las cosas con contexto |
| Abre | Una carpeta o archivo | Una carpeta local, leida como cuaderno |
| Entrega | Espacio de trabajo, pestanas, busqueda, vista dividida | Entradas fechadas por tiempo, lugar, animo y etiquetas |
| Termina en | Publicacion — PDF o Markdown | Una lectura calma, con el tema que elijas |

---

## Editor

- **Espacio de trabajo** — abre una carpeta y navegala desde una barra lateral; pestanas,
  busqueda y snippets mantienen el contexto a mano
- **Dividido** — edita y lee el documento renderizado a la vez, con desplazamiento
  sincronizado
- **Modo Zen** — la interfaz desaparece dejas de mover el raton
- **Paleta de comandos** — toda accion alcanzable con el teclado
- **Exportacion a PDF** — disposicion A4 con tipografia limpia
- **12 temas** — light, dark, midnight, sepia, nord, synthwave, neomatrix, forest,
  coffee, golden, firenight, terminal
- **Guardado automatico** — intervalo configurable, con los cambios sin guardar marcados
  en cada pestana
- **pt-BR · en-US · es-ES** — la interfaz viene en tres idiomas

## Memorias

Un modo local-first de diario sobre Markdown plano con front-matter YAML.

- **Cuadernos y entradas** — una carpeta se convierte en un cuaderno; cada entrada fechada
  es un archivo
- **Cuatro vistas** — lista, calendario, galeria de fotos y un mapa de lugares
- **Metadatos ricos** — imagen de portada, animo, etiquetas, ubicacion, favoritos y tus
  propios marcadores numericos/booleanos/texto, resumidos por dia, semana o mes
- **Vista de lectura** — disposicion de blog con navegacion anterior/siguiente, respetando
  el tema
- **Pomodoro** — temporizador flotante con un bloqueo opcional de descanso
- **Resiliente** — escrituras atomicas, copias de seguridad, importacion tolerante a CRLF
  y proteccion de la ruta de recursos
- **Acciones rapidas** — clic derecho en cualquier entrada para abrir, marcar como
  favorita, duplicar, editar o eliminar

## Download

Windows, macOS y Linux, desde la [pagina de releases](https://github.com/mafhper/mark-lee/releases).

---

## Con que esta hecho

Una carcasa nativa con un nucleo web moderno — binario pequeno, poca memoria, acceso real
a archivos.

- **Tauri 2** (Rust) — ventana, sistema de archivos, dialogos nativos, observacion de
  archivos
- **React 19** + **TypeScript** — interfaz y estado
- **Vite 8** — servidor de desarrollo y empaquetado de produccion
- **Tailwind CSS 3** — estilos
- **CodeMirror 6** — el editor
- **Leaflet** — la vista de mapa en Memorias

Tambien funciona en un navegador normal: las llamadas de archivo y de dialogo recurren
a implementaciones web, asi que la interfaz se puede explorar con `npm run dev`.

---

## Desarrollo

**Requisitos**

- Node.js **22.22.0** (fijado en CI)
- Rust (stable)
- Windows: [MSVC Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  con la carga "Desktop development with C++"

```bash
npm install
npm run setup   # verifica e instala los requisitos del sistema
```

**Ejecutar**

```bash
npm run dev        # solo el navegador, Vite en :5280
npm run tauri:dev  # la ventana de escritorio
```

**Comprobar**

```bash
npm run build            # tsc + vite build — esto es el typecheck
npm run contrast:check   # contraste de los temas, tambien en CI
npm run test:ui-layout   # regresion de disposicion (Playwright)
```

Las pruebas unitarias son archivos `*.test.ts` junto al codigo, ejecutados por el runner
nativo de Node:

```bash
node --experimental-strip-types --test src/features/journal/domain/entry.test.ts
```

No hay script "ejecutar todo" — el CI lista cada suite de forma explicita.

**Release**

`npm run release -- patch|minor|major` sube la version en los tres archivos que la
contienen (`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`), actualiza
el titulo de la ventana y anade la entrada al changelog.

Despues: **branch → PR → merge → tag → push.** `main` esta protegido; solo una etiqueta
`v*` dispara un release. El workflow es un simple llamador — el protocolo vive en
[`release-core`](https://github.com/mafhper/release-core), y este repositorio solo guarda
el contrato en `.github/release.config.json`.

---

## Estructura

```
mark-lee/
├── src/
│   ├── App.tsx            # orquestador de editor + memorias
│   ├── app/               # infra generica: paleta de comandos, markdown, hooks
│   ├── features/          # modulos de funcion; journal/ se divide por papel
│   ├── services/          # puentes de archivo y almacenamiento (Tauri + fallback web)
│   └── translations.ts    # pt-BR (predeterminado) · en-US · es-ES
├── src-tauri/             # Rust: archivos, carga de imagenes, observacion
├── apps/site/             # sitio de presentacion (package.json propio, rutas por idioma)
├── assets/                # logos y la imagen de apertura del README
└── .github/               # CI, release, pages, dependency guard
```

`src/features/journal/` mantiene la logica de dominio en TypeScript puro — parsers,
serializadores y tipos con sufijo de papel y libres de React, que es lo que los hace
comprobables sin navegador.

---

## Licencia

MIT — consulta [LICENSE](LICENSE).

---

<p align="center">

```
__/\\\\____________/\\\\____________________________________________
 _\/\\\\\\________/\\\\\\_______________________________/\\\_________
   _\/\\\//\\\____/\\\//\\\______________________________\/\\\_________
    _\/\\\\///\\\/\\\/_\/\\\__/\\\\\\\\\_____/\\/\\\\\\\__\/\\\\\\\\____
     _\/\\\__\///\\\/___\/\\\_\////////\\\___\/\\\/////\\\_\/\\\////\\\__
      _\/\\\____\///_____\/\\\___/\\\\\\\\\\__\/\\\___\///__\/\\\\\\\\/___
       _\/\\\_____________\/\\\__/\\\/////\\\__\/\\\_________\/\\\///\\\___
        _\/\\\_____________\/\\\_\//\\\\\\\\/\\_\/\\\_________\/\\\_\///\\\_
         _\///______________\///___\////////\//__\///__________\///____\///__
__/\\\___________________________________________
 _\/\\\___________________________________________
  _\/\\\___________________________________________
   _\/\\\_________________/\\\\\\\\______/\\\\\\\\__
    _\/\\\_______________/\\\/////\\\___/\\\/////\\\_
     _\/\\\______________/\\\\\\\\\\\___/\\\\\\\\\\\__
      _\/\\\_____________\//\\///////___\//\\///////___
       _\/\\\\\\\\\\\\\\\__\//\\\\\\\\\\__\//\\\\\\\\\\_
        _\///////////////____\//////////____\//////////__
```

</p>
