// app/admin/exams/[id]/page.tsx
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = { params: Promise<{ id: string }> }

// ----------------- Actions -----------------
async function updateExamAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const id = String(formData.get("id") || "")
  const title = String(formData.get("title") || "")
  const slug = String(formData.get("slug") || "")
  const description = String(formData.get("description") || "")
  const priceCents = Number(formData.get("priceCents") || 0)
  const passPercent = Number(formData.get("passPercent") || 60)
  const allowImmediateFeedback = formData.get("allowImmediateFeedback") === "on"
  const isPublished = formData.get("isPublished") === "on"

  await prisma.exam.update({
    where: { id },
    data: {
      title,
      slug,
      description,
      priceCents,
      passPercent,
      allowImmediateFeedback,
      isPublished,
    },
  })
  redirect(`/admin/exams/${id}`)
}

async function addQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const stem = String(formData.get("stem") || "")
  const explanation = String(formData.get("explanation") || "")
  const tip = String(formData.get("tip") || "")
  const allowImmediate = formData.get("allowImmediate") === "on"

  const q = await prisma.question.create({
    data: {
      examId,
      stem,
      explanation: explanation || null, // zusammenfassende Erläuterung
      tip: tip || null,                 // Oberarztkommentar
      hasImmediateFeedbackAllowed: allowImmediate,
      type: "single",
    },
  })

  const options = [0, 1, 2, 3].map((i) => ({
    questionId: q.id,
    text: String(formData.get(`opt${i}`) || `Option ${i + 1}`),
    explanation: String(formData.get(`optExp${i}`) || "") || null, // NEU
    isCorrect: String(formData.get("correct")) === String(i),
  }))
  await prisma.answerOption.createMany({ data: options })
  redirect(`/admin/exams/${examId}`)
}

async function deleteQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  await prisma.question.delete({ where: { id: qid } })
  redirect(`/admin/exams/${examId}`)
}

async function setCorrectOptionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const oid = String(formData.get("oid") || "")
  await prisma.answerOption.updateMany({
    where: { questionId: qid },
    data: { isCorrect: false },
  })
  await prisma.answerOption.update({ where: { id: oid }, data: { isCorrect: true } })
  redirect(`/admin/exams/${examId}`)
}

async function updateOptionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const oid = String(formData.get("oid") || "")
  const text = String(formData.get("text") || "")
  const explanation = String(formData.get("explanation") || "")
  await prisma.answerOption.update({
    where: { id: oid },
    data: { text, explanation: explanation || null },
  })
  redirect(`/admin/exams/${examId}`)
}

async function updateQuestionMetaAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const tip = String(formData.get("tip") || "")
  const explanation = String(formData.get("explanation") || "")
  await prisma.question.update({
    where: { id: qid },
    data: { tip: tip || null, explanation: explanation || null },
  })
  redirect(`/admin/exams/${examId}`)
}

async function addImageToQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const url = String(formData.get("url") || "")
  const alt = String(formData.get("alt") || "")

  const asset = await prisma.mediaAsset.upsert({
    where: { url },
    update: { alt },
    create: { url, alt, kind: "image" },
  })

  const existing = await prisma.questionMedia.findUnique({
    where: { questionId_mediaId: { questionId: qid, mediaId: asset.id } },
  })
  if (!existing) {
    await prisma.questionMedia.create({
      data: { questionId: qid, mediaId: asset.id, order: 0 },
    })
  }
  redirect(`/admin/exams/${examId}`)
}

async function removeImageFromQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const mid = String(formData.get("mid") || "")
  await prisma.questionMedia.delete({
    where: { questionId_mediaId: { questionId: qid, mediaId: mid } },
  })
  redirect(`/admin/exams/${examId}`)
}

// Fälle
async function createCaseAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const title = String(formData.get("title") || "")
  const vignette = String(formData.get("vignette") || "")
  const order = Number(formData.get("order") || 0)
  await prisma.questionCase.create({ data: { examId, title, vignette, order } })
  redirect(`/admin/exams/${examId}`)
}

async function assignCaseToQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const caseId = String(formData.get("caseId") || "")
  await prisma.question.update({
    where: { id: qid },
    data: { caseId: caseId || null },
  })
  redirect(`/admin/exams/${examId}`)
}

// ----------------- Page -----------------
export default async function EditExamPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      cases: true,
      questions: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          stem: true,
          explanation: true,
          tip: true,
          caseId: true,
          hasImmediateFeedbackAllowed: true,
          options: {
            orderBy: { id: "asc" },
            select: { id: true, text: true, isCorrect: true, explanation: true },
          },
          media: { include: { media: true }, orderBy: { order: "asc" } },
        },
      },
    },
  })
  if (!exam) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Prüfung bearbeiten</h1>

      {/* Exam-Form */}
      <form action={updateExamAction} className="space-y-3 rounded border p-3">
        <input type="hidden" name="id" value={exam.id} />
        <div>
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" defaultValue={exam.title} />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={exam.slug} />
        </div>
        <div>
          <Label htmlFor="description">Beschreibung</Label>
          <Input id="description" name="description" defaultValue={exam.description ?? ""} />
        </div>
        <div className="flex gap-3">
          <div className="grow">
            <Label htmlFor="priceCents">Preis (Cent)</Label>
            <Input id="priceCents" name="priceCents" type="number" defaultValue={exam.priceCents} />
          </div>
          <div className="grow">
            <Label htmlFor="passPercent">Bestehensgrenze (%)</Label>
            <Input id="passPercent" name="passPercent" type="number" defaultValue={exam.passPercent} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allowImmediateFeedback" defaultChecked={exam.allowImmediateFeedback} />
            Sofort-Feedback global
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isPublished" defaultChecked={exam.isPublished} />
            Veröffentlicht
          </label>
        </div>
        <Button type="submit">Speichern</Button>
      </form>

      {/* Fälle verwalten */}
      <div className="rounded border p-3 space-y-3">
        <h2 className="text-lg font-medium">Fälle</h2>

        {exam.cases?.length ? (
          <ul className="space-y-1">
            {exam.cases.sort((a, b) => a.order - b.order).map((c) => (
              <li key={c.id} className="rounded border px-3 py-2">
                <div className="font-medium">
                  {c.title} <span className="text-xs text-muted-foreground">(# {c.order})</span>
                </div>
                {c.vignette && (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {c.vignette}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Fälle.</p>
        )}

        <form action={createCaseAction} className="grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="examId" value={exam.id} />
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Titel</label>
            <input className="input w-full" name="title" required />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Vignette (optional)</label>
            <textarea className="input w-full h-24" name="vignette" />
          </div>
          <div>
            <label className="text-sm font-medium">Reihenfolge</label>
            <input className="input w-full" type="number" name="order" defaultValue={0} />
          </div>
          <div className="sm:col-span-2">
            <button className="btn">Fall anlegen</button>
          </div>
        </form>
      </div>

      {/* Fragen-Liste */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Fragen</h2>

        {exam.questions.map((q) => (
          <div key={q.id} className="rounded border p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium">{q.stem}</div>
                {q.explanation && (
                  <div className="text-sm text-muted-foreground">
                    Erklärung: {q.explanation}
                  </div>
                )}
                {q.tip && (
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Oberarztkommentar: {q.tip}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Sofort-Feedback: {q.hasImmediateFeedbackAllowed ? "erlaubt" : "deaktiviert"}
                </div>
              </div>
              <form action={deleteQuestionAction}>
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="qid" value={q.id} />
                <Button variant="destructive">Frage löschen</Button>
              </form>
            </div>

            {/* Fall-Zuordnung */}
            <form action={assignCaseToQuestionAction} className="flex items-center gap-2 text-sm">
              <input type="hidden" name="examId" value={exam.id} />
              <input type="hidden" name="qid" value={q.id} />
              <label className="text-sm">Fall:</label>
              <select name="caseId" className="input" defaultValue={q.caseId ?? ""}>
                <option value="">– keiner –</option>
                {exam.cases
                  ?.sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.order} – {c.title}
                    </option>
                  ))}
              </select>
              <button className="btn btn-sm" type="submit">
                Zuordnen
              </button>
            </form>

            {/* Frage-Meta (Tip & Gesamterklärung) */}
            <form action={updateQuestionMetaAction} className="grid gap-2">
              <input type="hidden" name="examId" value={exam.id} />
              <input type="hidden" name="qid" value={q.id} />
              <div>
                <Label>Oberarztkommentar (optional)</Label>
                <Input name="tip" defaultValue={q.tip ?? ""} placeholder="Hinweis/Tipp zur Lösung" />
              </div>
              <div>
                <Label>Zusammenfassende Erläuterung</Label>
                <textarea
                  name="explanation"
                  className="input w-full h-24"
                  defaultValue={q.explanation ?? ""}
                  placeholder="Erklärung zur Frage…"
                />
              </div>
              <div>
                <Button type="submit" variant="outline">Frage-Info speichern</Button>
              </div>
            </form>

            {/* Bilder */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Bilder</div>
              <div className="flex flex-wrap gap-2">
                {q.media.map((m) => (
                  <div key={m.media.id} className="border rounded p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.media.url}
                      alt={m.media.alt ?? ""}
                      className="h-20 w-28 object-cover"
                    />
                    <form action={removeImageFromQuestionAction} className="mt-1">
                      <input type="hidden" name="examId" value={exam.id} />
                      <input type="hidden" name="qid" value={q.id} />
                      <input type="hidden" name="mid" value={m.media.id} />
                      <Button variant="outline" size="sm">
                        Entfernen
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
              <form action={addImageToQuestionAction} className="flex items-end gap-2">
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="qid" value={q.id} />
                <div className="grow">
                  <Label>Bild-URL</Label>
                  <Input name="url" placeholder="https://..." />
                </div>
                <div className="grow">
                  <Label>Alt-Text</Label>
                  <Input name="alt" placeholder="Beschreibung" />
                </div>
                <Button type="submit">Hinzufügen</Button>
              </form>
            </div>

            {/* Optionen inkl. Bearbeiten & Erklärung */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Antwortoptionen</div>
              <ul className="space-y-2">
                {q.options.map((o) => (
                  <li key={o.id} className="rounded border p-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className={o.isCorrect ? "text-green-600 font-medium" : ""}>
                        {o.text} {o.isCorrect ? "✓" : ""}
                      </div>
                      <form action={setCorrectOptionAction}>
                        <input type="hidden" name="examId" value={exam.id} />
                        <input type="hidden" name="qid" value={q.id} />
                        <input type="hidden" name="oid" value={o.id} />
                        <Button variant="outline" size="sm">Als korrekt</Button>
                      </form>
                    </div>

                    {o.explanation && (
                      <div className="text-xs text-muted-foreground">
                        Aktuelle Erklärung: {o.explanation}
                      </div>
                    )}

                    <form action={updateOptionAction} className="grid gap-2 sm:grid-cols-2">
                      <input type="hidden" name="examId" value={exam.id} />
                      <input type="hidden" name="oid" value={o.id} />
                      <div className="sm:col-span-2">
                        <Label>Optionstext</Label>
                        <Input name="text" defaultValue={o.text} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Erklärung (warum richtig/falsch)</Label>
                        <Input
                          name="explanation"
                          defaultValue={o.explanation ?? ""}
                          placeholder="Erklärung zur Option…"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Button variant="outline" size="sm" type="submit">Option speichern</Button>
                      </div>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Neue Frage anlegen */}
      <div className="rounded border p-3 space-y-2">
        <h3 className="font-medium">Neue Frage</h3>
        <form action={addQuestionAction} className="space-y-2">
          <input type="hidden" name="examId" value={exam.id} />
          <div>
            <Label>Fragestellung (Stem)</Label>
            <Input name="stem" required />
          </div>
          <div>
            <Label>Oberarztkommentar (optional)</Label>
            <Input name="tip" placeholder="Hinweis/Tipp zur Lösung" />
          </div>
          <div>
            <Label>Zusammenfassende Erläuterung</Label>
            <textarea name="explanation" className="input w-full h-24" placeholder="Erklärung zur Frage…" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allowImmediate" /> Sofort-Feedback für diese Frage erlauben
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <Label>Option {i + 1}</Label>
                <Input name={`opt${i}`} required />
                <Label className="text-xs text-muted-foreground">Erklärung zu Option {i + 1}</Label>
                <Input name={`optExp${i}`} placeholder="Warum richtig/falsch?" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span>Korrekte Option:</span>
            <label className="flex items-center gap-1">
              <input type="radio" name="correct" value="0" defaultChecked /> 1
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="correct" value="1" /> 2
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="correct" value="2" /> 3
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="correct" value="3" /> 4
            </label>
          </div>
          <Button type="submit">Frage anlegen</Button>
        </form>
      </div>
    </div>
  )
}