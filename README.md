# UltimaRatio – IMPP Coach (M1)

**Status:** M1 (Projektgerüst, Routen, Dev‑Auth). Nicht für Produktion.

## Lokale Entwicklung (Mac)
1. Node LTS via nvm installieren (siehe Anleitung M1).
2. Repository erstellen:
   ```bash
   npx create-next-app@latest ultimaratio --typescript --eslint --tailwind
   cd ultimaratio
   pnpm add zod zustand @tanstack/react-query lucide-react clsx tailwind-merge
   pnpm dlx shadcn@latest init -y
   pnpm dlx shadcn@latest add button card input label avatar dialog dropdown-menu sheet navigation-menu badge table progress separator alert

   ## Qualität, Tests & Sicherheit (M8)

- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Tests:** `pnpm test` (Coverage: `pnpm coverage`)
- **Security-Header:** via `middleware.ts` (CSP, HSTS in Prod, XFO, XCTO, Referrer, Permissions)
- **Rate-Limit (Dev):** 20 Requests / 10s für /api/auth/*, /api/attempts*, /api/history*, /api/stripe/webhook
- **CSRF/Origin-Check:** `assertSameOrigin(req)` in kritischen POST/DELETE APIs
