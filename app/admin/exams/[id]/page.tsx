// app/admin/exams/[id]/page.tsx
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import QuestionShelf from "@/components/admin/question-shelf"
import Link from "next/link"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string; qpage?: string }>
}

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

  // Bildfelder (optional) direkt beim Anlegen
  const imageUrl = String(formData.get("imageUrl") || "")
  const imageAlt = String(formData.get("imageAlt") || "")

  const q = await prisma.question.create({
    data: {
      examId,
      stem,
      explanation: explanation || null,
      tip: tip || null,
      hasImmediateFeedbackAllowed: allowImmediate,
      type: "single",
    },
  })

  // 5 Optionen
  const options = [0, 1, 2, 3, 4].map((i) => ({
    questionId: q.id,
    text: String(formData.get(`opt${i}`) || `Option ${i + 1}`),
    explanation: String(formData.get(`optExp${i}`) || "") || null,
    isCorrect: String(formData.get("correct")) === String(i),
  }))
  await prisma.answerOption.createMany({ data: options })

  // Falls Bild mitgegeben -> sofort verknüpfen
  if (imageUrl && imageUrl.startsWith("http")) {
    const asset = await prisma.mediaAsset.upsert({
      where: { url: imageUrl },
      update: { alt: imageAlt || null },
      create: { url: imageUrl, alt: imageAlt || null, kind: "image" },
    })
    const agg = await prisma.questionMedia.aggregate({
      where: { questionId: q.id },
      _max: { order: true },
    })
    const nextOrder = (agg._max.order ?? 0) + 1
    await prisma.questionMedia.create({
      data: { questionId: q.id, mediaId: asset.id, order: nextOrder },
    })
  }

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

// ⬇️ STEM (Fragentitel) jetzt mit bearbeitbar
async function updateQuestionMetaAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const stem = String(formData.get("stem") || "").trim()          // NEU
  const tip = String(formData.get("tip") || "")
  const explanation = String(formData.get("explanation") || "")

  if (!stem) {
    // Optional: Fehlerbehandlung anpassen
    redirect(`/admin/exams/${examId}?edit=${qid}&err=stem-empty`)
  }

  await prisma.question.update({
    where: { id: qid },
    data: {
      stem,                                                       // NEU
      tip: tip || null,
      explanation: explanation || null,
    },
  })
  redirect(`/admin/exams/${examId}?edit=${qid}`)                  // Editor offen lassen
}

async function addImageToQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const url = String(formData.get("url") || "")
  const alt = String(formData.get("alt") || "")

  if (!url || !url.startsWith("http")) {
    redirect(`/admin/exams/${examId}?edit=${qid}`)
  }

  const asset = await prisma.mediaAsset.upsert({
    where: { url },
    update: { alt: alt || null },
    create: { url, alt: alt || null, kind: "image" },
  })

  const agg = await prisma.questionMedia.aggregate({
    where: { questionId: qid },
    _max: { order: true },
  })
  const nextOrder = (agg._max.order ?? 0) + 1

  const existing = await prisma.questionMedia.findUnique({
    where: { questionId_mediaId: { questionId: qid, mediaId: asset.id } },
  })
  if (!existing) {
    await prisma.questionMedia.create({
      data: { questionId: qid, mediaId: asset.id, order: nextOrder },
    })
  }
  redirect(`/admin/exams/${examId}?edit=${qid}`)
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
  redirect(`/admin/exams/${examId}?edit=${qid}`)
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
  redirect(`/admin/exams/${examId}?edit=${qid}`)
}

// ----------------- Page -----------------
export default async function EditExamPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id } = await params
  const { edit } = await searchParams

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { cases: true },
  })
  if (!exam) notFound()

  // Falls ein einzelnes „edit“-Ziel gewählt wurde, lade genau diese Frage zur Bearbeitung
  const editing = edit
    ? await prisma.question.findUnique({
        where: { id: edit },
        include: {
          options: { orderBy: { id: "asc" } },
          media: { include: { media: true }, orderBy: { order: "asc" } },
        },
      })
    : null

  const editingValid = editing && editing.examId === id ? editing : null

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prüfung bearbeiten</h1>
        <Link href="/admin" className="text-sm underline text-muted-foreground">Zur Übersicht</Link>
      </div>

      {/* Fragen-Regal (hover zeigt Vorschau; Klick öffnet Editor) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fragen-Regal</h2>
          <span className="text-sm text-muted-foreground">Hover = Vorschau · Drag&Drop = Reihenfolge</span>
        </div>
        <QuestionShelf examId={id} />
      </section>

      {/* Editor für genau EINE Frage (nur wenn gewählt) */}
      {editingValid && (
        <section className="rounded border p-4 space-y-4" id="edit-question">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Frage bearbeiten</div>
              <div className="text-sm text-muted-foreground mt-1">{editingValid.stem}</div>
            </div>
            <Link href={`/admin/exams/${id}`} className="text-sm underline text-muted-foreground">
              Schließen
            </Link>
          </div>

          {/* Fall-Zuordnung */}
          <form action={assignCaseToQuestionAction} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="examId" value={id} />
            <input type="hidden" name="qid" value={editingValid.id} />
            <label className="text-sm">Fall:</label>
            <select name="caseId" className="input" defaultValue={editingValid.caseId ?? ""}>
              <option value="">– keiner –</option>
              {exam.cases
                ?.sort((a, b) => a.order - b.order)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.order} – {c.title}
                  </option>
                ))}
            </select>
            <button className="btn btn-sm" type="submit">Zuordnen</button>
          </form>

          {/* Frage-Meta (inkl. STEM) */}
          <form action={updateQuestionMetaAction} className="grid gap-2">
            <input type="hidden" name="examId" value={id} />
            <input type="hidden" name="qid" value={editingValid.id} />

            {/* NEU: Fragentitel (Stem) editierbar */}
            <div>
              <Label>Fragentitel (Stem)</Label>
              <Input
                name="stem"
                defaultValue={editingValid.stem}
                required
                placeholder="Fragestellung (Stem)…"
              />
            </div>

            <div>
              <Label>Oberarztkommentar (optional)</Label>
              <Input name="tip" defaultValue={editingValid.tip ?? ""} placeholder="Hinweis/Tipp zur Lösung" />
            </div>
            <div>
              <Label>Zusammenfassende Erläuterung</Label>
              <textarea
                name="explanation"
                className="input w-full h-24"
                defaultValue={editingValid.explanation ?? ""}
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
              {editingValid.media.map((m) => (
                <div key={m.media.id} className="border rounded p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.media.url} alt={m.media.alt ?? ""} className="h-20 w-28 object-cover" />
                  <form action={removeImageFromQuestionAction} className="mt-1">
                    <input type="hidden" name="examId" value={id} />
                    <input type="hidden" name="qid" value={editingValid.id} />
                    <input type="hidden" name="mid" value={m.media.id} />
                    <Button variant="outline" size="sm">Entfernen</Button>
                  </form>
                </div>
              ))}
            </div>
            <form action={addImageToQuestionAction} className="flex items-end gap-2">
              <input type="hidden" name="examId" value={id} />
              <input type="hidden" name="qid" value={editingValid.id} />
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
          <div className="space-y-2">
            <div className="text-sm font-medium">Antwortoptionen</div>
            <ul className="space-y-2">
              {editingValid.options.map((o) => (
                <li key={o.id} className="rounded border p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className={o.isCorrect ? "text-green-600 font-medium" : ""}>
                      {o.text} {o.isCorrect ? "✓" : ""}
                    </div>
                    <form action={setCorrectOptionAction}>
                      <input type="hidden" name="examId" value={id} />
                      <input type="hidden" name="qid" value={editingValid.id} />
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
                    <input type="hidden" name="examId" value={id} />
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

          {/* Löschen */}
          <div className="pt-2">
            <form action={deleteQuestionAction}>
              <input type="hidden" name="examId" value={id} />
              <input type="hidden" name="qid" value={editingValid.id} />
              <Button variant="destructive">Frage löschen</Button>
            </form>
          </div>
        </section>
      )}

      {/* Exam-Metadaten */}
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
        <Button type="submit">Prüfungsdaten speichern</Button>
      </form>

      {/* Neue Frage anlegen (mit Bild & 5 Optionen) */}
      <div className="rounded border p-3 space-y-2" id="new-question">
        <h3 className="font-medium">Neue Frage</h3>
        <form action={addQuestionAction} className="space-y-3">
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

          {/* Bild bereits beim Erstellen */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Bild-URL (optional)</Label>
              <Input name="imageUrl" placeholder="https://…" />
            </div>
            <div>
              <Label>Alt-Text (optional)</Label>
              <Input name="imageAlt" placeholder="Beschreibung" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <Label>Option {i + 1}</Label>
                <Input name={`opt${i}`} required />
                <Label className="text-xs text-muted-foreground">Erklärung zu Option {i + 1} (optional)</Label>
                <Input name={`optExp${i}`} placeholder="Warum richtig/falsch?" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span>Korrekte Option:</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <label key={i} className="flex items-center gap-1">
                <input type="radio" name="correct" value={String(i)} defaultChecked={i === 0} /> {i + 1}
              </label>
            ))}
          </div>

          <Button type="submit">Frage anlegen</Button>
        </form>
      </div>
    </div>
  )
}