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
  },
  downloadLabel: "Downloads",
  githubLabel: "GitHub",
  openMenuAria: "Abrir menu principal",
  closeMenuAria: "Fechar menu principal",
  footer: {
    description: "Editor markdown desktop para escrever e publicar com clareza.",
    copyright: "© 2026 · Open source · Licença MIT",
    groups: [
      {
        title: "Produto",
        links: [
          { label: "Produto", page: "home" },
          { label: "Experiência", page: "gallery" },
          { label: "Engenharia", page: "engineering" },
        ],
      },
      {
        title: "Comunidade",
        links: [
          { label: "Contribuir", page: "contributing" },
          { label: "FAQ", page: "faq" },
          { label: "Issues", href: REPO_URL, external: true },
        ],
      },
      {
        title: "Downloads",
        links: [
          { label: "Baixar", page: "downloads" },
          { label: "Histórico", href: RELEASES_URL, external: true },
        ],
      },
      {
        title: "Repositório",
        links: [{ label: "Ver código", href: REPO_URL, external: true }],
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
        label: "Editor desktop para escrita focada",
        title: "Escreva bem. Publique sem atrito.",
        description: "Edição, preview e exportação no mesmo fluxo.",
      },
      statsSection: {
        label: "Pronto para o dia a dia",
        title: "Tudo para escrever, revisar e entregar.",
        description: "Sem trocar de ferramenta.",
        primaryCta: "Baixar",
        secondaryCta: "Experiência",
        cards: [
          { value: "Markdown", label: "Texto rápido e portável" },
          { value: "Multiplataforma", label: "Windows, macOS e Linux" },
          { value: "Open source", label: "Código aberto, sem caixa-preta" },
          { value: "Leve", label: "Resposta rápida em uso contínuo" },
        ],
      },
      capabilitiesSection: {
        label: "Recursos",
        title: "Ferramentas úteis, sem excesso",
        description: "Cada bloco mantém seu fluxo.",
        items: [
          {
            label: "Escrever",
            title: "Edição markdown focada",
            description: "Atalhos e sintaxe clara para manter ritmo.",
            highlights: ["Modo zen para reduzir distrações", "Bloco ativo com destaque suave"],
          },
          {
            label: "Organizar",
            title: "Workspace com contexto",
            description: "Arquivos e abas para manter contexto.",
            highlights: ["Estrutura de pastas clara", "Troca rápida entre documentos"],
          },
          {
            label: "Prévia",
            title: "Preview lado a lado",
            description: "Veja o resultado enquanto escreve.",
            highlights: ["Presets visuais prontos", "CRUD de presets para seu fluxo"],
          },
          {
            label: "Exportar",
            title: "Exportação flexível",
            description: "Exporte para Markdown, HTML e PDF.",
            highlights: ["Interface simples", "Busca avançada com substituição"],
          },
          {
            label: "Snippets",
            title: "Modelos reutilizáveis",
            description: "Acelere padrões de escrita.",
            highlights: ["Crie atalhos", "Organize no workspace"],
          },
        ],
      },
      ctaSection: {
        title: "Quer escrever do seu jeito?",
        description: "Baixe a versão atual e comece no seu workspace.",
        primaryCta: "Baixar",
        secondaryCta: "Repositório",
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
            colors: ["#1a1410", "#2a2018", "#d4943a", "#8b7355", "#6b8a3a"],
          },
          {
            name: "Forest",
            description: "Verde profundo com leitura confortável.",
            colors: ["#0f1a14", "#1a2e20", "#4a8b5c", "#7ab88a", "#2d5a3a"],
          },
          {
            name: "Golden",
            description: "Dourado quente com destaque em títulos.",
            colors: ["#1a1508", "#2e2510", "#c4a035", "#8b7830", "#d4b84a"],
          },
          {
            name: "Light",
            description: "Tema claro para ambientes bem iluminados.",
            colors: ["#fafafa", "#f0f0f0", "#333333", "#666666", "#0066cc"],
          },
          {
            name: "Neomatrix",
            description: "Estética terminal com verde neon.",
            colors: ["#0a0f0a", "#0d1a0d", "#00ff41", "#008f11", "#003b00"],
          },
          {
            name: "Nord",
            description: "Azuis frios equilibrados para foco contínuo.",
            colors: ["#2e3440", "#3b4252", "#88c0d0", "#81a1c1", "#5e81ac"],
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
            label: "Modelos",
            title: "Snippets prontos e editáveis",
            description: "Use modelos prontos e crie novos snippets.",
            visual: "snippets",
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
