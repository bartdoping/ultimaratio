// auth.ts
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { z } from "zod"
import prisma from "@/lib/db"
import { verifyPassword } from "@/lib/password"

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & Passwort",
      // Die Namen/Keys müssen zu deinem Login-Form passen:
      credentials: {
        email: { label: "E-Mail", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        // Nur verifizierte zulassen (Admin darfst du optional ausnehmen)
        if (!user.emailVerifiedAt /* && user.role !== "admin" */) return null

        const ok = await verifyPassword(password, user.passwordHash)
        if (!ok) return null

        // Rückgabe: minimale User-Daten für JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "user" | "admin",
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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

export default authOptions
