# Mark-Lee Desktop

**Mark-Lee** é um editor Markdown nativo para Windows, focado em escrita sem distrações, performance e design elegante.

![Mark-Lee Logo](/src-tauri/icons/icon.png)

## Funcionalidades

- **Modo Zen**: Interface minimalista que foca no seu texto.
- **Preview em Tempo Real**: Veja como seu documento ficará enquanto digita.
- **Temas**: Claro, Escuro, Midnight e Sépia.
- **Exportação PDF**: Gere documentos formatados prontos para compartilhar.
- **Nativo**: Integração com sistema de arquivos e atalhos globais do Windows.

## Desenvolvimento

### Pré-requisitos

- Node.js 18+
- Rust (Stable)
- C++ Build Tools (Windows)

### Comandos

```bash
# Instalar dependências
npm install

# Rodar em modo de desenvolvimento (Hot Reload)
npm run tauri dev

# Gerar build de produção (Instalador .exe/.msi)
npm run tauri build
```

## Estrutura do Projeto

- `/src`: Frontend React + TypeScript
- `/src-tauri`: Backend Rust
  - `/src-tauri/src/commands`: Comandos de sistema de arquivos seguros

---
Desenvolvido com Tauri v2.
