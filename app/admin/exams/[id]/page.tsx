// app/admin/exams/[id]/page.tsx
import prisma from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { redirect, notFound } from "next/navigation"
import { applyGlobalTagsToAllQuestions } from "@/lib/apply-global-tags"
import { initCategoriesTables } from "@/lib/init-categories-tables"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import QuestionForm from "@/components/admin/question-form"
import QuestionEditorWrapper from "@/components/admin/question-editor-wrapper"
import QuestionShelf from "@/components/admin/question-shelf"
import QuestionEditorTags from "@/components/admin/question-editor-tags"
import ExamGlobalTags from "@/components/admin/exam-global-tags"
import ImageUpload from "@/components/admin/image-upload"
import NewQuestionForm from "@/components/admin/new-question-form"
import JsonUploadSimple from "@/components/admin/json-upload-simple"
import JsonUploadForm from "@/components/admin/json-upload-form"
import Link from "next/link"

/**
 * Diese Seite:
 * - zeigt links: Fragen-Regal (Kästchen, Hover-Vorschau, Drag&Drop mit Paging)
 * - rechts: Bulk-Import (JSON-Format unten dokumentiert)
 * - darunter: optional Editor der aktuell ausgewählten Frage (?edit=frageId)
 * - ganz unten: Exam-Metadaten
 * - ganz unten: "Neue Frage" (inkl. Bild & 5 Optionen)
 */

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
  const passPercent = Number(formData.get("passPercent") || 60)
  const isPublished = formData.get("isPublished") === "on"
  const categoryId = String(formData.get("categoryId") || "")

  await prisma.exam.update({
    where: { id },
    data: {
      title,
      slug,
      description,
      passPercent,
      allowImmediateFeedback: true,
      isPublished,
      categoryId: categoryId || null,
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

  // Bildfelder (optional) direkt beim Anlegen - unterstütze mehrere Bilder
  const images: Array<{ url: string; alt: string }> = []
  let index = 0
  while (formData.get(`imageUrl_${index}`)) {
    const url = String(formData.get(`imageUrl_${index}`) || "")
    const alt = String(formData.get(`imageAlt_${index}`) || "")
    if (url && url.startsWith("http")) {
      images.push({ url, alt })
    }
    index++
  }

  const q = await prisma.question.create({
    data: {
      examId,
      stem,
      explanation: explanation || null,
      tip: tip || null,
      hasImmediateFeedbackAllowed: allowImmediate,
      type: "single",
      // Reihung ans Ende:
      order:
        (await prisma.question.aggregate({
          where: { examId },
          _max: { order: true },
        }))._max.order ?? 0 + 1,
    },
  })

  // Automatisch globale Tags hinzufügen
  const globalTags = await prisma.examGlobalTag.findMany({
    where: { examId },
    select: { tagId: true }
  })

  if (globalTags.length > 0) {
    await prisma.questionTag.createMany({
      data: globalTags.map(gt => ({
        questionId: q.id,
        tagId: gt.tagId
      }))
    })
  }

  // 5 Optionen
  const options = [0, 1, 2, 3, 4].map((i) => ({
    questionId: q.id,
    text: String(formData.get(`option_${i}`) || `Option ${i + 1}`),
    explanation: String(formData.get(`optionExp_${i}`) || "") || null,
    isCorrect: String(formData.get("correct")) === String(i),
    order: i,
  }))
  await prisma.answerOption.createMany({ data: options })

  // Optional sofort Bilder verknüpfen
  if (images.length > 0) {
    const agg = await prisma.questionMedia.aggregate({
      where: { questionId: q.id },
      _max: { order: true },
    })
    let nextOrder = (agg._max.order ?? 0) + 1
    
    for (const image of images) {
      const asset = await prisma.mediaAsset.upsert({
        where: { url: image.url },
        update: { alt: image.alt || null },
        create: { url: image.url, alt: image.alt || null, kind: "image" },
      })
      await prisma.questionMedia.create({
        data: { questionId: q.id, mediaId: asset.id, order: nextOrder++ },
      })
    }
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
  redirect(`/admin/exams/${examId}?edit=${qid}`)
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
  redirect(`/admin/exams/${examId}?edit=${String(formData.get("qid") || "")}`)
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
  redirect(`/admin/exams/${examId}?edit=${qid}`)
}

async function updateQuestionStemAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")
  const stem = String(formData.get("stem") || "")
  await prisma.question.update({
    where: { id: qid },
    data: { stem },
  })
  redirect(`/admin/exams/${examId}?edit=${qid}`)
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

async function duplicateQuestionAction(formData: FormData) {
  "use server"
  await requireAdmin()
  const examId = String(formData.get("examId") || "")
  const qid = String(formData.get("qid") || "")

  await prisma.$transaction(async (tx) => {
    const q = await tx.question.findUnique({
      where: { id: qid },
      include: {
        options: { orderBy: { order: "asc" } },
        media: true,
      },
    })
    if (!q) redirect(`/admin/exams/${examId}`)

    const maxOrder = (await tx.question.aggregate({
      where: { examId },
      _max: { order: true },
    }))._max.order ?? 0

    const q2 = await tx.question.create({
      data: {
        examId: q.examId,
        sectionId: q.sectionId ?? null,
        type: q.type,
        stem: `${q.stem} (Kopie)`,
        explanation: q.explanation ?? null,
        hasImmediateFeedbackAllowed: q.hasImmediateFeedbackAllowed,
        tip: q.tip ?? null,
        caseId: q.caseId ?? null,
        caseOrder: q.caseOrder ?? null,
        order: maxOrder + 1,
      },
    })

    if (q.options.length) {
      await tx.answerOption.createMany({
        data: q.options.map((o) => ({
          questionId: q2.id,
          text: o.text,
          isCorrect: o.isCorrect,
          explanation: o.explanation ?? null,
          order: o.order,
        })),
      })
    }

    if (q.media.length) {
      const agg = await tx.questionMedia.aggregate({
        where: { questionId: q2.id },
        _max: { order: true },
      })
      let next = (agg._max.order ?? 0) + 1
      for (const m of q.media) {
        await tx.questionMedia.create({
          data: { questionId: q2.id, mediaId: m.mediaId, order: next++ },
        })
      }
    }

    redirect(`/admin/exams/${examId}?edit=${q2.id}`)
  })
}

/**
 * BULK-IMPORT
 * Erwartet JSON in diesem Format (Beispiel):
 * {
 *   "cases": [
 *     { "title": "Fall 1", "vignette": "…", "order": 1 }
 *   ],
 *   "questions": [
 *     {
 *       "stem": "Fragetext …",
 *       "tip": "Kommentar…",
 *       "explanation": "Zusammenfassung…",
 *       "allowImmediate": true,
 *       "caseTitle": "Fall 1",            // optional: ordnet Frage an Fall nach Titel
 *       "images": [{ "url": "https://…", "alt": "…" }],
 *       "options": [
 *         { "text": "A", "isCorrect": true, "explanation": "…" },
 *         { "text": "B" },
 *         { "text": "C" }
 *       ]
 *     }
 *   ]
 * }
 */

async function bulkImportAction(formData: FormData) {
  "use server"
  let examId = ""
  try {
    await requireAdmin()
    examId = String(formData.get("examId") || "")
    const raw = String(formData.get("bulk") || "").trim()
    
    if (!raw) {
      console.error("No bulk data provided")
      return { success: false, error: "Keine Daten zum Importieren" }
    }

    let data: any
    try {
      data = JSON.parse(raw)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return { success: false, error: "Ungültiges JSON-Format" }
    }

    const cases: Array<{ title: string; vignette?: string; order?: number }> = Array.isArray(data?.cases)
      ? data.cases
      : []

    const questions: Array<any> = Array.isArray(data?.questions) ? data.questions : []
    if (questions.length === 0 && cases.length === 0) {
      console.error("No questions or cases to import")
      return { success: false, error: "Keine Fragen oder Fälle zum Importieren" }
    }

    // Globale Tags außerhalb der Transaktion laden
    const globalTags = await prisma.examGlobalTag.findMany({
      where: { examId },
      select: { tagId: true }
    })
    console.log(`Found ${globalTags.length} global tags for exam ${examId}`)

    // Transaktion in kleineren Chunks aufteilen (max 5 Fragen pro Transaktion)
    const CHUNK_SIZE = 5
    const questionChunks = []
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      questionChunks.push(questions.slice(i, i + CHUNK_SIZE))
    }

    console.log(`Processing ${questionChunks.length} chunks of questions`)

    // Fälle zuerst außerhalb der Transaktion erstellen
    const titleToCaseId = new Map<string, string>()
    for (const c of cases) {
      const title = String(c?.title || "").trim()
      if (!title) continue
      try {
        const found = await prisma.questionCase.findFirst({
          where: { examId, title },
          select: { id: true },
        })
        if (found) {
          titleToCaseId.set(title, found.id)
          continue
        }
        const order = Number.isFinite(c?.order) ? Number(c.order) : 0
        const created = await prisma.questionCase.create({
          data: { examId, title, vignette: c?.vignette || null, order },
          select: { id: true, title: true },
        })
        titleToCaseId.set(created.title, created.id)
        console.log(`Created case: ${created.title}`)
      } catch (caseError) {
        console.error("Error creating case:", caseError)
        throw new Error(`Fehler beim Erstellen des Falls "${title}": ${caseError}`)
      }
    }

    // Fragen in Chunks verarbeiten
    for (let chunkIndex = 0; chunkIndex < questionChunks.length; chunkIndex++) {
      const chunk = questionChunks[chunkIndex]
      console.log(`Processing chunk ${chunkIndex + 1}/${questionChunks.length} with ${chunk.length} questions`)

      await prisma.$transaction(async (tx) => {
        // neue Fragen anlegen (nur für diesen Chunk)
        for (let i = 0; i < chunk.length; i++) {
          const q = chunk[i]
          const stem = String(q?.stem || "").trim()
          if (!stem) {
            console.log(`Skipping question ${i + 1}: empty stem`)
            continue
          }

          try {
            const maxOrder = (await tx.question.aggregate({
              where: { examId },
              _max: { order: true },
            }))._max.order ?? 0

            const allowImmediate = !!q?.allowImmediate
            const caseTitle = (q?.caseTitle && String(q.caseTitle)) || ""
            const caseId = caseTitle ? titleToCaseId.get(caseTitle) ?? null : null

            const created = await tx.question.create({
              data: {
                examId,
                stem,
                explanation: q?.explanation ? String(q.explanation) : null,
                tip: q?.tip ? String(q.tip) : null,
                hasImmediateFeedbackAllowed: allowImmediate,
                type: "single",
                caseId,
                order: maxOrder + 1,
              },
              select: { id: true },
            })
            console.log(`Created question ${i + 1}: ${stem.substring(0, 50)}...`)

            // Optionen (mindestens 2; max 6 akzeptiert, wir nehmen Reihenfolge wie geliefert)
            const opts: Array<any> = Array.isArray(q?.options) ? q.options : []
            let atLeastOneCorrect = false
            const norm = opts.slice(0, 6).map((o: any, i: number) => {
              const isCorrect = !!o?.isCorrect
              if (isCorrect) atLeastOneCorrect = true
              return {
                questionId: created.id,
                text: String(o?.text || `Option ${i + 1}`),
                isCorrect,
                explanation: o?.explanation ? String(o.explanation) : null,
                order: i,
              }
            })
            if (norm.length < 2) {
              norm.push(
                { questionId: created.id, text: "Option 1", isCorrect: true, explanation: null, order: 0 },
                { questionId: created.id, text: "Option 2", isCorrect: false, explanation: null, order: 1 },
              )
              atLeastOneCorrect = true
            }
            if (!atLeastOneCorrect) {
              // Falls niemand korrekt markiert -> erste korrekt
              norm[0] = { ...norm[0], isCorrect: true }
            }
            await tx.answerOption.createMany({ data: norm })
            console.log(`Created ${norm.length} options for question ${i + 1}`)

            // Automatisch globale Tags hinzufügen (bereits außerhalb der Transaktion geladen)
            if (globalTags.length > 0) {
              await tx.questionTag.createMany({
                data: globalTags.map(gt => ({
                  questionId: created.id,
                  tagId: gt.tagId
                }))
              })
              console.log(`Added ${globalTags.length} global tags to question ${i + 1}`)
            }

            // Bilder
            const images: Array<any> = Array.isArray(q?.images) ? q.images : []
            if (images.length) {
              let next = 1
              for (const img of images) {
                const url = String(img?.url || "")
                if (!url.startsWith("http")) continue
                const asset = await tx.mediaAsset.upsert({
                  where: { url },
                  update: { alt: (img?.alt && String(img.alt)) || null },
                  create: { url, alt: (img?.alt && String(img.alt)) || null, kind: "image" },
                })
                await tx.questionMedia.create({
                  data: { questionId: created.id, mediaId: asset.id, order: next++ },
                })
              }
              console.log(`Added ${images.length} images to question ${i + 1}`)
            }
          } catch (questionError) {
            console.error(`Error creating question ${i + 1}:`, questionError)
            throw new Error(`Fehler beim Erstellen der Frage ${i + 1}: ${questionError}`)
          }
        }
      })
    }

    return { 
      success: true, 
      message: `${questions.length} Fragen und ${cases.length} Fälle erfolgreich importiert`,
      examId 
    }
  } catch (error) {
    console.error("Bulk import error:", error)
    return { success: false, error: "Fehler beim Importieren der Daten" }
  }
}

// ----------------- Page -----------------
export default async function EditExamPage({ params, searchParams }: Props) {
  await requireAdmin()
  
  // Stelle sicher, dass die Tabellen existieren
  await initCategoriesTables()
  
  const { id } = await params
  const { edit } = await searchParams

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { 
      cases: true,
      category: true
    },
  })
  if (!exam) notFound()

  // Lade alle verfügbaren Kategorien
  const categories = await prisma.category.findMany({
    orderBy: [
      { order: "asc" },
      { name: "asc" }
    ]
  })

  // Falls eine Frage explizit editiert werden soll
  const editing = edit
    ? await prisma.question.findUnique({
        where: { id: edit },
        include: {
          options: { orderBy: { order: "asc" } },
          media: { include: { media: true }, orderBy: { order: "asc" } },
        },
      })
    : null
  const editingValid = editing && editing.examId === id ? editing : null

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Prüfung bearbeiten</h1>
          <Link href="/admin" className="text-sm underline text-muted-foreground">Zur Übersicht</Link>
        </div>

        {/* Fragen-Regal (Kästchen, DnD, Paging) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fragen-Regal</h2>
            <span className="text-sm text-muted-foreground">Hover = Vorschau · Drag&Drop = Reihenfolge</span>
          </div>
          <QuestionShelf examId={id} />
        </section>

        {/* JSON-Download für gesamte Fragensammlung */}
        <section className="space-y-3">
          <div className="rounded border p-4 bg-blue-50 dark:bg-blue-950/20">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📥 Fragensammlung exportieren</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Lade die gesamte Fragensammlung dieser Prüfung als JSON-Datei herunter.
            </p>
            <Link 
              href={`/api/admin/exams/${exam.id}/download-json`}
              className="inline-flex"
            >
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                📥 JSON herunterladen
              </Button>
            </Link>
          </div>
        </section>

        {/* Editor der ausgewählten Frage (optional) */}
        {editingValid && (
          <section className="rounded border p-4 space-y-4" id="edit-question">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-semibold">Frage bearbeiten</div>
                <div className="text-xs text-muted-foreground">ID: {editingValid.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <form action={duplicateQuestionAction}>
                  <input type="hidden" name="examId" value={id} />
                  <input type="hidden" name="qid" value={editingValid.id} />
                  <Button size="sm" variant="outline">Duplizieren</Button>
                </form>
                <Link href={`/admin/exams/${id}`} className="text-sm underline text-muted-foreground">
                  Schließen
                </Link>
              </div>
            </div>

            {/* Frage-Editor */}
            <QuestionForm 
              question={editingValid}
              examId={id}
            />

            {/* Fall-Zuordnung */}
            <form action={assignCaseToQuestionAction} className="flex items-center gap-2 text-sm">
              <input type="hidden" name="examId" value={id} />
              <input type="hidden" name="qid" value={editingValid.id} />
              <label className="text-sm">Fall:</label>
              <select name="caseId" className="input" defaultValue={editingValid.caseId ?? ""}>
                <option value="">– keiner –</option>
                {exam.cases?.sort((a, b) => a.order - b.order).map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.order} – {c.title}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm" type="submit">Zuordnen</button>
            </form>

            {/* Tag-Editor */}
            <QuestionEditorTags questionId={editingValid.id} />

            {/* Frage-Meta */}
            <form action={updateQuestionMetaAction} className="grid gap-2">
              <input type="hidden" name="examId" value={id} />
              <input type="hidden" name="qid" value={editingValid.id} />
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
              <div><Button type="submit" variant="outline">Frage-Info speichern</Button></div>
            </form>

            {/* Bilder */}
            <ImageUpload
              existingImages={editingValid.media.map(m => ({
                id: m.media.id,
                url: m.media.url,
                alt: m.media.alt
              }))}
              examId={id}
              questionId={editingValid.id}
            />

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
                      <input type="hidden" name="qid" value={editingValid.id} />
                      <input type="hidden" name="oid" value={o.id} />
                      <div className="sm:col-span-2">
                        <Label>Optionstext</Label>
                        <Input name="text" defaultValue={o.text} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Erklärung (warum richtig/falsch)</Label>
                        <Input name="explanation" defaultValue={o.explanation ?? ""} placeholder="Erklärung zur Option…" />
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

        {/* Globale Tags */}
        <ExamGlobalTags examId={exam.id} />

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
          <div>
            <Label htmlFor="passPercent">Bestehensgrenze (%)</Label>
            <Input id="passPercent" name="passPercent" type="number" defaultValue={exam.passPercent} />
          </div>
          <div>
            <Label htmlFor="categoryId">Kategorie</Label>
            <select 
              id="categoryId" 
              name="categoryId" 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={exam.categoryId || ""}
            >
              <option value="">Keine Kategorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              ✓ Sofort-Feedback global ist automatisch aktiviert
            </div>
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
          <form action={addQuestionAction} className="space-y-4">
            <input type="hidden" name="examId" value={exam.id} />
            <NewQuestionForm examId={exam.id} />
          </form>
        </div>
      </div>

      {/* Rechte Sidebar: Bulk Import */}
      <aside className="space-y-4">
        <div className="rounded border p-3">
          <h3 className="font-medium mb-2">Mehrere Fragen einfügen</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Füge JSON im unten beschriebenen Format ein. Fälle können über <code>caseTitle</code> zugeordnet werden.
          </p>
          
          {/* JSON-Upload */}
          <div className="mb-4 p-3 bg-muted/50 rounded border">
            <JsonUploadSimple />
          </div>

          <JsonUploadForm examId={id} bulkImportAction={bulkImportAction} />
        </div>
      </aside>
    </div>
  )
}