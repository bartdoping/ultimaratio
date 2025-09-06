// lib/apply-global-tags.ts
import prisma from "@/lib/db"

/**
 * Wendet alle globalen Tags auf alle Fragen eines Examens an.
 * Diese Funktion sollte aufgerufen werden, wenn globale Tags hinzugefügt werden.
 */
export async function applyGlobalTagsToAllQuestions(examId: string) {
  try {
    // Hole alle globalen Tags des Examens
    const globalTags = await prisma.examGlobalTag.findMany({
      where: { examId },
      select: { tagId: true }
    })

    if (globalTags.length === 0) {
      return { success: true, message: "No global tags found" }
    }

    // Hole alle Fragen des Examens
    const questions = await prisma.question.findMany({
      where: { examId },
      select: { id: true }
    })

    if (questions.length === 0) {
      return { success: true, message: "No questions found" }
    }

    // Erstelle alle Tag-Verbindungen
    const questionTagData = []
    for (const question of questions) {
      for (const globalTag of globalTags) {
        questionTagData.push({
          questionId: question.id,
          tagId: globalTag.tagId
        })
      }
    }

    // Verwende upsert um Duplikate zu vermeiden
    await prisma.$transaction(
      questionTagData.map(data =>
        prisma.questionTag.upsert({
          where: {
            questionId_tagId: {
              questionId: data.questionId,
              tagId: data.tagId
            }
          },
          update: {},
          create: data
        })
      )
    )

    return { 
      success: true, 
      message: `Applied ${globalTags.length} global tags to ${questions.length} questions` 
    }
  } catch (error) {
    console.error("Error applying global tags:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Entfernt alle globalen Tags von allen Fragen eines Examens.
 * Diese Funktion sollte aufgerufen werden, wenn globale Tags entfernt werden.
 */
export async function removeGlobalTagsFromAllQuestions(examId: string, tagId: string) {
  try {
    // Entferne den Tag von allen Fragen des Examens
    const result = await prisma.questionTag.deleteMany({
      where: {
        question: { examId },
        tagId
      }
    })

    return { 
      success: true, 
      message: `Removed tag from ${result.count} questions` 
    }
  } catch (error) {
    console.error("Error removing global tags:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
