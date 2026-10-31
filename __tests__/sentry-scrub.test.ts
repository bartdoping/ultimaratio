import { describe, expect, it } from "vitest"
import type { ErrorEvent } from "@sentry/nextjs"
import { ohneEmail, ohneQuery, scrubEvent } from "@/lib/sentry-scrub"

describe("Fehlerberichte ohne personenbezogene Daten", () => {
  it("entfernt E-Mail-Adressen aus Texten", () => {
    expect(ohneEmail("Mail an max.muster+a@uni-koeln.de scheiterte")).toBe("Mail an [E-Mail] scheiterte")
    expect(ohneEmail("Kein Treffer in user@host oder 3 @ 4")).toBe("Kein Treffer in user@host oder 3 @ 4")
  })

  it("entfernt Tokens aus URLs", () => {
    expect(ohneQuery("https://x.de/api/reminders/unsubscribe?t=geheim#a")).toBe("https://x.de/api/reminders/unsubscribe")
  })

  it("entfernt Nutzer, Cookies, Header und Inhalte", () => {
    const e = scrubEvent({
      type: undefined,
      message: "Fehler für a@b.de",
      user: { id: "1", email: "a@b.de" },
      extra: { body: "x" },
      breadcrumbs: [{ message: "a@b.de" }],
      exception: { values: [{ type: "Error", value: "kein Konto für a@b.de" }] },
      request: {
        url: "https://x.de/a?t=1",
        cookies: { session: "x" },
        headers: { authorization: "Bearer x" },
        data: { password: "x" },
        query_string: "t=1",
      },
    } as ErrorEvent)
    expect(e.user).toBeUndefined()
    expect(e.extra).toBeUndefined()
    expect(e.breadcrumbs).toBeUndefined()
    expect(e.request).toEqual({ url: "https://x.de/a" })
    expect(e.message).toBe("Fehler für [E-Mail]")
    expect(e.exception?.values?.[0].value).toBe("kein Konto für [E-Mail]")
  })
})
