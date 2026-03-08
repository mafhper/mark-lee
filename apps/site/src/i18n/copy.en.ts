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
  },
  downloadLabel: "Downloads",
  githubLabel: "GitHub",
  openMenuAria: "Open main menu",
  closeMenuAria: "Close main menu",
  footer: {
    description: "Desktop markdown editor for clear writing and predictable delivery.",
    copyright: "© 2026 · Open source · MIT License",
    groups: [
      {
        title: "Product",
        links: [
          { label: "Product", page: "home" },
          { label: "Experience", page: "gallery" },
          { label: "Engineering", page: "engineering" },
        ],
      },
      {
        title: "Community",
        links: [
          { label: "Contributing", page: "contributing" },
          { label: "FAQ", page: "faq" },
          { label: "Issues", href: REPO_URL, external: true },
        ],
      },
      {
        title: "Downloads",
        links: [
          { label: "Download", page: "downloads" },
          { label: "Release history", href: RELEASES_URL, external: true },
        ],
      },
      {
        title: "Repository",
        links: [{ label: "View source", href: REPO_URL, external: true }],
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
        label: "Desktop editor for focused writing",
        title: "Create, edit, and export. The right tool for your text.",
        description: "Editing, preview, and export in one place, with full control over the workspace.",
      },
      statsSection: {
        label: "Ready for daily work",
        title: "Everything you need to write, review, and ship.",
        description: "No tool hopping in the middle of delivery.",
        primaryCta: "Download",
        secondaryCta: "Experience",
        cards: [
          { value: "Markdown", label: "Fast and portable text" },
          { value: "Multiplatform", label: "Windows, macOS, and Linux" },
          { value: "Open source", label: "Transparent codebase" },
          { value: "Lightweight", label: "Fast response in long sessions" },
        ],
      },
      capabilitiesSection: {
        label: "Capabilities",
        title: "Useful tools, full customization",
        description: "Each block can adapt to the way you work.",
        items: [
          {
            label: "Write",
            title: "Focused markdown editing",
            description: "Keyboard-friendly editing with clear syntax and low visual noise.",
            highlights: ["Zen mode for distraction-free writing", "Soft active-block emphasis"],
          },
          {
            label: "Organize",
            title: "Workspace with context",
            description: "Tabs and files stay visible so context is never lost.",
            highlights: ["Clear folder hierarchy", "Fast document switching"],
          },
          {
            label: "Preview",
            title: "Side-by-side preview",
            description: "See final output while you type, without window switching.",
            highlights: ["Built-in preview presets", "Preset CRUD for custom workflows"],
          },
          {
            label: "Commands",
            title: "Command palette for navigation and actions",
            description: "Open actions, files, and snippets from a single search surface.",
            highlights: ["Search actions and files", "Trigger snippets and shortcuts quickly"],
          },
          {
            label: "Snippets",
            title: "Reusable templates",
            description: "Speed up your writing patterns.",
            highlights: ["Create shortcuts", "Organize in workspace"],
          },
        ],
      },
      ctaSection: {
        title: "Want to write your way?",
        description: "Get the latest build and start inside your own workspace.",
        primaryCta: "Download",
        secondaryCta: "Repository",
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
            colors: ["#1a1410", "#2a2018", "#d4943a", "#8b7355", "#6b8a3a"],
          },
          {
            name: "Forest",
            description: "Deep green with softer reading contrast.",
            colors: ["#0f1a14", "#1a2e20", "#4a8b5c", "#7ab88a", "#2d5a3a"],
          },
          {
            name: "Golden",
            description: "Warm golden palette with heading emphasis.",
            colors: ["#1a1508", "#2e2510", "#c4a035", "#8b7830", "#d4b84a"],
          },
          {
            name: "Light",
            description: "Clean light option for bright environments.",
            colors: ["#fafafa", "#f0f0f0", "#333333", "#666666", "#0066cc"],
          },
          {
            name: "Neomatrix",
            description: "Terminal-inspired neon green style.",
            colors: ["#0a0f0a", "#0d1a0d", "#00ff41", "#008f11", "#003b00"],
          },
          {
            name: "Nord",
            description: "Balanced cold blues for steady focus.",
            colors: ["#2e3440", "#3b4252", "#88c0d0", "#81a1c1", "#5e81ac"],
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
