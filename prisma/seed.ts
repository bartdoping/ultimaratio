// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding…')

  // 1) Admin‑User (idempotent)
  const adminEmail = 'info@ultima-rat.io'
  const adminPassword = 'ChangeMe123!'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'admin' },
    create: {
      email: adminEmail,
      name: 'Admin',
      surname: 'User',
      passwordHash,
      role: 'admin',
    },
  })

  // 2) Medien‑Asset (EKG Platzhalter)
  const ekg = await prisma.mediaAsset.upsert({
    where: { url: 'https://via.placeholder.com/800x600.png?text=EKG' },
    update: {},
    create: {
      url: 'https://via.placeholder.com/800x600.png?text=EKG',
      kind: 'image',
      alt: 'EKG‑Ausschnitt (Platzhalter)'
    },
  })

  // 3) Exam + Section
  const exam = await prisma.exam.upsert({
    where: { slug: 'generalprobe' },
    update: {
      title: 'Generalprobe 2. Staatsexamen',
      description: 'Einzelfragen & Fallvignetten – Demo‑Pool',
      priceCents: 1990,
      isPublished: true,
      passPercent: 60,
      allowImmediateFeedback: false,
    },
    create: {
      slug: 'generalprobe',
      title: 'Generalprobe 2. Staatsexamen',
      description: 'Einzelfragen & Fallvignetten – Demo‑Pool',
      priceCents: 1990,
      isPublished: true,
      passPercent: 60,
      allowImmediateFeedback: false,
    },
  })

  const section = await prisma.section.upsert({
    where: { examId_order: { examId: exam.id, order: 1 } },
    update: { title: 'Innere Medizin – Kardiologie (Fallvignette)' },
    create: {
      examId: exam.id,
      title: 'Innere Medizin – Kardiologie (Fallvignette)',
      order: 1,
    },
  })

  // 4) Fragen + Antworten (6 Stück)
  // Q1 – Einzelfrage
  const q1 = await prisma.question.upsert({
    where: { id: 'q1' }, // künstliche Schlüssel für Idempotenz
    update: {},
    create: {
      id: 'q1',
      examId: exam.id,
      sectionId: section.id,
      type: 'single',
      stem: '65‑jähriger Patient mit Angina pectoris; welches Medikament ist am geeignetsten?',
      explanation: 'Demo‑Frage (Platzhalter).',
    },
  })
  await prisma.answerOption.createMany({
    data: [
      { questionId: q1.id, text: 'Metoprolol', isCorrect: true },
      { questionId: q1.id, text: 'Paracetamol', isCorrect: false },
      { questionId: q1.id, text: 'Omeprazol', isCorrect: false },
      { questionId: q1.id, text: 'Loperamid', isCorrect: false },
    ],
    skipDuplicates: true,
  })

  // Q2 – mit Bild
  const q2 = await prisma.question.upsert({
    where: { id: 'q2' },
    update: {},
    create: {
      id: 'q2',
      examId: exam.id,
      sectionId: section.id,
      type: 'single',
      stem: 'EKG‑Ausschnitt (siehe Bild): welche Diagnose ist am wahrscheinlichsten?',
      explanation: 'Demo‑Frage (Platzhalter).',
    },
  })
  await prisma.questionMedia.upsert({
    where: { questionId_mediaId: { questionId: q2.id, mediaId: ekg.id } },
    update: {},
    create: { questionId: q2.id, mediaId: ekg.id, order: 0 },
  })
  await prisma.answerOption.createMany({
    data: [
      { questionId: q2.id, text: 'Vorhofflimmern', isCorrect: true },
      { questionId: q2.id, text: 'AV‑Block III°', isCorrect: false },
      { questionId: q2.id, text: 'STEMI anteroseptal', isCorrect: false },
      { questionId: q2.id, text: 'Torsade de pointes', isCorrect: false },
    ],
    skipDuplicates: true,
  })

  // Q3–Q6 – einfache Platzhalterfragen
  const questions = [
    {
      id: 'q3', stem: 'Welche Laborgröße spricht typischerweise für Entzündung?', correct: 'CRP', options: ['CRP', 'Kreatinin', 'Natrium', 'Kalium']
    },
    {
      id: 'q4', stem: 'Welcher Elektrolyt ist primär intrazellulär?', correct: 'Kalium', options: ['Kalium', 'Natrium', 'Calcium', 'Chlorid']
    },
    {
      id: 'q5', stem: 'Standard‑Erstlinientherapie bei bakterieller Pneumonie (Platzhalter)?', correct: 'Aminopenicillin ± Beta‑Laktamase‑Inhibitor', options: ['Aminopenicillin ± Beta‑Laktamase‑Inhibitor', 'Protonenpumpenhemmer', 'Antimykotikum', 'Antihistaminikum']
    },
    {
      id: 'q6', stem: 'Welche Maßnahme gehört NICHT zur Reanimation (Platzhalter)?', correct: 'Routine‑Blutentnahme', options: ['Thoraxkompressionen', 'Defibrillation (falls indiziert)', 'Beatmung', 'Routine‑Blutentnahme']
    },
  ] as const

  for (const q of questions) {
    const created = await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: { id: q.id, examId: exam.id, sectionId: section.id, type: 'single', stem: q.stem },
    })
    await prisma.answerOption.createMany({
      data: q.options.map((opt) => ({ questionId: created.id, text: opt, isCorrect: opt === q.correct })),
      skipDuplicates: true,
    })
  }

  // 5) Laborwerte
  const labs = [
    { name: 'Hb', refRange: '13.5–17.5', unit: 'g/dL', category: 'Hämatologie' },
    { name: 'Hkt', refRange: '40–52', unit: '%', category: 'Hämatologie' },
    { name: 'Leukozyten', refRange: '4.0–10.0', unit: 'G/L', category: 'Hämatologie' },
    { name: 'Kreatinin', refRange: '0.6–1.2', unit: 'mg/dL', category: 'Niere' },
    { name: 'Kalium', refRange: '3.5–5.1', unit: 'mmol/L', category: 'Elektrolyte' },
    { name: 'Natrium', refRange: '135–145', unit: 'mmol/L', category: 'Elektrolyte' },
    { name: 'CRP', refRange: '<5', unit: 'mg/L', category: 'Entzündung' },
  ]
  await prisma.labValue.createMany({ data: labs, skipDuplicates: true })

  console.log('Seed fertig. Admin‑Login (ab M3):', adminEmail)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })