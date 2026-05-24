import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { isUserPro } from "@/lib/subscription"
import {
  createVisitorId,
  getClientIp,
  hashClientIp,
  verifyVisitorCookie,
  GENERATOR_VISITOR_COOKIE,
} from "@/lib/generator-limits"

export type GeneratorUser = {
  id: string
  role: string
}

export type GeneratorAccessContext = {
  user: GeneratorUser | null
  isLoggedIn: boolean
  isPro: boolean
  isAdmin: boolean
  anonKey: string
  ipHash: string | null
  newVisitorId: string | null
}

function readVisitorCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? ""
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GENERATOR_VISITOR_COOKIE}=`))
  if (!match) return null
  return decodeURIComponent(match.slice(GENERATOR_VISITOR_COOKIE.length + 1))
}

export async function resolveGeneratorAccess(req: Request): Promise<GeneratorAccessContext> {
  const session = await getServerSession(authOptions)
  let user: GeneratorUser | null = null
  let isPro = false
  let isAdmin = false

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true, role: true },
    })
    if (dbUser) {
      user = { id: dbUser.id, role: dbUser.role }
      isAdmin = dbUser.role === "admin"
      isPro = isAdmin || (await isUserPro(dbUser.id))
    }
  }

  const signedCookie = readVisitorCookie(req)
  const verified = verifyVisitorCookie(signedCookie ?? undefined)
  const anonKey = verified ?? createVisitorId()
  const newVisitorId = verified ? null : anonKey

  return {
    user,
    isLoggedIn: !!user,
    isPro,
    isAdmin,
    anonKey,
    ipHash: hashClientIp(getClientIp(req)),
    newVisitorId,
  }
}

export function quotaSubjectFromAccess(access: GeneratorAccessContext) {
  if (access.user) {
    return {
      userId: access.user.id,
      anonKey: null as string | null,
      ipHash: access.isPro || access.isAdmin ? null : access.ipHash,
      isPro: access.isPro,
      isAdmin: access.isAdmin,
    }
  }
  return {
    userId: null as string | null,
    anonKey: access.anonKey,
    ipHash: access.ipHash,
    isPro: false,
    isAdmin: false,
  }
}
