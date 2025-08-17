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