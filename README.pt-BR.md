<a href="https://mafhper.github.io/mark-lee/" >
  <img alt="Mark-Lee" src="assets/bg-hero.webp" />
</a>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.es.md">Español</a>
</p>

**Escreva o que precisa. Guarde o que importa.**

O Mark-Lee é um editor Markdown desktop e um espaço de memórias construídos sobre **os
mesmos arquivos locais**. Sem conta, sem formato fechado, sem servidor obrigatório.
Abra uma pasta, escreva com precisão, e reencontre o mesmo conteúdo por tempo e lugar.

![Mark-Lee](assets/bg-hero.webp)

![Editor do Mark-Lee](assets/screen.png)

<p align="center">
  <a href="https://mafhper.github.io/mark-lee/">Site</a> ·
  <a href="#download">Download</a> ·
  <a href="#desenvolvimento">Compilar do código</a>
</p>

---

## Um arquivo, dois contextos

Os dois modos não são produtos separados que se sincronizam entre si. São duas
maneiras de olhar o mesmo Markdown no seu disco — nada é convertido, duplicado ou
prendido a um formato proprietário.

| | **Editor** | **Memórias** |
|---|---|---|
| Para | Trabalhar com precisão | Reencontrar as coisas com contexto |
| Abre | Uma pasta ou arquivo | Uma pasta local, lida como caderno |
| Entrega | Workspace, abas, busca, preview lado a lado | Registros datados por tempo, lugar, humor e tags |
| Termina em | Publicação — PDF ou Markdown | Uma leitura calma, no tema da sua escolha |

---

## Editor

- **Workspace** — abra uma pasta e navegue por ela numa barra lateral; abas, busca e
  snippets mantêm o contexto ao alcance
- **Lado a lado** — edite e leia o documento renderizado ao mesmo tempo, com rolagem
  sincronizada
- **Modo Zen** — a interface desaparece quando você para de mexer no mouse
- **Paleta de comandos** — toda ação alcançável pelo teclado
- **Exportação em PDF** — layout A4 com tipografia limpa
- **12 temas** — light, dark, midnight, sepia, nord, synthwave, neomatrix, forest,
  coffee, golden, firenight, terminal
- **Salvamento automático** — intervalo configurável, com alterações não salvas marcadas
  em cada aba
- **pt-BR · en-US · es-ES** — a interface vem em três idiomas

## Memórias

Um modo local-first de diário sobre Markdown puro com front-matter YAML.

- **Cadernos e registros** — uma pasta vira um caderno; cada registro datado é um arquivo
- **Quatro visões** — lista, calendário, galeria de fotos e um mapa de lugares
- **Metadados ricos** — imagem de capa, humor, tags, localização, favoritos e os seus
  próprios marcadores numéricos/booleanos/texto, resumidos por dia, semana ou mês
- **Visão de leitura** — layout de blog com navegação anterior/próxima, respeitando o tema
- **Pomodoro** — timer flutuante com trava opcional de intervalo
- **Resiliente** — escritas atômicas, backups, importação tolerante a CRLF e proteção do
  caminho dos assets
- **Ações rápidas** — botão direito em qualquer registro para abrir, favoritar,
  duplicar, editar ou excluir

## Download

Windows, macOS e Linux, na [página de releases](https://github.com/mafhper/mark-lee/releases).

---

## Feito com

Um shell nativo com um núcleo web moderno — binário pequeno, memória baixa, acesso real
a arquivos.

- **Tauri 2** (Rust) — janela, sistema de arquivos, diálogos nativos, observation de arquivos
- **React 19** + **TypeScript** — interface e estado
- **Vite 8** — servidor de desenvolvimento e build de produção
- **Tailwind CSS 3** — estilos
- **CodeMirror 6** — o editor
- **Leaflet** — a visão de mapa nas Memórias

Também roda em um navegador comum: as chamadas de arquivo e diálogo caem para
implementações web, então a interface é explorável com `npm run dev`.

---

## Desenvolvimento

**Pré-requisitos**

- Node.js **22.22.0** (fixado no CI)
- Rust (stable)
- Windows: [MSVC Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  com a carga "Desktop development with C++"

```bash
npm install
npm run setup   # verifica e instala os requisitos de sistema
```

**Rodar**

```bash
npm run dev        # só o navegador, Vite na :5280
npm run tauri:dev  # a janela desktop
```

**Verificar**

```bash
npm run build            # tsc + vite build — é o typecheck
npm run contrast:check   # contraste dos temas, também no CI
npm run test:ui-layout   # regressão de layout (Playwright)
```

Os testes unitários são arquivos `*.test.ts` ao lado do código, rodados pelo runner
nativo do Node:

```bash
node --experimental-strip-types --test src/features/journal/domain/entry.test.ts
```

Não existe script "rodar tudo" — o CI lista cada suíte explicitamente.

**Release**

`npm run release -- patch|minor|major` sobe a versão nos três arquivos que a carregam
(`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`), atualiza o título
da janela e acrescenta a entrada no changelog.

Depois: **branch → PR → merge → tag → push.** A `main` é protegida; apenas uma tag `v*`
dispara release. O workflow é apenas um chamador — o protocolo mora no
[`release-core`](https://github.com/mafhper/release-core), e este repositório guarda
apenas o contrato em `.github/release.config.json`.

---

## Estrutura

```
mark-lee/
├── src/
│   ├── App.tsx            # orquestrador de editor + memórias
│   ├── app/               # infra genérica: paleta de comandos, markdown, hooks
│   ├── features/          # módulos de função; journal/ é separado por papel
│   ├── services/          # pontes de arquivo e armazenamento (Tauri + fallback web)
│   └── translations.ts    # pt-BR (padrão) · en-US · es-ES
├── src-tauri/             # Rust: arquivos, carregamento de imagem, observação
├── apps/site/             # site de apresentação (package.json próprio, rotas por idioma)
├── assets/                # logos e a captura do README
└── .github/               # CI, release, pages, dependency guard
```

`src/features/journal/` mantém a lógica de domínio em TypeScript puro — parsers,
serializers e tipos com sufixo de papel e livres de React, que é o que os torna
testáveis sem navegador.

---

## Licença

MIT — veja [LICENSE](LICENSE).

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
