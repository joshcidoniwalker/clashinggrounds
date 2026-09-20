---
paths:
  - "frontend/**/*.{ts,tsx}"
---

# Next.js conventions

- App Router (`app/` directory) — never the Pages Router.
- React Server Components by default. Only opt into Client Components (`"use client"`) where interactivity requires it (forms, sockets, browser APIs).
- TypeScript `strict: true`, no implicit `any`.
- Format/lint with Prettier + ESLint.
