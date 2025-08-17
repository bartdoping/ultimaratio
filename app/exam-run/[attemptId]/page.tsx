// app/exam-run/[attemptId]/page.tsx
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import RunnerClient from "@/components/runner-client"

type Props = { params: Promise<{ attemptId: string }> }

export default async function ExamRunPage({ params }: Props) {
  const { attemptId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect(`/login?next=/exam-run/${attemptId}`)

  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } })
  if (!attempt) notFound()

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || (attempt.userId !== me.id && (session.user as any).role !== "admin")) {
    redirect("/")
  }

  return (
    <div className="max-w-3xl mx-auto">
      <RunnerClient attemptId={attemptId} />
    </div>
  )
}
