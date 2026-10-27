import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { payloadToQuestion } from "@/lib/saved-questions"

export const dynamic = "force-dynamic"

/**
 * Gemeldete Fragen: alles, was Nutzer beanstandet haben, mit Lösung,
 * Antwortstatistik und den Meldetexten — und zwei Knöpfen: zurückziehen
 * oder als geprüft markieren. Ab 3 Meldungen zieht das System eine Frage
 * ohnehin selbst zurück; hier landet alles darunter.
 */

async function nurAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/")
}

async function zurueckziehen(form: FormData) {
  "use server"
  await nurAdmin()
  const id = String(form.get("id") ?? "")
  await prisma.poolQuestion.updateMany({ where: { id }, data: { status: "retired", retiredReason: "admin_geprueft_fehlerhaft" } })
  revalidatePath("/admin/meldungen")
}

async function alsKorrekt(form: FormData) {
  "use server"
  await nurAdmin()
  const id = String(form.get("id") ?? "")
  await prisma.poolQuestion.updateMany({ where: { id }, data: { reportCount: 0 } })
  revalidatePath("/admin/meldungen")
}

export default async function MeldungenPage() {
  await nurAdmin()
  const fragen = await prisma.poolQuestion.findMany({
    where: { reportCount: { gt: 0 }, status: "active" },
    orderBy: [{ reportCount: "desc" }, { createdAt: "desc" }],
    take: 50,
  })
  const zurueckgezogen = await prisma.poolQuestion.count({ where: { status: "retired", retiredReason: { contains: "Meld" } } })

  const mitMeldungen = await Promise.all(
    fragen.map(async (f) => {
      const meldungen = await prisma.userFeedback.findMany({
        where: { category: "question", message: { contains: f.stem.slice(0, 80) } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, message: true, createdAt: true },
      })
      return { f, q: payloadToQuestion(f.payload), meldungen }
    })
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Gemeldete Fragen</h1>
        <p className="text-sm text-muted-foreground">
          {fragen.length} aktive Frage(n) mit Meldungen · automatisch zurückgezogen (≥ 3 Meldungen): {zurueckgezogen}
        </p>
      </div>

      {mitMeldungen.length === 0 && (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">Keine offenen Meldungen.</div>
      )}

      {mitMeldungen.map(({ f, q, meldungen }) => {
        const quote = f.answeredCount > 0 ? Math.round((f.correctCount / f.answeredCount) * 100) : null
        return (
          <article key={f.id} className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-700 dark:text-red-300">
                {f.reportCount} Meldung{f.reportCount > 1 ? "en" : ""}
              </span>
              <span>{f.topic}</span>
              <span>· Stufe {f.difficulty}</span>
              <span>· {f.answeredCount} Antworten{quote !== null ? `, ${quote} % richtig` : ""}</span>
              <a href={`/f/${f.id}`} target="_blank" rel="noreferrer" className="underline">
                ansehen
              </a>
            </div>
            {q?.caseVignette && <p className="text-sm text-muted-foreground">{q.caseVignette}</p>}
            <p className="text-sm font-medium">{f.stem}</p>
            {q && (
              <ul className="space-y-1 text-sm">
                {q.options.map((o, i) => (
                  <li key={i} className={o.isCorrect ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}>
                    {String.fromCharCode(65 + i)}) {o.text}
                    {o.isCorrect ? "  ✓" : ""}
                  </li>
                ))}
              </ul>
            )}
            {meldungen.length > 0 && (
              <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-xs">
                {meldungen.map((m) => (
                  <div key={m.id} className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">{m.createdAt.toLocaleDateString("de-DE")}: </span>
                    {m.message.split("\nFrage:")[0].slice(0, 400)}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={zurueckziehen}>
                <input type="hidden" name="id" value={f.id} />
                <button className="h-9 rounded-full bg-red-600 px-4 text-sm font-semibold text-white">Zurückziehen</button>
              </form>
              <form action={alsKorrekt}>
                <input type="hidden" name="id" value={f.id} />
                <button className="h-9 rounded-full border px-4 text-sm font-medium hover:bg-muted">Geprüft, ist korrekt</button>
              </form>
            </div>
          </article>
        )
      })}
    </div>
  )
}
