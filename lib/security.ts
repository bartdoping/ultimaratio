// lib/security.ts
export function assertSameOrigin(req: Request) {
    const origin = req.headers.get("origin")
    const host = req.headers.get("host")
    if (!origin || !host) return // SSR/CLI/Webhook dürfen weiter
    const url = new URL(origin)
    if (url.host !== host) {
      const err = new Error("Invalid origin")
      ;(err as any).status = 403
      throw err
    }
  }
  