import { RELEASES_URL, REPO_URL, SiteCopy } from "@/i18n/types";

export const enUSCopy: SiteCopy = {
  languageName: "English",
  languageSwitcherLabel: "Language",
  nav: {
    home: "Product",
    gallery: "Experience",
    engineering: "Engineering",
    contributing: "Contributing",
    faq: "FAQ",
    editor: "Editor",
    memories: "Memories",
    localFirst: "Local-first",
    primaryAriaLabel: "Primary navigation",
    mobileAriaLabel: "Mobile menu",
  },
  downloadLabel: "Download",
  githubLabel: "GitHub",
  openMenuAria: "Open main menu",
  closeMenuAria: "Close main menu",
  footer: {
    description: "Editor and Memories for writing, organizing, and revisiting local Markdown files.",
    copyright: "© 2026 · Open source · MIT License",
    groups: [
      {
        title: "Product",
        links: [
          { label: "Editor", section: "editor" },
          { label: "Memories", section: "memorias" },
          { label: "Local-first", section: "local" },
        ],
      },
      {
        title: "Project",
        links: [
          { label: "Experience", page: "gallery" },
          { label: "Engineering", page: "engineering" },
          { label: "Contributing", page: "contributing" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "FAQ", page: "faq" },
          { label: "Download", page: "downloads" },
        ],
      },
      {
        title: "Code",
        links: [
          { label: "GitHub", href: REPO_URL, external: true },
          { label: "Releases", href: RELEASES_URL, external: true },
        ],
      },
    ],
  },
  notFound: {
    title: "Page not found",
    description: "This route does not exist.",
    cta: "Back to home",
  },
  redirecting: "Redirecting to your language...",
  pages: {
    home: {
      hero: {
        label: "Editor + Memories, on your computer",
        title: "Write what you need. Keep what matters.",
        description:
          "Mark-Lee brings together a complete Markdown editor and a Memories space over the same local files — with no account, closed format, or required server.",
        primaryCta: "Download Mark-Lee",
        secondaryCta: "See both contexts",
        note: "Windows, macOS, and Linux · Open source · MIT License",
      },
      continuity: {
        label: "One file, two rhythms",
        title: "One file. Two contexts.",
        description:
          "Work with precision in Editor and revisit the same content in Memories. Nothing is converted, duplicated, or locked into a proprietary format.",
        fileName: "trip-to-paraty.md",
        editorLabel: "Edit with precision",
        memoriesLabel: "Revisit with context",
      },
      editor: {
        label: "Editor",
        title: "Precision for the work.",
        description:
          "Open a folder, keep documents in context, and move from writing to publishing without changing tools.",
        highlights: [
          "Workspace, tabs, and search that preserve context",
          "Markdown and side-by-side preview",
          "Commands, snippets, themes, and export",
        ],
      },
      memories: {
        label: "Memories",
        title: "Context to find it again.",
        description:
          "Turn local folders into living notebooks, with entries organized by time, place, images, and whatever you choose to track.",
        highlights: [
          "Notebooks, entries, and templates",
          "Calendar, Places, map, and gallery",
          "Configurable Pins and an editorial reading view",
        ],
      },
      localProof: {
        label: "Local by principle",
        title: "Your files remain yours.",
        description:
          "Mark-Lee works with readable folders and files on your computer. You decide where to store, sync, or publish them.",
        folderLabel: "my-workspace",
        files: ["projects/roadmap.md", "memories/travel/paraty.md", "assets/sunset.jpg"],
        principles: [
          { title: "Open Markdown", description: "Portable files you can edit outside the app." },
          { title: "No account", description: "Start with a folder, without required registration." },
          { title: "Offline", description: "Essential writing and organization work without a network." },
          { title: "Open source", description: "Transparent MIT-licensed code, with no black box." },
        ],
      },
      closingCta: {
        title: "Start with a folder.",
        description: "Download Mark-Lee and choose what deserves to be written — or remembered.",
        primaryCta: "Download Mark-Lee",
        secondaryCta: "View source on GitHub",
      },
    },
    gallery: {
      hero: {
        label: "Real visual experience",
        title: "Theme, preview, and focus.",
        description: "The interface adapts to your style without losing readability.",
      },
      themesSection: {
        label: "Themes",
        title: "Pick the palette that fits your rhythm",
        description: "Compare themes and see how each one affects contrast and reading comfort.",
        items: [
          {
            name: "Firenight",
            description: "Deep amber for long sessions and strong contrast.",
            colors: ["#1b0f0d", "#2a1713", "#1b0f0d", "#ffe1bf", "#ffb86c"],
          },
          {
            name: "Forest",
            description: "Deep green with softer reading contrast.",
            colors: ["#17241b", "#203124", "#17241b", "#e8fbe9", "#90f0a8"],
          },
          {
            name: "Golden",
            description: "Warm golden palette with heading emphasis.",
            colors: ["#f4d49a", "#e7be73", "#f4d49a", "#1e1308", "#2a1808"],
          },
          {
            name: "Light",
            description: "Clean light option for bright environments.",
            colors: ["#ffffff", "#f9fafb", "#ffffff", "#0f172a", "#4f46e5"],
          },
          {
            name: "Neomatrix",
            description: "Terminal-inspired neon green style.",
            colors: ["#040b04", "#061207", "#040b04", "#8afcc7", "#57ff9e"],
          },
          {
            name: "Nord",
            description: "Balanced cold blues for steady focus.",
            colors: ["#2E3440", "#262f40", "#2E3440", "#ECEFF4", "#88C0D0"],
          },
        ],
      },
      previewSection: {
        label: "Customize",
        title: "Find your way to use the app",
        description: "No generic showcase. Each block explains a concrete interaction.",
        items: [
          {
            label: "Presets",
            title: "Presets - Tune the preview",
            description: "Use existing presets, create new ones, and tune output to your workflow.",
            visual: "preview",
          },
          {
            label: "Concentration",
            title: "Simplified focus mode",
            description: "Minimal interface with centered text to reduce distraction.",
            visual: "focus",
          },
          {
            label: "Navigation",
            title: "Tabs and workspace with context",
            description: "Detailed folder structure while still showing the rest of the app.",
            visual: "workspace",
          },
          {
            label: "Export",
            title: "Export without leaving the flow",
            description: "Markdown, HTML, and PDF in the same panel with predictable output.",
            visual: "export",
          },
        ],
      },
      ctaSection: {
        title: "Like this experience direction?",
        description: "Download the latest release or follow development on GitHub.",
        primaryCta: "Download",
        secondaryCta: "Repository",
      },
    },
    engineering: {
      hero: {
        label: "Architecture and delivery",
        title: "Interface and code in layers.",
        description: "Technical choices focused on performance, readability, and maintainability.",
      },
      architectureSection: {
        label: "Architecture",
        title: "How Mark-Lee is built",
        description: "Clear boundaries between UI, bridge, and native core.",
        flowTitle: "Data flow",
        flowLabels: {
          ui: "React UI",
          preview: "Preview",
          bridge: "Tauri IPC",
          core: "Rust Core",
          filesystem: "File System",
          flow: "Flow",
        },
        layers: [
          {
            name: "Interface (React + TypeScript)",
            description: "State, components, and rendering",
            colorClass: "bg-primary/20 border-primary/30 text-primary",
          },
          {
            name: "Bridge (Tauri Commands)",
            description: "IPC between frontend and backend",
            colorClass: "bg-secondary border-border/50 text-muted-foreground",
          },
          {
            name: "Core (Rust)",
            description: "Filesystem, parsing, and export",
            colorClass: "bg-secondary/60 border-border/40 text-muted-foreground",
          },
          {
            name: "Operating System",
            description: "WebView2, processes, and integrations",
            colorClass: "bg-secondary/30 border-border/30 text-muted-foreground/60",
          },
        ],
      },
      stackSection: {
        label: "Stack",
        title: "Core technologies",
        description: "Each technology solves a specific engineering need.",
        items: [
          {
            title: "React 19 + TypeScript",
            description: "Modular UI with strong typing and explicit contracts.",
            tags: ["UI", "Type-safe", "Modular"],
          },
          {
            title: "Rust + Tauri",
            description: "Native core with memory safety and predictable performance.",
            tags: ["Native", "Memory-safe", "Fast"],
          },
          {
            title: "Tailwind CSS",
            description: "Token-based styling to avoid fragmented CSS.",
            tags: ["Tokens", "Utility", "Consistent"],
          },
          {
            title: "Vite",
            description: "Fast development server with short feedback loops.",
            tags: ["HMR", "ESM", "Fast builds"],
          },
          {
            title: "WebView2",
            description: "Modern rendering on Windows with low footprint.",
            tags: ["Windows", "Native", "Lightweight"],
          },
        ],
      },
      recentCommitsSection: {
        label: "Live code",
        title: "Latest commits from the repository",
        description: "Loaded in runtime to reflect the current project state.",
        emptyMessage: "No recent commits available yet.",
        viewAllLabel: "View full history",
      },
      ctaSection: {
        title: "Want to follow the technical evolution?",
        description: "Download the stable release or inspect changes in the repository.",
        primaryCta: "Download",
        secondaryCta: "Repository",
      },
    },
    contributing: {
      hero: {
        label: "Open source workflow",
        title: "Contribute with clarity.",
        description: "From issue to merged PR through a simple and predictable flow.",
        flowTitle: "Contribution flow",
        flowSteps: ["Issue", "Branch", "Commit", "PR", "Merge"],
        testsLabel: "Tests passing",
        buildLabel: "Build approved",
      },
      stepsSection: {
        label: "Getting started",
        title: "Collaborate without review friction",
        githubCta: "Open on GitHub",
        items: [
          {
            step: "01",
            title: "Open issues with context",
            description: "Include scenario, repro steps, and expected behavior.",
          },
          {
            step: "02",
            title: "Keep changes small",
            description: "Small PRs are easier to review and safer to merge.",
          },
          {
            step: "03",
            title: "Document what changed",
            description: "State intent, impact, and local checks executed.",
          },
        ],
      },
      guideSection: {
        label: "Guidelines",
        title: "Collaboration baseline",
        items: [
          {
            title: "Accessibility is mandatory",
            description: "Visible focus, AA contrast, and keyboard navigation for all UI changes.",
          },
          {
            title: "Visual consistency",
            description: "Reuse tokens and components before adding new visual variants.",
          },
          {
            title: "Practical performance",
            description: "Avoid dependencies and effects without clear user value.",
          },
        ],
      },
      qualitySection: {
        label: "Code quality",
        title: "Quality bar expected in this repo",
        description: "Readable code, predictable behavior, and local validation before PR.",
        principles: [
          {
            title: "Readable and cohesive code",
            description: "Short functions, clear naming, and explicit responsibilities.",
          },
          {
            title: "Critical scenario coverage",
            description: "Run build, typecheck, and smoke to protect public pages.",
          },
          {
            title: "Tight PR scope",
            description: "Do not mix broad refactors with feature changes in one PR.",
          },
        ],
        scriptsTitle: "Useful project scripts",
        scripts: [
          { command: "npm run site:dev", description: "Run the promo-site locally." },
          { command: "npm run site:check", description: "Validate site TypeScript types." },
          { command: "npm run site:build", description: "Build production site (including 404 fallback)." },
          { command: "npm run site:test:smoke", description: "Run browser smoke tests on key routes." },
          { command: "npm run build", description: "Build the main desktop application." },
        ],
      },
    },
    faq: {
      hero: {
        label: "Support and common questions",
        title: "Direct answers to keep writing.",
        description: "Install, usage, and publishing without extra noise.",
      },
      poemSnippet: {
        lines: ["No meio do caminho tinha uma pedra", "tinha uma pedra no meio do caminho"],
        credit: "Excerpt from Carlos Drummond de Andrade",
      },
      sections: [
        {
          title: "Installation",
          items: [
            {
              question: "Is first launch slower?",
              answer: "Yes. The first run prepares runtime and cache. Next launches are faster.",
            },
            {
              question: "SmartScreen blocked the installer. What should I do?",
              answer: "Click 'More info' and then 'Run anyway'.",
            },
            {
              question: "Do I need extra dependencies?",
              answer: "No. The package already includes required runtime dependencies.",
            },
          ],
        },
        {
          title: "Editor and preview",
          items: [
            {
              question: "Does search support regex and case-sensitive mode?",
              answer: "Yes. Use simple search or advanced search with replacement.",
            },
            {
              question: "How do I avoid broken image paths?",
              answer: "Use paths relative to the markdown file location.",
            },
            {
              question: "Can I customize keyboard shortcuts?",
              answer: "Not yet in-app, but it is planned in upcoming iterations.",
            },
          ],
        },
        {
          title: "Publishing",
          items: [
            {
              question: "Which export formats are supported?",
              answer: "Markdown, HTML, and PDF in the same export flow.",
            },
            {
              question: "Can I export multiple files at once?",
              answer: "Yes. Use batch selection in the workspace.",
            },
          ],
        },
      ],
    },
    downloads: {
      hero: {
        label: "Stable downloads",
        title: "Get the latest build for your platform.",
        description: "Links are resolved automatically to the latest stable release assets.",
      },
      section: {
        title: "Downloads by platform",
        buttonLabel: "Download",
        fallbackLabel: "Release page",
        items: [
          { platform: "windows", name: "Windows", status: "Stable installer" },
          { platform: "macos", name: "macOS", status: "Stable package" },
          { platform: "linux", name: "Linux", status: "Stable build" },
        ],
      },
    },
  },
};
