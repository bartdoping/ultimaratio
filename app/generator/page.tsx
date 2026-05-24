import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isUserPro } from "@/lib/subscription"
import { GeneratorPageClient } from "@/components/generator/generator-page-client"

export const dynamic = "force-dynamic"

export default async function GeneratorPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/generator")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: { id: true, role: true },
  })
  if (!user) redirect("/login?callbackUrl=/generator")

  const canGenerate = user.role === "admin" || (await isUserPro(user.id))

  return (
    <main className="py-8 px-4">
      <GeneratorPageClient canGenerate={canGenerate} />
    </main>
  )
}
