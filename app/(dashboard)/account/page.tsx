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
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold mb-6">Account</h1>
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
          priceCents: p.exam.priceCents,
        }))}
      />
    </div>
  )
}