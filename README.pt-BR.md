# Mark-Lee

<p align="center">
  <img src="assets/logo.svg" alt="Mark-Lee Logo" width="120" />
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.es.md">Espanol</a>
</p>

Mark-Lee e um editor Markdown desktop projetado para desempenho e foco, unindo tecnologias web modernas com capacidades nativas do sistema operacional atraves do framework Tauri. Ele oferece um ambiente de escrita sem distracoes com renderizacao de preview em tempo real e gerenciamento robusto de arquivos.

![App Screenshot](assets/screen.png)

## Recursos

- **Modo Zen** - A interface desaparece quando voce para de mover o mouse
- **Modo Foco** - Destaque apenas para o paragrafo ativo
- **Rolagem Sincronizada** - Editor e preview se movem juntos
- **Exportacao PDF Profissional** - Layout A4 e tipografia limpa para impressao
- **9 Temas** - Claro, Escuro, Meia-noite, Sepia, Nord, Synthwave, Forest, Coffee, Terminal
- **Produtividade** - Salvamento automatico, Tempo de Leitura e Atalhos Personalizaveis
- **Leve** - Instalador de ~3MB, baixo consumo de memoria
- **Multiplataforma** - Windows, macOS e Linux

## Arquitetura Tecnica

A aplicacao e construida em uma arquitetura hibrida que aproveita o ecossistema de desenvolvimento web mantendo o desempenho e acesso ao sistema de uma aplicacao nativa.

*   **Frontend Core**: Construido com **React 19** e **TypeScript**, garantindo type safety e modularidade de componentes.
*   **Build Tooling**: Usa **Vite 7** para HMR (Hot Module Replacement) rapido e bundling otimizado para producao.
*   **Styling Engine**: Implementa **TailwindCSS 3** para estilizacao utility-first, processado via PostCSS.
*   **Desktop Runtime**: Powered by **Tauri 2 (Rust)**. Esta camada gerencia janelas, IO de sistema de arquivos e dialogos nativos, resultando em binario significativamente menor e menor consumo de memoria comparado a alternativas baseadas em Electron.

## Estrutura do Projeto

```
mark-lee/
├── src/                    # Codigo fonte do frontend React
│   ├── App.tsx            # Componente principal do editor
│   ├── components/        # Elementos de UI reutilizaveis
│   └── services/          # Operacoes de sistema de arquivos
├── src-tauri/             # Backend Rust
│   ├── tauri.conf.json    # Configuracao de janela nativa
│   └── src/               # Arquivos fonte Rust
├── scripts/               # Scripts de automacao Node.js
└── .github/workflows/     # Definicoes de CI/CD
```

## Comecando

### Pre-requisitos

Voce pode verificar e instalar automaticamente a maioria dos requisitos executando nosso script de setup:
```bash
npm run setup
```

**Requisitos Manuais:**
*   Node.js (v18+)
*   Rust (Versao Estavel mais recente)
*   **Usuarios Windows**: [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++").

### Desenvolvimento

1.  **Instalacao**:
    ```bash
    npm install
    npm run setup  # Verifica/instala requisitos do sistema
    ```
2.  **Desenvolvimento Local (Web)**:
    ```bash
    npm run dev
    ```
    Isso inicia o servidor de desenvolvimento Vite para a interface web.

3.  **Desenvolvimento Local (Desktop)**:
    ```bash
    npm run tauri dev
    ```
    Isso lanca a aplicacao na janela nativa do Tauri.

### Build e Release

#### Build Local
Para compilar a aplicacao para producao localmente:

```bash
npm run tauri build
```

O processo de build compila os assets React via Vite e os embute no binario Rust. O executavel final e gerado em `src-tauri/target/release/`.

---

## Versionamento e Release Automatizado

O projeto usa GitHub Actions para automacao completa de builds e releases.

### Criar uma Release

#### 1. Preparar a versao

**Opcao A - Usando o script automatico (recomendado):**
```bash
npm run release -- patch   # 1.0.0 -> 1.0.1 (correcao de bugs)
npm run release -- minor   # 1.0.0 -> 1.1.0 (novos recursos)
npm run release -- major   # 1.0.0 -> 2.0.0 (mudancas significativas)
```

**Opcao B - Atualizacao manual:**
Edite o campo `version` nestes dois arquivos:
- `package.json` (linha 3)
- `src-tauri/tauri.conf.json` (linha 4)

#### 2. Fazer commit das alteracoes

<details>
<summary><strong>Usando Terminal (Git CLI)</strong></summary>

```bash
git add .
git commit -m "chore: release v1.0.1"
git push origin main
```
</details>

<details>
<summary><strong>Usando GitHub Desktop</strong></summary>

1. Abra o **GitHub Desktop**
2. Os arquivos alterados aparecerao no painel esquerdo
3. No canto inferior esquerdo, digite a mensagem de commit: `chore: release v1.0.1`
4. Clique em **Commit to main**
5. Clique em **Push origin** (barra superior)

</details>

#### 3. Criar a Tag de Release

<details>
<summary><strong>Usando Terminal (Git CLI)</strong></summary>

```bash
git tag v1.0.1
git push origin v1.0.1
```
</details>

<details>
<summary><strong>Usando GitHub Desktop + Site do GitHub</strong></summary>

O GitHub Desktop nao suporta criar tags diretamente. Use um destes metodos:

**Metodo 1 - Via Site do GitHub:**
1. Va ao seu repositorio no GitHub.com
2. Clique em **Releases** (barra lateral direita)
3. Clique em **Draft a new release**
4. Em "Choose a tag", digite `v1.0.1` e clique em **Create new tag**
5. Preencha o titulo da release: `Mark-Lee v1.0.1`
6. Clique em **Publish release**
7. Nota: Isso vai disparar o build imediatamente (pule o passo 4)

**Metodo 2 - Comando rapido no Terminal:**
Abra qualquer terminal na pasta do projeto e execute:
```bash
git tag v1.0.1 && git push origin v1.0.1
```

</details>

#### 4. Aguardar o GitHub Actions

Apos fazer push da tag, o GitHub Actions automaticamente:
- Compila para **Windows** (.exe, .msi)
- Compila para **macOS** (.app)
- Compila para **Linux** (.deb, .AppImage)
- Cria um **Draft Release** com todos os instaladores anexados

Obs.: O pacote **.dmg** roda em job opcional e nao bloqueante. Se falhar no macOS runner, a release principal continua valida com `.app`.

Voce pode monitorar o progresso do build em: `https://github.com/SEU_USUARIO/mark-lee/actions`

Tempo de build: aproximadamente 10-15 minutos para todas as plataformas.

#### 5. Publicar a Release

1. Va em **GitHub -> Releases** (`/releases` no seu repo)
2. Encontre o **Draft** release criado pelo workflow
3. Clique em **Edit** (icone de lapis)
4. Adicione notas de release descrevendo o que mudou
5. Clique em **Publish release**

Pronto! Sua release esta no ar e os usuarios podem baixar os instaladores.

---

### Workflows do GitHub Actions

| Workflow | Gatilho | Acao |
|----------|---------|------|
| `release.yml` | Push de tag `v*`, release publicada ou dispatch manual | Compila instaladores principais e tenta DMG opcional no macOS |
| `pages.yml` | Push em `main` | Deploy da versao web no GitHub Pages |

### Configuracao Necessaria no GitHub
1. Va em **Settings -> Actions -> General**
2. Em "Workflow permissions", selecione **Read and write permissions**
3. Marque **Allow GitHub Actions to create and approve pull requests**

---

## Arquivos do Projeto

### Pasta `assets/`
| Arquivo | Uso |
|---------|-----|
| `logo.svg` | Logo principal (README e materiais de divulgacao) |
| `logo-icon.svg` | Fonte do icone para gerar formatos Tauri |
| `logo-bg_blk.svg` | Logo para temas claros (toolbar) |
| `logo-bg_gray.svg` | Logo para temas escuros (toolbar) |
| `screen.png` | Screenshot para documentacao |

---

## Otimizacao de Recursos

A aplicacao implementa varias otimizacoes:

- **Lazy Loading**: ReactMarkdown e carregado apenas quando necessario
- **Debounce de 150ms**: Preview nao atualiza enquanto digita rapido
- **Code Splitting**: React e Markdown sao chunks separados (~4KB gzip cada)
- **Frameless Window**: Menor overhead de renderizacao

### Quando Minimizada
O Tauri/WebView automaticamente reduz o uso de CPU quando a janela nao esta em foco.

---

## Licenca
Este projeto e open source e esta disponivel sob a Licenca MIT.

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

                                 Escreva. Foque. Crie.

```

</p>
