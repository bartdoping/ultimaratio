// app/(dashboard)/account/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/db"
import AccountClient from "./account-client"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,
      createdAt: true,
    },
  })
  if (!me) notFound()

  const purchases = await prisma.purchase.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    include: { exam: true },
  })

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</div>
          <h1 className="text-3xl font-semibold tracking-tight">Profil und Sicherheit</h1>
          <p className="text-sm text-muted-foreground">
            Verwalte deine persönlichen Daten, Login-Informationen und Käufe.
          </p>
        </div>
      </div>
      <AccountClient
        user={{
          id: me.id,
          name: me.name ?? "",
          surname: me.surname ?? "",
          email: me.email,
          createdAt: me.createdAt.toISOString(),
        }}
        purchases={purchases.map(p => ({
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          examTitle: p.exam.title,
          priceCents: p.exam.priceCents || 0,
        }))}
      />
    </div>
  )
}