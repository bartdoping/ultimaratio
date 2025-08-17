// middleware.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PROTECTED_PREFIXES = ["/dashboard", "/exams", "/exam-run", "/admin"]
const SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
]

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req
  const isProtected = PROTECTED_PREFIXES.some((p) => nextUrl.pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const hasSession = SESSION_COOKIES.some((n) => cookies.get(n)?.value)
  if (!hasSession) {
    const login = new URL("/login", nextUrl)
    login.searchParams.set("next", nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = { matcher: ["/((?!_next|.*\\.|api).*)"] }
