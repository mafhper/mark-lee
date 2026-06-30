import { RELEASES_URL, REPO_URL, SiteCopy } from "@/i18n/types";

export const ptBRCopy: SiteCopy = {
  languageName: "Português",
  languageSwitcherLabel: "Idioma",
  nav: {
    home: "Produto",
    gallery: "Experiência",
    engineering: "Engenharia",
    contributing: "Contribuir",
    faq: "FAQ",
    editor: "Editor",
    memories: "Memórias",
    localFirst: "Local-first",
    primaryAriaLabel: "Navegação principal",
    mobileAriaLabel: "Menu móvel",
  },
  downloadLabel: "Baixar",
  githubLabel: "GitHub",
  openMenuAria: "Abrir menu principal",
  closeMenuAria: "Fechar menu principal",
  footer: {
    description: "Editor e Memórias para escrever, organizar e reencontrar arquivos Markdown locais.",
    copyright: "© 2026 · Open source · Licença MIT",
    groups: [
      {
        title: "Produto",
        links: [
          { label: "Editor", section: "editor" },
          { label: "Memórias", section: "memorias" },
          { label: "Local-first", section: "local" },
        ],
      },
      {
        title: "Projeto",
        links: [
          { label: "Experiência", page: "gallery" },
          { label: "Engenharia", page: "engineering" },
          { label: "Contribuir", page: "contributing" },
        ],
      },
      {
        title: "Ajuda",
        links: [
          { label: "FAQ", page: "faq" },
          { label: "Baixar", page: "downloads" },
        ],
      },
      {
        title: "Código",
        links: [
          { label: "GitHub", href: REPO_URL, external: true },
          { label: "Releases", href: RELEASES_URL, external: true },
        ],
      },
    ],
  },
  notFound: {
    title: "Página não encontrada",
    description: "Este caminho não existe.",
    cta: "Voltar ao início",
  },
  redirecting: "Redirecionando para seu idioma...",
  pages: {
    home: {
      hero: {
        label: "Editor + Memórias, no seu computador",
        title: "Escreva o que precisa. Guarde o que importa.",
        description:
          "O Mark-Lee reúne um editor Markdown completo e um espaço de Memórias sobre os mesmos arquivos locais — sem conta, formato fechado ou servidor obrigatório.",
        primaryCta: "Baixar Mark-Lee",
        secondaryCta: "Ver os dois contextos",
        note: "Windows, macOS e Linux · Open source · Licença MIT",
      },
      continuity: {
        label: "Um arquivo, dois ritmos",
        title: "Um arquivo. Dois contextos.",
        description:
          "Trabalhe com precisão no Editor e reencontre o mesmo conteúdo em Memórias. Nada é convertido, duplicado ou preso a um formato proprietário.",
        editorLabel: "Editar com precisão",
        memoriesLabel: "Reencontrar com contexto",
      },
      editor: {
        label: "Editor",
        title: "Precisão para trabalhar.",
        description:
          "Abra uma pasta, mantenha seus documentos em contexto e avance da escrita à publicação sem trocar de ferramenta.",
        highlights: [
          "Workspace, abas e busca para não perder contexto",
          "Markdown e preview lado a lado",
          "Comandos, snippets, temas e exportação",
        ],
      },
      memories: {
        label: "Memórias",
        title: "Contexto para reencontrar.",
        description:
          "Transforme pastas locais em cadernos vivos, com registros organizados por tempo, lugar, imagem e aquilo que você escolhe acompanhar.",
        highlights: [
          "Cadernos, registros e templates",
          "Calendário, Lugares, mapa e galeria",
          "Pins configuráveis e leitura editorial",
        ],
      },
      localProof: {
        label: "Local por princípio",
        title: "Seus arquivos continuam sendo seus.",
        description:
          "O Mark-Lee trabalha com pastas e arquivos legíveis no seu computador. Você escolhe onde guardar, sincronizar ou publicar.",
        folderLabel: "meu-workspace",
        files: ["projetos/roadmap.md", "memorias/ensaio-acustico-noturno.md", "assets/por-do-sol.jpg"],
        principles: [
          { title: "Markdown aberto", description: "Arquivos comuns, portáveis e editáveis fora do app." },
          { title: "Sem conta", description: "Comece com uma pasta, sem cadastro obrigatório." },
          { title: "Offline", description: "Escrita e organização essenciais funcionam sem rede." },
          { title: "Open source", description: "Código aberto e licença MIT, sem caixa-preta." },
        ],
      },
      closingCta: {
        title: "Comece com uma pasta.",
        description: "Baixe o Mark-Lee e escolha o que merece ser escrito — ou lembrado.",
        primaryCta: "Baixar Mark-Lee",
        secondaryCta: "Ver código no GitHub",
      },
    },
    gallery: {
      hero: {
        label: "Experiência visual real",
        title: "Tema, preview e foco.",
        description: "A interface muda com seu estilo, sem perder legibilidade.",
      },
      themesSection: {
        label: "Temas",
        title: "Escolha a paleta do seu ritmo",
        description: "Compare temas e contraste.",
        items: [
          {
            name: "Firenight",
            description: "Âmbar escuro para sessões longas e contraste forte.",
            colors: ["#1b0f0d", "#2a1713", "#1b0f0d", "#ffe1bf", "#ffb86c"],
          },
          {
            name: "Forest",
            description: "Verde profundo com leitura confortável.",
            colors: ["#17241b", "#203124", "#17241b", "#e8fbe9", "#90f0a8"],
          },
          {
            name: "Golden",
            description: "Dourado quente com destaque em títulos.",
            colors: ["#f4d49a", "#e7be73", "#f4d49a", "#1e1308", "#2a1808"],
          },
          {
            name: "Light",
            description: "Tema claro para ambientes bem iluminados.",
            colors: ["#ffffff", "#f9fafb", "#ffffff", "#0f172a", "#4f46e5"],
          },
          {
            name: "Neomatrix",
            description: "Estética terminal com verde neon.",
            colors: ["#040b04", "#061207", "#040b04", "#8afcc7", "#57ff9e"],
          },
          {
            name: "Nord",
            description: "Azuis frios equilibrados para foco contínuo.",
            colors: ["#2E3440", "#262f40", "#2E3440", "#ECEFF4", "#88C0D0"],
          },
        ],
      },
      previewSection: {
        label: "Customize",
        title: "Encontre a sua maneira de usar a aplicação",
        description: "Cada bloco mostra um cenário claro.",
        items: [
          {
            label: "Presets",
            title: "Presets - Ajuste a pré-visualização",
            description: "Use presets, crie novos e ajuste o fluxo.",
            visual: "preview",
          },
          {
            label: "Concentração",
            title: "Modo foco simplificado",
            description: "Interface limpa com texto centralizado.",
            visual: "focus",
          },
          {
            label: "Navegação",
            title: "Abas e workspace com contexto",
            description: "Pastas detalhadas sem perder contexto do app.",
            visual: "workspace",
          },
          {
            label: "Exportação",
            title: "Exporte sem sair do fluxo",
            description: "Markdown, HTML e PDF no mesmo painel, com saída previsível.",
            visual: "export",
          },
        ],
      },
      ctaSection: {
        title: "Gostou da experiência visual?",
        description: "Baixe a versão atual ou veja o código no GitHub.",
        primaryCta: "Baixar",
        secondaryCta: "Repositório",
      },
    },
    engineering: {
      hero: {
        label: "Arquitetura e entrega",
        title: "Interface e código em camadas.",
        description: "Decisões técnicas para manter performance e evolução contínua.",
      },
      architectureSection: {
        label: "Arquitetura",
        title: "Como o Mark-Lee é construído",
        description: "Camadas claras entre UI, bridge e núcleo nativo.",
        flowTitle: "Fluxo de dados",
        flowLabels: {
          ui: "React UI",
          preview: "Preview",
          bridge: "Tauri IPC",
          core: "Rust Core",
          filesystem: "File System",
          flow: "Fluxo",
        },
        layers: [
          {
            name: "Interface (React + TypeScript)",
            description: "Estado, componentes e renderização",
            colorClass: "bg-primary/20 border-primary/30 text-primary",
          },
          {
            name: "Bridge (Tauri Commands)",
            description: "IPC entre frontend e backend",
            colorClass: "bg-secondary border-border/50 text-muted-foreground",
          },
          {
            name: "Core (Rust)",
            description: "Filesystem, parsing e exportação",
            colorClass: "bg-secondary/60 border-border/40 text-muted-foreground",
          },
          {
            name: "Sistema Operacional",
            description: "WebView2, processos e integrações",
            colorClass: "bg-secondary/30 border-border/30 text-muted-foreground/60",
          },
        ],
      },
      stackSection: {
        label: "Stack",
        title: "Tecnologias principais",
        description: "Cada escolha técnica atende um objetivo claro.",
        items: [
          {
            title: "React 19 + TypeScript",
            description: "UI modular com tipagem forte para manter contratos estáveis.",
            tags: ["UI", "Type-safe", "Modular"],
          },
          {
            title: "Rust + Tauri",
            description: "Núcleo nativo com foco em segurança de memória e binário enxuto.",
            tags: ["Native", "Memory-safe", "Fast"],
          },
          {
            title: "Tailwind CSS",
            description: "Tokens visuais consistentes para evitar CSS ad-hoc.",
            tags: ["Tokens", "Utility", "Consistent"],
          },
          {
            title: "Vite",
            description: "Build rápido e ciclo curto de feedback no desenvolvimento.",
            tags: ["HMR", "ESM", "Fast builds"],
          },
          {
            title: "WebView2",
            description: "Renderização moderna no Windows com baixo footprint.",
            tags: ["Windows", "Native", "Lightweight"],
          },
        ],
      },
      recentCommitsSection: {
        label: "Código vivo",
        title: "Últimos commits do repositório",
        description: "Atualizado em runtime com o estado atual do projeto.",
        emptyMessage: "Ainda não há commits disponíveis para exibir.",
        viewAllLabel: "Ver histórico completo",
      },
      ctaSection: {
        title: "Quer acompanhar a evolução técnica?",
        description: "Baixe a versão estável ou veja as mudanças no repositório.",
        primaryCta: "Baixar",
        secondaryCta: "Repositório",
      },
    },
    contributing: {
      hero: {
        label: "Fluxo open source",
        title: "Contribua com clareza.",
        description: "Do bug ao PR aprovado, com processo simples.",
        flowTitle: "Fluxo de contribuição",
        flowSteps: ["Issue", "Branch", "Commit", "PR", "Merge"],
        testsLabel: "Testes passando",
        buildLabel: "Build aprovado",
      },
      stepsSection: {
        label: "Começar",
        title: "Colabore sem travar review",
        githubCta: "Abrir no GitHub",
        items: [
          {
            step: "01",
            title: "Abra issues com contexto",
            description: "Inclua cenário, passos de reprodução e resultado esperado.",
          },
          {
            step: "02",
            title: "Crie mudanças pequenas",
            description: "PRs menores facilitam review e reduzem regressões.",
          },
          {
            step: "03",
            title: "Documente o que mudou",
            description: "Explique intenção, impacto e validações executadas.",
          },
        ],
      },
      guideSection: {
        label: "Diretrizes",
        title: "Base para colaboração",
        items: [
          {
            title: "Acessibilidade não é opcional",
            description: "Foco visível, contraste AA e navegação por teclado.",
          },
          {
            title: "Consistência visual",
            description: "Reaproveite tokens e componentes antes de novas variações.",
          },
          {
            title: "Performance prática",
            description: "Evite dependências e efeitos sem ganho claro ao usuário.",
          },
        ],
      },
      qualitySection: {
        label: "Qualidade de código",
        title: "Padrão esperado no projeto",
        description: "Legibilidade e validação local antes do PR.",
        principles: [
          {
            title: "Código legível e coeso",
            description: "Funções curtas, nomes claros e responsabilidades separadas.",
          },
          {
            title: "Cobertura de cenários críticos",
            description: "Valide build, tipagem e smoke para evitar regressões.",
          },
          {
            title: "Escopo enxuto por PR",
            description: "Evite misturar refactor amplo com mudança funcional.",
          },
        ],
        scriptsTitle: "Scripts úteis do projeto",
        scripts: [
          { command: "npm run site:dev", description: "Roda o promo-site localmente." },
          { command: "npm run site:check", description: "Valida tipagem TypeScript do site." },
          { command: "npm run site:build", description: "Gera build de produção (inclui 404 fallback)." },
          { command: "npm run site:test:smoke", description: "Executa smoke browser nas rotas principais." },
          { command: "npm run build", description: "Build da aplicação desktop principal." },
        ],
      },
    },
    faq: {
      hero: {
        label: "Suporte e dúvidas comuns",
        title: "Respostas diretas para seguir escrevendo.",
        description: "Instalação, uso e publicação sem rodeios.",
      },
      poemSnippet: {
        lines: ["No meio do caminho tinha uma pedra", "tinha uma pedra no meio do caminho"],
        credit: "Trecho de Carlos Drummond de Andrade",
      },
      sections: [
        {
          title: "Instalação",
          items: [
            {
              question: "A primeira abertura demora mais?",
              answer: "Sim. A primeira execução prepara runtime e cache; depois abre mais rápido.",
            },
            {
              question: "SmartScreen bloqueou o instalador. O que fazer?",
              answer: "Clique em 'Mais informações' e depois em 'Executar assim mesmo'.",
            },
            {
              question: "Preciso instalar algo além do app?",
              answer: "Não. O pacote já traz as dependências necessárias para rodar.",
            },
          ],
        },
        {
          title: "Editor e preview",
          items: [
            {
              question: "A busca aceita regex e diferencia maiúsculas?",
              answer: "Sim. Use busca simples ou avançada com substituição.",
            },
            {
              question: "Como evitar imagem quebrada no preview?",
              answer: "Use caminho relativo ao arquivo markdown para manter o vínculo correto.",
            },
            {
              question: "Posso personalizar atalhos?",
              answer: "Ainda não, mas já está no radar do projeto.",
            },
          ],
        },
        {
          title: "Publicação",
          items: [
            {
              question: "Quais formatos são suportados?",
              answer: "Markdown, HTML e PDF no mesmo fluxo de exportação.",
            },
            {
              question: "Dá para exportar mais de um arquivo?",
              answer: "Sim, com seleção em lote no workspace.",
            },
          ],
        },
      ],
    },
    downloads: {
      hero: {
        label: "Downloads estáveis",
        title: "Baixe a última versão.",
        description: "Links automáticos para o asset estável mais recente.",
      },
      section: {
        title: "Downloads por plataforma",
        buttonLabel: "Baixar",
        fallbackLabel: "Ver release",
        items: [
          { platform: "windows", name: "Windows", status: "Instalador estável" },
          { platform: "macos", name: "macOS", status: "Pacote estável" },
          { platform: "linux", name: "Linux", status: "Build estável" },
        ],
      },
    },
  },
};
