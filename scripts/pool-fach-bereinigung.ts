/**
 * Fragenpool bereinigen: Fragen zurückziehen, die mit dem alten Auftrag
 * erzeugt wurden und deren Thema zu einem Fach gehört, das damals fachfremde
 * Pflichtvorgaben bekam (z. B. Anatomiethemen, die als Physiologie-/
 * Biochemiefrage herauskamen; Rechtsmedizin mit Patienten-Archetypen).
 *
 * Einmalig auszuführen, bevor bzw. sobald der fachbezogene Auftrag live ist.
 * Optional --vor 2026-10-27T15:00:00+01:00: nur Fragen, die davor entstanden.
 *
 *   npm run pool:fach-bereinigung -- --env .env.production.local          # Probelauf: zählt nur
 *   npm run pool:fach-bereinigung -- --env .env.production.local --los    # zieht zurück
 *
 * Zurückgezogene Fragen werden nicht mehr ausgeliefert; bei Bedarf entsteht
 * mit dem korrigierten Auftrag eine neue. Antworten und "Meine Fragen" der
 * Nutzer bleiben unberührt.
 */
import { config } from "dotenv"

const args = process.argv.slice(2)
const arg = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback
}
config({ path: arg("env", ".env.local"), override: true })

/**
 * Betroffen war, was Vorgaben aus einem fremden Fach bekam:
 *  - Vorklinik: alles außer Biochemie/Physiologie (der alte Topf war genau diese beiden),
 *  - klinische Querschnittsfächer (bekamen Patienten-Archetypen),
 *  - nicht: klinische Krankheitsbilder, auch nicht als freies Thema ("auto").
 */
function betroffen(section: string, d: string): boolean {
  if (d === "biochemie" || d === "physiologie" || d === "klinik") return false
  if (d === "klinik_quer") return true
  if (d === "allgemein") return section === "vorklinik"
  return true
}

async function main() {
  const { default: prisma } = await import("@/lib/db")
  const { bestimmeDisziplin } = await import("@/lib/disziplin")
  const los = args.includes("--los")
  try {
    const vor = new Date(arg("vor", new Date().toISOString()))
    const fragen = await prisma.poolQuestion.findMany({
      where: { status: "active", createdAt: { lt: vor } },
      select: { id: true, topic: true, section: true },
    })
    const jeFach = new Map<string, number>()
    const ids: string[] = []
    for (const f of fragen) {
      const sec = f.section === "vorklinik" || f.section === "klinik" ? f.section : "auto"
      const d = bestimmeDisziplin(f.topic, sec)
      if (!betroffen(sec, d)) continue
      ids.push(f.id)
      jeFach.set(d, (jeFach.get(d) ?? 0) + 1)
    }
    const host = (process.env.DATABASE_URL ?? "").match(/@([^/:]+)/)?.[1] ?? "?"
    console.log(`Datenbank: ${host}`)
    console.log(`Aktive Poolfragen erzeugt vor ${vor.toISOString()}: ${fragen.length}`)
    console.log(`Davon betroffen: ${ids.length}`)
    for (const [d, n] of [...jeFach.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${d}: ${n}`)
    if (!los) {
      console.log("\nProbelauf — nichts geändert. Mit --los zurückziehen.")
      return
    }
    let n = 0
    for (let i = 0; i < ids.length; i += 500) {
      const r = await prisma.poolQuestion.updateMany({
        where: { id: { in: ids.slice(i, i + 500) }, status: "active" },
        data: { status: "retired", retiredReason: "fachfremd_vor_korrektur" },
      })
      n += r.count
    }
    console.log(`\n${n} Fragen zurückgezogen.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
