import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { SavedQuestionsClient } from "@/components/saved/saved-questions-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Meine Fragen",
  description:
    "Deine gespeicherten Fragen: fällige Wiederholungen, falsch beantwortete Fragen und deine Trefferquote je Thema.",
  robots: { index: false, follow: false },
}

export default async function MeineFragenPage() {
  const session = await getServerSession(authOptions).catch(() => null)
  if (!session?.user?.email) {
    redirect("/login?next=/meine-fragen")
  }
  return <SavedQuestionsClient />
}
