// auth.ts
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getServerSession } from "next-auth"
import prisma from "@/lib/db"
import { verifyPassword } from "@/lib/password"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" }, // optional, hält alles konsistent
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(creds) {
        try {
          const email = (creds?.email ?? "").toLowerCase().trim()
          const password = creds?.password ?? ""
          if (!email || !password) return null

          const user = await prisma.user.findUnique({ where: { email } })
          if (!user) return null

          // E-Mail muss verifiziert sein (außer im DEV-Override)
          const devSkip = process.env.DEV_AUTH_ENABLED === "true"
          if (!devSkip && !user.emailVerifiedAt) return null

          const ok = await verifyPassword(password, user.passwordHash)
          if (!ok) return null

          return {
            id: user.id,
            email: user.email,
            name: `${user.name} ${user.surname}`.trim(),
            role: user.role,
          }
        } catch (e) {
          console.error("authorize error:", e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // läuft nur beim Login
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
}

export async function getSession() {
  return getServerSession(authOptions)
}