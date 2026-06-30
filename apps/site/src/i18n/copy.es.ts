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
    editor: "Editor",
    memories: "Memorias",
    localFirst: "Local-first",
    primaryAriaLabel: "Navegación principal",
    mobileAriaLabel: "Menú móvil",
  },
  downloadLabel: "Descargar",
  githubLabel: "GitHub",
  openMenuAria: "Abrir menú principal",
  closeMenuAria: "Cerrar menú principal",
  footer: {
    description: "Editor y Memorias para escribir, organizar y redescubrir archivos Markdown locales.",
    copyright: "© 2026 · Open source · Licencia MIT",
    groups: [
      {
        title: "Producto",
        links: [
          { label: "Editor", section: "editor" },
          { label: "Memorias", section: "memorias" },
          { label: "Local-first", section: "local" },
        ],
      },
      {
        title: "Proyecto",
        links: [
          { label: "Experiencia", page: "gallery" },
          { label: "Ingeniería", page: "engineering" },
          { label: "Contribuir", page: "contributing" },
        ],
      },
      {
        title: "Ayuda",
        links: [
          { label: "FAQ", page: "faq" },
          { label: "Descargar", page: "downloads" },
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
    title: "Página no encontrada",
    description: "Esta ruta no existe.",
    cta: "Volver al inicio",
  },
  redirecting: "Redirigiendo a tu idioma...",
  pages: {
    home: {
      hero: {
        label: "Editor + Memorias, en tu computadora",
        title: "Escribe lo que necesitas. Guarda lo que importa.",
        description:
          "Mark-Lee reúne un editor Markdown completo y un espacio de Memorias sobre los mismos archivos locales, sin cuenta, formato cerrado ni servidor obligatorio.",
        primaryCta: "Descargar Mark-Lee",
        secondaryCta: "Ver los dos contextos",
        note: "Windows, macOS y Linux · Open source · Licencia MIT",
      },
      continuity: {
        label: "Un archivo, dos ritmos",
        title: "Un archivo. Dos contextos.",
        description:
          "Trabaja con precisión en Editor y redescubre el mismo contenido en Memorias. Nada se convierte, duplica ni queda atrapado en un formato propietario.",
        fileName: "viaje-a-paraty.md",
        editorLabel: "Editar con precisión",
        memoriesLabel: "Redescubrir con contexto",
      },
      editor: {
        label: "Editor",
        title: "Precisión para trabajar.",
        description:
          "Abre una carpeta, mantén tus documentos en contexto y avanza desde la escritura hasta la publicación sin cambiar de herramienta.",
        highlights: [
          "Workspace, pestañas y búsqueda para conservar el contexto",
          "Markdown y vista previa lado a lado",
          "Comandos, snippets, temas y exportación",
        ],
      },
      memories: {
        label: "Memorias",
        title: "Contexto para reencontrar.",
        description:
          "Convierte carpetas locales en cuadernos vivos, con registros organizados por tiempo, lugar, imágenes y aquello que elijas seguir.",
        highlights: [
          "Cuadernos, registros y plantillas",
          "Calendario, Lugares, mapa y galería",
          "Pins configurables y lectura editorial",
        ],
      },
      localProof: {
        label: "Local por principio",
        title: "Tus archivos siguen siendo tuyos.",
        description:
          "Mark-Lee trabaja con carpetas y archivos legibles en tu computadora. Tú decides dónde guardarlos, sincronizarlos o publicarlos.",
        folderLabel: "mi-workspace",
        files: ["proyectos/roadmap.md", "memorias/viajes/paraty.md", "assets/atardecer.jpg"],
        principles: [
          { title: "Markdown abierto", description: "Archivos portables y editables fuera de la app." },
          { title: "Sin cuenta", description: "Empieza con una carpeta, sin registro obligatorio." },
          { title: "Offline", description: "La escritura y organización esenciales funcionan sin red." },
          { title: "Open source", description: "Código abierto con licencia MIT, sin caja negra." },
        ],
      },
      closingCta: {
        title: "Empieza con una carpeta.",
        description: "Descarga Mark-Lee y elige lo que merece ser escrito — o recordado.",
        primaryCta: "Descargar Mark-Lee",
        secondaryCta: "Ver código en GitHub",
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
            colors: ["#1b0f0d", "#2a1713", "#1b0f0d", "#ffe1bf", "#ffb86c"],
          },
          {
            name: "Forest",
            description: "Verde profundo con contraste suave.",
            colors: ["#17241b", "#203124", "#17241b", "#e8fbe9", "#90f0a8"],
          },
          {
            name: "Golden",
            description: "Paleta dorada cálida con énfasis en títulos.",
            colors: ["#f4d49a", "#e7be73", "#f4d49a", "#1e1308", "#2a1808"],
          },
          {
            name: "Light",
            description: "Tema claro para ambientes iluminados.",
            colors: ["#ffffff", "#f9fafb", "#ffffff", "#0f172a", "#4f46e5"],
          },
          {
            name: "Neomatrix",
            description: "Estilo terminal con verde neón.",
            colors: ["#040b04", "#061207", "#040b04", "#8afcc7", "#57ff9e"],
          },
          {
            name: "Nord",
            description: "Azules fríos equilibrados para foco sostenido.",
            colors: ["#2E3440", "#262f40", "#2E3440", "#ECEFF4", "#88C0D0"],
          },
        ],
      },
      previewSection: {
        label: "Customize",
        title: "Encuentra tu manera de usar la app",
        description: "Sin vitrina genérica: cada bloque explica un uso concreto.",
        items: [
          {
            label: "Presets",
            title: "Presets - Ajusta la previsualización",
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
            label: "Exportación",
            title: "Exporta sin salir del flujo",
            description: "Markdown, HTML y PDF en el mismo panel con salida predecible.",
            visual: "export",
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
