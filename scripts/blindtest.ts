/**
 * Blindtest auf festem Fragensatz.
 *
 *   npm run blindtest            # misst den gespeicherten Satz (legt ihn beim ersten Mal an)
 *   npm run blindtest -- --neu   # zieht einen neuen Satz
 *   npm run blindtest -- --n 30  # Größe beim Anlegen (Standard 20)
 *
 * Kosten: ein kurzer Modellaufruf pro Frage (~600 Ausgabe-Tokens).
 */
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import prisma from "@/lib/db"
import { payloadToQuestion } from "@/lib/saved-questions"
import { buildExclusionInput } from "@/lib/option-exclusion-check"
import { callOptionExclusionCheck } from "@/lib/generator-openai"
import { blindAuswertung, blindTipp, BLINDTEST_ZIEL, type BlindErgebnis } from "@/lib/blindtest"

const SET = join(process.cwd(), "scripts", "blindtest-set.json")

async function main() {
  const args = process.argv.slice(2)
  const neu = args.includes("--neu")
  const n = Number(args[args.indexOf("--n") + 1]) || 20

  let ids: string[] = []
  if (!neu && existsSync(SET)) ids = JSON.parse(readFileSync(SET, "utf8")) as string[]
  if (ids.length === 0) {
    const alle = await prisma.poolQuestion.findMany({ where: { status: "active" }, select: { id: true } })
    ids = alle.map((a) => a.id).sort(() => Math.random() - 0.5).slice(0, n)
    writeFileSync(SET, JSON.stringify(ids, null, 2))
    console.log(`Neuer Fragensatz mit ${ids.length} Fragen gespeichert: ${SET}`)
  }

  const fragen = await prisma.poolQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, difficulty: true, payload: true } })
  const ergebnisse: BlindErgebnis[] = []
  for (const f of fragen) {
    const q = payloadToQuestion(f.payload)
    if (!q) continue
    const richtig = q.options.findIndex((o) => o.isCorrect)
    const { input, zuordnung } = buildExclusionInput(q)
    const raw = await callOptionExclusionCheck(input).catch((e) => {
      console.error(`  ${f.id}: Aufruf fehlgeschlagen (${(e as Error).message})`)
      return ""
    })
    if (!raw) continue
    const tipp = blindTipp(raw, zuordnung)
    ergebnisse.push({ difficulty: f.difficulty, getroffen: tipp === richtig })
    process.stdout.write(tipp === richtig ? "×" : "·")
  }
  console.log("")

  const a = blindAuswertung(ergebnisse)
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`)
  console.log(`Blind erraten: ${pct(a.gesamt.quote)} von ${a.gesamt.n} (Zufall 20 %, Ziel < ${BLINDTEST_ZIEL * 100} %)`)
  for (const s of a.jeStufe) console.log(`  Stufe ${s.difficulty}: ${pct(s.quote)} (${s.n})`)
  console.log(a.bestanden === null ? "Keine Messung." : a.bestanden ? "✓ bestanden" : "✗ Optionen verraten die Lösung zu oft")
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
