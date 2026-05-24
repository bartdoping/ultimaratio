import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { isAdminRole, isGeneratorModePathAllowed } from "@/lib/platform-access"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!isAdminRole(token?.role as string | undefined)) {
      return NextResponse.redirect(new URL("/coming-soon", req.url))
    }
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (isAdminRole(token?.role as string | undefined)) {
    return NextResponse.next()
  }

  if (isGeneratorModePathAllowed(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/coming-soon", req.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
