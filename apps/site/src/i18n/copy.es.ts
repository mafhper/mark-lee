import { RELEASES_URL, REPO_URL, SiteCopy } from "@/i18n/types";

export const esESCopy: SiteCopy = {
  languageName: "Español",
  languageSwitcherLabel: "Idioma",
  nav: {
    home: "Producto",
    gallery: "Experiencia",
    engineering: "Ingeniería",
    contributing: "Contribuir",
    faq: "FAQ",
  },
  downloadLabel: "Descargas",
  githubLabel: "GitHub",
  openMenuAria: "Abrir menú principal",
  closeMenuAria: "Cerrar menú principal",
  footer: {
    description: "Editor markdown de escritorio para escribir con claridad y publicar con ritmo.",
    copyright: "© 2026 · Open source · Licencia MIT",
    groups: [
      {
        title: "Producto",
        links: [
          { label: "Producto", page: "home" },
          { label: "Experiencia", page: "gallery" },
          { label: "Ingeniería", page: "engineering" },
        ],
      },
      {
        title: "Comunidad",
        links: [
          { label: "Contribuir", page: "contributing" },
          { label: "FAQ", page: "faq" },
          { label: "Issues", href: REPO_URL, external: true },
        ],
      },
      {
        title: "Descargas",
        links: [
          { label: "Descargar", page: "downloads" },
          { label: "Historial", href: RELEASES_URL, external: true },
        ],
      },
      {
        title: "Repositorio",
        links: [{ label: "Ver código", href: REPO_URL, external: true }],
      },
    ],
  },
  notFound: {
    title: "Página no encontrada",
    description: "Esta ruta no existe.",
    cta: "Volver al inicio",
  },
  redirecting: "Redirigiendo a tu idioma...",
  pages: {
    home: {
      hero: {
        label: "Editor de escritorio para escritura enfocada",
        title: "Escribe claro. Publica sin fricción.",
        description: "Edición, preview y exportación en un solo flujo para no cortar tu ritmo.",
      },
      statsSection: {
        label: "Listo para el día a día",
        title: "Todo para escribir, revisar y entregar.",
        description: "Sin cambiar de herramienta durante el proceso.",
        primaryCta: "Descargar",
        secondaryCta: "Experiencia",
        cards: [
          { value: "Markdown", label: "Texto rápido y portable" },
          { value: "Multiplataforma", label: "Windows, macOS y Linux" },
          { value: "Open source", label: "Código transparente" },
          { value: "Ligero", label: "Respuesta rápida en sesiones largas" },
        ],
      },
      capabilitiesSection: {
        label: "Funciones",
        title: "Herramientas útiles, sin exceso",
        description: "Cada bloque protege tu flujo de escritura.",
        items: [
          {
            label: "Escribir",
            title: "Edición markdown enfocada",
            description: "Atajos, sintaxis clara y poco ruido visual.",
            highlights: ["Modo zen para menos distracción", "Resalte suave del bloque activo"],
          },
          {
            label: "Organizar",
            title: "Workspace con contexto",
            description: "Pestañas y archivos visibles para no perder continuidad.",
            highlights: ["Jerarquía de carpetas clara", "Cambio rápido entre documentos"],
          },
          {
            label: "Preview",
            title: "Vista lado a lado",
            description: "Ves el resultado final mientras escribes.",
            highlights: ["Presets de preview incluidos", "CRUD de presets personalizados"],
          },
          {
            label: "Publicar",
            title: "Publicación flexible",
            description: "Exporta con seguridad a Markdown, HTML y PDF.",
            highlights: ["Snippets reutilizables", "Búsqueda avanzada con reemplazo"],
          },
        ],
      },
      ctaSection: {
        title: "¿Quieres escribir con menos fricción?",
        description: "Descarga la versión más reciente y empieza en tu propio workspace.",
        primaryCta: "Descargar",
        secondaryCta: "Repositorio",
      },
    },
    gallery: {
      hero: {
        label: "Experiencia visual real",
        title: "Tema, preview y foco.",
        description: "La interfaz se adapta a tu estilo sin perder legibilidad.",
      },
      themesSection: {
        label: "Temas",
        title: "Elige la paleta que mejor te acompaña",
        description: "Compara temas y revisa contraste y comodidad de lectura.",
        items: [
          {
            name: "Firenight",
            description: "Ámbar oscuro para sesiones largas y contraste fuerte.",
            colors: ["#1a1410", "#2a2018", "#d4943a", "#8b7355", "#6b8a3a"],
          },
          {
            name: "Forest",
            description: "Verde profundo con contraste suave.",
            colors: ["#0f1a14", "#1a2e20", "#4a8b5c", "#7ab88a", "#2d5a3a"],
          },
          {
            name: "Golden",
            description: "Paleta dorada cálida con énfasis en títulos.",
            colors: ["#1a1508", "#2e2510", "#c4a035", "#8b7830", "#d4b84a"],
          },
          {
            name: "Light",
            description: "Tema claro para ambientes iluminados.",
            colors: ["#fafafa", "#f0f0f0", "#333333", "#666666", "#0066cc"],
          },
          {
            name: "Neomatrix",
            description: "Estilo terminal con verde neón.",
            colors: ["#0a0f0a", "#0d1a0d", "#00ff41", "#008f11", "#003b00"],
          },
          {
            name: "Nord",
            description: "Azules fríos equilibrados para foco sostenido.",
            colors: ["#2e3440", "#3b4252", "#88c0d0", "#81a1c1", "#5e81ac"],
          },
        ],
      },
      previewSection: {
        label: "Preview",
        title: "Uso real de la app",
        description: "Sin vitrina genérica: cada bloque explica un uso concreto.",
        items: [
          {
            label: "Presets",
            title: "Preview con CRUD de presets",
            description: "Usa presets existentes, crea nuevos y ajusta tu salida.",
            visual: "preview",
          },
          {
            label: "Concentración",
            title: "Modo foco simplificado",
            description: "Interfaz mínima con texto centrado para reducir distracción.",
            visual: "focus",
          },
          {
            label: "Navegación",
            title: "Pestañas y workspace con contexto",
            description: "Estructura de carpetas detallada sin ocultar el resto de la app.",
            visual: "workspace",
          },
          {
            label: "Modelos",
            title: "Snippets listos y editables",
            description: "Parte de modelos existentes y crea nuevos snippets cuando haga falta.",
            visual: "snippets",
          },
        ],
      },
      ctaSection: {
        title: "¿Te gustó esta dirección visual?",
        description: "Descarga la versión actual o sigue el desarrollo en GitHub.",
        primaryCta: "Descargar",
        secondaryCta: "Repositorio",
      },
    },
    engineering: {
      hero: {
        label: "Arquitectura y entrega",
        title: "Interfaz y código en capas.",
        description: "Decisiones técnicas con foco en rendimiento, legibilidad y mantenimiento.",
      },
      architectureSection: {
        label: "Arquitectura",
        title: "Cómo está construido Mark-Lee",
        description: "Límites claros entre UI, bridge y núcleo nativo.",
        flowTitle: "Flujo de datos",
        flowLabels: {
          ui: "React UI",
          preview: "Preview",
          bridge: "Tauri IPC",
          core: "Rust Core",
          filesystem: "File System",
          flow: "Flujo",
        },
        layers: [
          {
            name: "Interfaz (React + TypeScript)",
            description: "Estado, componentes y render",
            colorClass: "bg-primary/20 border-primary/30 text-primary",
          },
          {
            name: "Bridge (Tauri Commands)",
            description: "IPC entre frontend y backend",
            colorClass: "bg-secondary border-border/50 text-muted-foreground",
          },
          {
            name: "Core (Rust)",
            description: "Filesystem, parsing y exportación",
            colorClass: "bg-secondary/60 border-border/40 text-muted-foreground",
          },
          {
            name: "Sistema Operativo",
            description: "WebView2, procesos e integraciones",
            colorClass: "bg-secondary/30 border-border/30 text-muted-foreground/60",
          },
        ],
      },
      stackSection: {
        label: "Stack",
        title: "Tecnologías base",
        description: "Cada elección técnica responde a una necesidad concreta.",
        items: [
          {
            title: "React 19 + TypeScript",
            description: "UI modular con tipado fuerte y contratos explícitos.",
            tags: ["UI", "Type-safe", "Modular"],
          },
          {
            title: "Rust + Tauri",
            description: "Núcleo nativo con seguridad de memoria y rendimiento predecible.",
            tags: ["Native", "Memory-safe", "Fast"],
          },
          {
            title: "Tailwind CSS",
            description: "Estilos basados en tokens para evitar CSS fragmentado.",
            tags: ["Tokens", "Utility", "Consistent"],
          },
          {
            title: "Vite",
            description: "Servidor rápido y ciclo corto de feedback.",
            tags: ["HMR", "ESM", "Fast builds"],
          },
          {
            title: "WebView2",
            description: "Render moderno en Windows con bajo consumo.",
            tags: ["Windows", "Native", "Lightweight"],
          },
        ],
      },
      recentCommitsSection: {
        label: "Código vivo",
        title: "Últimos commits del repositorio",
        description: "Cargado en runtime para mostrar el estado actual del proyecto.",
        emptyMessage: "Aún no hay commits recientes para mostrar.",
        viewAllLabel: "Ver historial completo",
      },
      ctaSection: {
        title: "¿Quieres seguir la evolución técnica?",
        description: "Descarga la versión estable o revisa cambios en el repositorio.",
        primaryCta: "Descargar",
        secondaryCta: "Repositorio",
      },
    },
    contributing: {
      hero: {
        label: "Flujo open source",
        title: "Contribuye con claridad.",
        description: "De issue a PR mergeado con un proceso simple y predecible.",
        flowTitle: "Flujo de contribución",
        flowSteps: ["Issue", "Branch", "Commit", "PR", "Merge"],
        testsLabel: "Pruebas aprobadas",
        buildLabel: "Build aprobado",
      },
      stepsSection: {
        label: "Comenzar",
        title: "Colabora sin fricción en review",
        githubCta: "Abrir en GitHub",
        items: [
          {
            step: "01",
            title: "Abre issues con contexto",
            description: "Incluye escenario, pasos de reproducción y resultado esperado.",
          },
          {
            step: "02",
            title: "Mantén cambios pequeños",
            description: "PRs pequeños se revisan más rápido y con menos riesgo.",
          },
          {
            step: "03",
            title: "Documenta lo que cambió",
            description: "Describe intención, impacto y validaciones ejecutadas.",
          },
        ],
      },
      guideSection: {
        label: "Guía",
        title: "Base de colaboración",
        items: [
          {
            title: "Accesibilidad obligatoria",
            description: "Foco visible, contraste AA y navegación por teclado en cambios de UI.",
          },
          {
            title: "Consistencia visual",
            description: "Reutiliza tokens y componentes antes de crear variantes nuevas.",
          },
          {
            title: "Rendimiento práctico",
            description: "Evita dependencias y efectos sin valor claro para usuarios.",
          },
        ],
      },
      qualitySection: {
        label: "Calidad de código",
        title: "Nivel esperado en este proyecto",
        description: "Código legible, comportamiento predecible y validación local antes del PR.",
        principles: [
          {
            title: "Código legible y cohesivo",
            description: "Funciones cortas, nombres claros y responsabilidades bien separadas.",
          },
          {
            title: "Cobertura de escenarios críticos",
            description: "Ejecuta build, typecheck y smoke para proteger páginas públicas.",
          },
          {
            title: "Alcance acotado por PR",
            description: "No mezcles refactor amplio con cambios funcionales en el mismo PR.",
          },
        ],
        scriptsTitle: "Scripts útiles del proyecto",
        scripts: [
          { command: "npm run site:dev", description: "Ejecuta el promo-site localmente." },
          { command: "npm run site:check", description: "Valida tipado TypeScript del sitio." },
          { command: "npm run site:build", description: "Genera build de producción (incluye fallback 404)." },
          { command: "npm run site:test:smoke", description: "Ejecuta smoke browser en rutas clave." },
          { command: "npm run build", description: "Compila la app desktop principal." },
        ],
      },
    },
    faq: {
      hero: {
        label: "Soporte y dudas frecuentes",
        title: "Respuestas directas para seguir escribiendo.",
        description: "Instalación, uso y publicación sin rodeos.",
      },
      poemSnippet: {
        lines: ["No meio do caminho tinha uma pedra", "tinha uma pedra no meio do caminho"],
        credit: "Fragmento de Carlos Drummond de Andrade",
      },
      sections: [
        {
          title: "Instalación",
          items: [
            {
              question: "¿La primera apertura tarda más?",
              answer: "Sí. La primera ejecución prepara runtime y caché; luego abre más rápido.",
            },
            {
              question: "SmartScreen bloqueó el instalador. ¿Qué hago?",
              answer: "Pulsa 'Más información' y luego 'Ejecutar de todos modos'.",
            },
            {
              question: "¿Necesito dependencias extra?",
              answer: "No. El paquete incluye lo necesario para ejecutar.",
            },
          ],
        },
        {
          title: "Editor y preview",
          items: [
            {
              question: "¿La búsqueda soporta regex y mayúsculas/minúsculas?",
              answer: "Sí. Puedes usar búsqueda simple o avanzada con reemplazo.",
            },
            {
              question: "¿Cómo evito rutas rotas de imágenes?",
              answer: "Usa rutas relativas al archivo markdown.",
            },
            {
              question: "¿Puedo personalizar atajos?",
              answer: "Aún no dentro de la app, pero está previsto en próximas iteraciones.",
            },
          ],
        },
        {
          title: "Publicación",
          items: [
            {
              question: "¿Qué formatos están soportados?",
              answer: "Markdown, HTML y PDF en el mismo flujo de exportación.",
            },
            {
              question: "¿Puedo exportar varios archivos a la vez?",
              answer: "Sí, con selección por lotes en el workspace.",
            },
          ],
        },
      ],
    },
    downloads: {
      hero: {
        label: "Descargas estables",
        title: "Descarga la última versión.",
        description: "Los enlaces se resuelven automáticamente al asset estable más reciente.",
      },
      section: {
        title: "Descargas por plataforma",
        buttonLabel: "Descargar",
        fallbackLabel: "Ver release",
        items: [
          { platform: "windows", name: "Windows", status: "Instalador estable" },
          { platform: "macos", name: "macOS", status: "Paquete estable" },
          { platform: "linux", name: "Linux", status: "Build estable" },
        ],
      },
    },
  },
};
