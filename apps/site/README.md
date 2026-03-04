# Mark-Lee Promo Site

Public marketing site for Mark-Lee, built with Vite + React + Tailwind.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router (localized routes)

## Local development

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev      # start dev server
npm run check    # TypeScript check
npm run build    # production build + 404.html fallback
npm run preview  # preview production build
```

## i18n routing

The site uses locale-prefixed URLs with localized slugs:

- `pt-BR`: `/pt-BR`, `/pt-BR/galeria`, `/pt-BR/engenharia`, `/pt-BR/contribuir`, `/pt-BR/faq`, `/pt-BR/downloads`
- `en-US`: `/en-US`, `/en-US/gallery`, `/en-US/engineering`, `/en-US/contributing`, `/en-US/faq`, `/en-US/downloads`
- `es-ES`: `/es-ES`, `/es-ES/galeria`, `/es-ES/ingenieria`, `/es-ES/contribuir`, `/es-ES/faq`, `/es-ES/downloads`

Root `/` redirects to the preferred browser language with fallback to `pt-BR`.

## GitHub Pages

`vite.config.ts` reads `SITE_BASE` to generate correct asset paths for GitHub Pages.

- For user pages: `SITE_BASE=/`
- For project pages: `SITE_BASE=/repo-name/`

Build includes a `dist/404.html` copy of `index.html` to support deep-links on static hosting.
