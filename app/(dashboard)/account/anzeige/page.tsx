import { cookies } from "next/headers"
import { SettingsShell } from "@/components/settings/settings-shell"
import { FontScalePicker } from "@/components/settings/font-scale-picker"
import {
  FONT_SCALE_COOKIE,
  FONT_SCALE_DEFAULT,
  isFontScale,
} from "@/lib/font-scale"

export const dynamic = "force-dynamic"

export default async function AnzeigeSettingsPage() {
  const jar = await cookies()
  const raw = jar.get(FONT_SCALE_COOKIE)?.value
  const scale = isFontScale(raw) ? raw : FONT_SCALE_DEFAULT

  return (
    <SettingsShell
      title="Anzeige"
      description="Schriftgröße und Theme — wichtig für lange Lern-Sessions."
    >
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Schriftgröße</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Skaliert die gesamte Plattform. Klein wirkt kompakter,
          Groß ist Augen-freundlich bei vielen Stunden Lernen.
        </p>
        <div className="mt-4">
          <FontScalePicker initialScale={scale} />
        </div>
      </section>
    </SettingsShell>
  )
}
