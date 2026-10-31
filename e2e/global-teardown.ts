import { aufraeumen } from "./global-setup"
import { prisma } from "./helpers"

export default async function teardown() {
  const ki = await prisma.aiUsageEvent.count()
  await aufraeumen()
  await prisma.$disconnect()
  if (ki !== Number(process.env.E2E_KI_BASIS)) {
    throw new Error(`E2E: Es wurden ${ki - Number(process.env.E2E_KI_BASIS)} KI-Aufrufe ausgelöst — das darf nicht passieren.`)
  }
}
