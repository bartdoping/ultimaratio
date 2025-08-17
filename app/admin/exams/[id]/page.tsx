// app/admin/exams/[id]/page.tsx
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = { params: Promise<{ id: string }> }

async function updateExamAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const id = String(formData.get("id") || "")
  const title = String(formData.get("title") || "")
  const slug  = String(formData.get("slug") || "")
  const description = String(formData.get("description") || "")
  const priceCents = Number(formData.get("priceCents") || 0)
  const passPercent = Number(formData.get("passPercent") || 60)
  const allowImmediateFeedback = formData.get("allowImmediateFeedback") === "on"
  const isPublished = formData.get("isPublished") === "on"
  await prisma.exam.update({ where: { id }, data: { title, slug, description, priceCents, passPercent, allowImmediateFeedback, isPublished } })
  redirect(`/admin/exams/${id}`)
}

async function addQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const stem = String(formData.get("stem") || "")
  const explanation = String(formData.get("explanation") || "")
  const allowImmediate = formData.get("allowImmediate") === "on"
  // einfache Anlage + 4 Optionen
  const q = await prisma.question.create({
    data: { examId, stem, explanation, hasImmediateFeedbackAllowed: allowImmediate, type: "single" }
  })
  const options = [0,1,2,3].map(i => ({
    questionId: q.id,
    text: String(formData.get(`opt${i}`) || `Option ${i+1}`),
    isCorrect: String(formData.get("correct")) === String(i)
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
  // alle falsch setzen, dann eine korrekt
  await prisma.answerOption.updateMany({ where: { questionId: qid }, data: { isCorrect: false } })
  await prisma.answerOption.update({ where: { id: oid }, data: { isCorrect: true } })
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
    create: { url, alt, kind: "image" }
  })
  // anfragen: gibt es schon Link?
  const existing = await prisma.questionMedia.findUnique({ where: { questionId_mediaId: { questionId: qid, mediaId: asset.id } } })
  if (!existing) {
    await prisma.questionMedia.create({ data: { questionId: qid, mediaId: asset.id, order: 0 } })
  }
  redirect(`/admin/exams/${examId}`)
}

async function removeImageFromQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const mid = String(formData.get("mid") || "")
  await prisma.questionMedia.delete({ where: { questionId_mediaId: { questionId: qid, mediaId: mid } } })
  redirect(`/admin/exams/${examId}`)
}

export default async function EditExamPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { id: "asc" },
        include: {
          options: { orderBy: { id: "asc" } },
          media: { include: { media: true }, orderBy: { order: "asc" } }
        }
      }
    }
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

      {/* Fragen-Liste */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Fragen</h2>
        {exam.questions.map(q => (
          <div key={q.id} className="rounded border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{q.stem}</div>
                {q.explanation && <div className="text-sm text-muted-foreground">{q.explanation}</div>}
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

            {/* Bilder */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Bilder</div>
              <div className="flex flex-wrap gap-2">
                {q.media.map(m => (
                  <div key={m.mediaId} className="border rounded p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.media.url} alt={m.media.alt ?? ""} className="h-20 w-28 object-cover" />
                    <form action={removeImageFromQuestionAction} className="mt-1">
                      <input type="hidden" name="examId" value={exam.id} />
                      <input type="hidden" name="qid" value={q.id} />
                      <input type="hidden" name="mid" value={m.mediaId} />
                      <Button variant="outline" size="sm">Entfernen</Button>
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

            {/* Optionen */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Antwortoptionen</div>
              <ul className="space-y-1">
                {q.options.map(o => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <div className={o.isCorrect ? "text-green-600" : ""}>
                      {o.text} {o.isCorrect ? "✓" : ""}
                    </div>
                    <form action={setCorrectOptionAction}>
                      <input type="hidden" name="examId" value={exam.id} />
                      <input type="hidden" name="qid" value={q.id} />
                      <input type="hidden" name="oid" value={o.id} />
                      <Button variant="outline" size="sm">Als korrekt markieren</Button>
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
            <Label>Erklärung (optional)</Label>
            <Input name="explanation" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allowImmediate" /> Sofort-Feedback für diese Frage erlauben
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            <div><Label>Option 1</Label><Input name="opt0" required /></div>
            <div><Label>Option 2</Label><Input name="opt1" required /></div>
            <div><Label>Option 3</Label><Input name="opt2" required /></div>
            <div><Label>Option 4</Label><Input name="opt3" required /></div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Korrekte Option:</span>
            <label className="flex items-center gap-1"><input type="radio" name="correct" value="0" defaultChecked /> 1</label>
            <label className="flex items-center gap-1"><input type="radio" name="correct" value="1" /> 2</label>
            <label className="flex items-center gap-1"><input type="radio" name="correct" value="2" /> 3</label>
            <label className="flex items-center gap-1"><input type="radio" name="correct" value="3" /> 4</label>
          </div>
          <Button type="submit">Frage anlegen</Button>
        </form>
      </div>
    </div>
  )
}
