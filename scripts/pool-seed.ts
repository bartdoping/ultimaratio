/**
 * Fragenpool mit den Lernplan-Themen vorbefüllen.
 *
 *   npm run pool:seed                          # Probelauf: zeigt Umfang, Modell, Kosten
 *   npm run pool:seed -- --los                 # erzeugt wirklich (kostet Guthaben)
 *
 * Optionen:
 *   --plan m2|m1|alle   Lernplan (Standard: alle)
 *   --stufe 3           Stufe(n), z. B. "3" oder "2,3,4" (Standard: 3)
 *   --pro-thema 1       Zielanzahl aktiver Fragen je Thema und Stufe (Standard: 1)
 *   --limit 100         höchstens so viele Fragen in diesem Lauf
 *   --parallel 4        gleichzeitige Generierungen (Standard: 4)
 *   --env datei         Env-Datei (Standard: .env.local; für Produktion .env.production.local)
 *
 * Abbrechen (Strg+C) ist jederzeit gefahrlos: Ein neuer Lauf erzeugt nur, was fehlt.
 */
import { config } from "dotenv"

const args = process.argv.slice(2)
const arg = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback
}
config({ path: arg("env", ".env.local"), override: true })

async function main() {
  // Erst nach dem Laden der Env importieren — Modell und DB-URL werden beim Import gelesen.
  const { default: prisma } = await import("@/lib/db")
  const { seedJobs, seedTopics } = await import("@/lib/pool-seed")
  const { generateIntoPool } = await import("@/lib/pool-generate")
  const { GENERATOR_MODEL } = await import("@/lib/generator-ai-config")
  const { costUsd, modelPrices } = await import("@/lib/ai-usage")
  const { LEARN_PLAN_IDS, isLearnPlanId } = await import("@/lib/learn-plans")

  const los = args.includes("--los")
  const planArg = arg("plan", "alle")
  const plans = planArg === "alle" ? LEARN_PLAN_IDS : isLearnPlanId(planArg) ? [planArg] : null
  if (!plans) throw new Error(`Unbekannter Plan: ${planArg}`)
  const stufen = arg("stufe", "3").split(",").map((s) => Math.round(Number(s))).filter((s) => s >= 1 && s <= 5)
  const proThema = Math.max(1, Math.round(Number(arg("pro-thema", "1"))))
  const limit = Math.round(Number(arg("limit", "0"))) || Infinity
  const parallel = Math.min(8, Math.max(1, Math.round(Number(arg("parallel", "4")))))

  try {
    const topics = seedTopics(plans)
    const counts = await prisma.poolQuestion.groupBy({
      by: ["topicKey", "difficulty"],
      where: { status: "active", topicKey: { in: topics.map((t) => t.topicKey) } },
      _count: { _all: true },
    })
    const vorhanden = new Map(counts.map((c) => [`${c.topicKey}|${c.difficulty}`, c._count._all]))
    const jobs = seedJobs(topics, vorhanden, stufen, proThema).slice(0, limit)

    // Kosten je Frage: echte Werte aus dieser Datenbank, sonst gemessene Durchschnittswerte.
    const seit = new Date(Date.now() - 30 * 86_400_000)
    const usage = await prisma.aiUsageEvent.groupBy({
      by: ["model", "purpose"],
      where: { createdAt: { gte: seit }, purpose: { in: ["draft", "enrich", "repair", "review", "exclusion"] } },
      _sum: { inputTokens: true, cachedTokens: true, outputTokens: true },
      _count: { _all: true },
    })
    const entwuerfe = usage.filter((u) => u.purpose === "draft").reduce((s, u) => s + u._count._all, 0)
    const preise = modelPrices()
    let jeFrage: number | null = null
    let quelle = "Messwerte"
    if (entwuerfe >= 5) {
      let summe = 0
      let ok = true
      for (const u of usage) {
        const c = costUsd(u.model, { inputTokens: u._sum.inputTokens ?? 0, cachedTokens: u._sum.cachedTokens ?? 0, outputTokens: u._sum.outputTokens ?? 0 }, preise)
        if (c === null) ok = false
        else summe += c
      }
      if (ok) {
        jeFrage = summe / entwuerfe
        quelle = `aus ${entwuerfe} Generierungen der letzten 30 Tage`
      }
    }
    if (jeFrage === null) {
      jeFrage = costUsd(GENERATOR_MODEL, { inputTokens: 25_400, cachedTokens: 19_300, outputTokens: 1_190 }, preise)
      quelle = "gemessener Durchschnitt (25,4k Input, davon 19,3k Cache, 1,2k Output je Frage)"
    }

    const host = (process.env.DATABASE_URL ?? "").match(/@([^/:]+)/)?.[1] ?? "?"
    const minuten = Math.ceil((jobs.length * 18) / parallel / 60)
    console.log(`Datenbank:  ${host}`)
    console.log(`Modell:     ${GENERATOR_MODEL}`)
    console.log(`Themen:     ${topics.length} (${plans.join(", ")}) · Stufe ${stufen.join(", ")} · Ziel ${proThema} je Thema`)
    console.log(`Zu erzeugen: ${jobs.length} Fragen · ca. ${minuten} min bei ${parallel} parallel`)
    console.log(
      jeFrage === null
        ? `Kosten:     unbekannt — Preis für ${GENERATOR_MODEL} fehlt (AI_PRICES_JSON in der Env-Datei setzen)`
        : `Kosten:     ca. ${(jeFrage * jobs.length).toFixed(2)} $ (${(jeFrage * 100).toFixed(2)} ¢ je Frage, ${quelle})`
    )
    // Ohne ausdrückliches Modell fiele der Generator auf ein schwächeres Standardmodell
    // zurück — der Pool bekäme dann Fragen in anderer Qualität als die App erzeugt.
    if (!process.env.OPENAI_MODEL_GENERATOR?.trim()) {
      console.log("\nOPENAI_MODEL_GENERATOR fehlt in der Env-Datei — Lauf gesperrt. Env frisch aus Vercel ziehen.")
      return
    }
    if (!los) {
      console.log("\nProbelauf — nichts erzeugt. Mit --los starten.")
      return
    }
    if (jobs.length === 0) return

    let fertig = 0
    let fehler = 0
    let fehlerInFolge = 0
    let abbruch = false
    let naechster = 0
    process.on("SIGINT", () => {
      abbruch = true
      console.log("\nAbbruch angefordert — laufende Generierungen werden noch beendet.")
    })

    async function arbeiter() {
      while (!abbruch && naechster < jobs.length) {
        const job = jobs[naechster++]
        try {
          const q = await generateIntoPool({ ...job, userId: null, signal: AbortSignal.timeout(120_000) })
          if (q) {
            fertig++
            fehlerInFolge = 0
          } else {
            fehler++
            fehlerInFolge++
          }
        } catch (e) {
          fehler++
          fehlerInFolge++
          console.error(`\n  ${job.topic}: ${(e as Error).message.slice(0, 120)}`)
        }
        // Viele Fehler hintereinander = Guthaben leer oder Dienst gestört → aufhören statt verbrennen.
        if (fehlerInFolge >= 8) {
          abbruch = true
          console.error("\n8 Fehler in Folge — Lauf gestoppt. Guthaben/Status von OpenAI prüfen.")
        }
        process.stdout.write(`\r${fertig} erzeugt · ${fehler} fehlgeschlagen · ${jobs.length - naechster} offen   `)
      }
    }
    await Promise.all(Array.from({ length: parallel }, arbeiter))
    console.log(`\nFertig: ${fertig} neue Poolfragen.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
