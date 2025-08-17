// auth.ts (v4)
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { z } from "zod"
import prisma from "@/lib/db"
import { verifyPassword } from "@/lib/password"

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.emailVerifiedAt) return null

        const ok = await verifyPassword(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "user" | "admin",
        }
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
