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
    product: "Product",
    files: "Files",
    customization: "Customization",
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
        title: "Sections",
        links: [
          { label: "Product", section: "leituras" },
          { label: "Files", section: "arquivo" },
          { label: "Customization", section: "temas" },
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
        label: "Mark-Lee / Desktop application",
        titleLines: ["Editor.", "Memories.", "Markdown."],
        accentLine: 1,
        description:
          "A Markdown editor and a memory journal for desktop. Two ways of working with the same local files.",
        primaryCta: "Download Mark-Lee",
        secondaryCta: "See the application",
        facts: [
          ["Systems", "Windows · macOS · Linux"],
          ["Format", "Markdown files on disk"],
          ["License", "MIT"],
          ["Account", "No sign-up required"],
        ],
      },
      stage: {
        index: "01",
        label: "One file · different readings",
        title: "One file, different readings.",
        intro:
          "Editor and Memories open the same file. Changing the reading changes the presentation, not the document.",
        views: [
          {
            id: "editor",
            name: "Editor",
            caption: "The document open inside its folder: tabs, file tree, and Markdown numbered by line.",
          },
          {
            id: "memories",
            name: "Memories",
            caption: "The same file recognized as an entry: properties, title, and sections, in reading mode.",
          },
          {
            id: "source",
            name: "File .md",
            caption: "The text as it sits on disk. The YAML front matter is what Memories reads.",
          },
        ],
        note: "Recreated in code, not a screen capture: the text is selectable and editable in all three readings.",
        chrome: {
          menus: ["File", "Actions", "View"],
          workspace: "Workspace",
          search: "Search workspace",
          saved: "Saved",
          draft: "Draft",
          entries: "Recent entries",
          properties: { record: "Entry", schema: "Schema", tags: "Tags", file: "File" },
          nav: {
            newEntry: "New entry",
            registry: "Entries",
            byDay: "On this day",
            favorites: "Favorites",
            tags: "Tags",
            ranges: ["Day", "Week", "Month", "All"],
          },
          listViews: ["List", "Calendar", "Gallery", "Places"],
          metadata: "Metadata",
          words: "words",
        },
      },
      files: {
        index: "02",
        label: "Storage",
        title: "The file comes first.",
        text:
          "Mark-Lee works with local folders and Markdown files. The Editor opens documents; Memories recognizes entries that carry metadata and lets you browse them by date and other attributes. The files stay readable outside the application.",
        caveat:
          "Memories only lists files with front matter in the marklee-entry schema. A plain .md file stays available in the Editor.",
        folderLabel: "Folder",
        note: "Illustrative example. Fictional content in the marklee-entry schema.",
      },
      tools: {
        label: "Features",
        title: "Writing tools.",
        rows: [
          {
            n: "01",
            name: "Editor",
            text: "Folders, tabs, search, preview, commands, and Zen mode.",
          },
          {
            n: "02",
            name: "Memories",
            text: "Dated entries, calendar, reading, gallery, and map when there is a location.",
          },
          {
            n: "03",
            name: "Export",
            text: "Output formats available in the published version.",
          },
          {
            n: "04",
            name: "Control",
            text: "Saving, themes, and keyboard navigation.",
          },
        ],
      },
      themes: {
        index: "03",
        label: "Customization",
        title: "The interface changes. The files do not.",
        text:
          "Choosing a theme changes colors and reading inside the application. The file content stays the same.",
        note: "The twelve themes shipped with the application, using the colors declared in the code.",
        sampleLabel: "The same entry in every theme",
      },
      code: {
        index: "04",
        label: "Code and license",
        title: "Open code. Open format.",
        text:
          "Mark-Lee is distributed under the MIT license. Its code can be inspected, modified, and compiled.",
        stack: [
          ["Application", "Tauri 2"],
          ["Core", "Rust"],
          ["Interface", "React · TypeScript"],
          ["License", "MIT"],
        ],
        cta: "Source code",
      },
      download: {
        label: "Download · stable release",
        cta: "See download options",
        formats: {
          windows: ".exe / .msi installers, as published in the release",
          macos: ".app.tar.gz package, as published in the release",
          linux: ".deb · .AppImage · .rpm, as published in the release",
        },
        license: "Mark-Lee · MIT license",
        source: "Source code",
      },
    },    gallery: {
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
