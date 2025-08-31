import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import SRRunnerClient from "@/components/sr-runner-client"

export const runtime = "nodejs"

export default async function SRAllPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">SR · Alle aktivierten Decks</h1>
      {/* ✅ mode wird gesetzt */}
      <SRRunnerClient mode="all" />
    </div>
  )
}