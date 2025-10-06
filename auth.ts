import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getServerSession } from "next-auth"
import prisma from "@/lib/db"
import { verifyPassword } from "@/lib/password"

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
    updateAge: 24 * 60 * 60, // 24 Stunden
  },
  pages: { signIn: "/login" },
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
    async jwt({ token, user, trigger, session }) {
      // Beim Login: Basiswerte in den Token
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.email = user.email
        ;(token as any).name = (user as any).name
      }

      // Wichtig: wenn clientseitig session.update(...) aufgerufen wird
      if (trigger === "update" && session?.user) {
        if (session.user.email) token.email = session.user.email
        if ((session.user as any).name) (token as any).name = (session.user as any).name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        // Spiegel E-Mail & Name aus dem Token zurück in die Session
        if (token.email) session.user.email = token.email as string
        if ((token as any).name) session.user.name = (token as any).name as string
      }
      return session
    },
  },
}

export async function getSession() {
  return getServerSession(authOptions)
}