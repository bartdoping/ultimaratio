import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isAdminRole } from "@/lib/platform-access"
import { HomeLegacy } from "@/components/home/home-legacy"
import { HomeGeneratorFocus } from "@/components/home/home-generator-focus"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await getServerSession(authOptions)
  const loggedIn = !!session?.user

  let isAdmin = false
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { role: true },
    })
    isAdmin = isAdminRole(me?.role)
  }

  if (isAdmin) {
    return <HomeLegacy />
  }

  if (loggedIn) {
    redirect("/generator")
  }

  return <HomeGeneratorFocus loggedIn={false} />
}
