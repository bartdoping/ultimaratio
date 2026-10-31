import { MAIL_DOMAIN, prisma, RICHTIG, THEMA, THEMA_KEY } from "./helpers"

async function aufraeumen() {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${MAIL_DOMAIN}` } } })
  const ids = (await prisma.poolQuestion.findMany({ where: { topicKey: THEMA_KEY }, select: { id: true } })).map((q) => q.id)
  await prisma.poolAnswer.deleteMany({ where: { poolQuestionId: { in: ids } } })
  await prisma.poolSeen.deleteMany({ where: { poolQuestionId: { in: ids } } })
  await prisma.poolQuestion.deleteMany({ where: { id: { in: ids } } })
}

export default async function setup() {
  await aufraeumen()
  // Eigene Testfragen je Schwierigkeit — so kommt jede Frage aus dem Pool, nie von der KI.
  const data = []
  for (let difficulty = 1; difficulty <= 5; difficulty++) {
    for (let i = 1; i <= 15; i++) {
      const stem = `E2E-Frage ${difficulty}.${i}: Welche Antwort ist richtig?`
      data.push({
        topicKey: THEMA_KEY,
        topic: THEMA,
        difficulty,
        stem,
        contentHash: `e2e-${difficulty}-${i}`,
        payload: {
          stem,
          allowImmediate: true,
          explanation: "Testerklärung.",
          options: [
            { text: RICHTIG, isCorrect: true, explanation: "Stimmt." },
            ...["A", "B", "C", "D"].map((b) => ({ text: `Falsche Testantwort ${b}`, isCorrect: false, explanation: "Stimmt nicht." })),
          ],
        },
      })
    }
  }
  await prisma.poolQuestion.createMany({ data })
  process.env.E2E_KI_BASIS = String(await prisma.aiUsageEvent.count())
}

export { aufraeumen }
