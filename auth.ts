import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getServerSession } from "next-auth"
import prisma from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { buildOAuthProviders } from "@/lib/auth-providers"
import { randomBytes } from "crypto"

/**
 * Schmale Helfer: User-Lookup + Auto-Provisioning für OAuth-Logins.
 * - Wenn der OAuth-User schon existiert (gleiche E-Mail) → reuse.
 * - Sonst: lege ihn an mit:
 *   - `name`/`surname` = "" (Schema verlangt String → leerer String, keine
 *     PII vom Provider übernehmen — wir brauchen den Namen nicht).
 *   - `passwordHash` = nicht nutzbarer Random-Hash (Login per Passwort
 *     bleibt für diesen User blockiert; er muss OAuth oder Passwort-Reset
 *     verwenden).
 *   - `emailVerifiedAt` = jetzt (OAuth-Provider haben die E-Mail bereits
 *     verifiziert).
 */
async function findOrCreateOAuthUser(
  email: string
): Promise<{ id: string; role: string } | null> {
  const normalized = email.toLowerCase().trim()
  if (!normalized) return null

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, role: true, emailVerifiedAt: true },
  })

  if (existing) {
    if (!existing.emailVerifiedAt) {
      try {
        await prisma.user.update({
          where: { id: existing.id },
          data: { emailVerifiedAt: new Date() },
        })
      } catch {
        // best-effort
      }
    }
    return { id: existing.id, role: existing.role }
  }

  const placeholderHash = `oauth_${randomBytes(32).toString("hex")}`

  try {
    const created = await prisma.user.create({
      data: {
        email: normalized,
        name: "",
        surname: "",
        passwordHash: placeholderHash,
        role: "user",
        emailVerifiedAt: new Date(),
      },
      select: { id: true, role: true },
    })
    return { id: created.id, role: created.role }
  } catch {
    // Race-Condition: doppelter OAuth-Login fast gleichzeitig. Nochmal lesen.
    const again = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, role: true },
    })
    return again
  }
}

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

          // OAuth-only-Accounts: Password-Login blockieren.
          if (user.passwordHash.startsWith("oauth_")) return null

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
        } catch {
          return null
        }
      },
    }),
    // OAuth-Provider werden nur eingebaut, wenn ihre Env gesetzt ist.
    ...buildOAuthProviders(),
  ],
  callbacks: {
    /**
     * Auto-Provisioning für OAuth-Sign-Ins.
     */
    async signIn({ account, profile, user }) {
      if (account?.provider === "credentials") return true

      const email = (profile?.email || user?.email || "").trim().toLowerCase()
      if (!email) return false

      const resolved = await findOrCreateOAuthUser(email)
      if (!resolved) return false

      ;(user as { id?: string; role?: string }).id = resolved.id
      ;(user as { id?: string; role?: string }).role = resolved.role
      ;(user as { email?: string }).email = email
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const id = (user as { id?: string }).id
        const role = (user as { role?: "user" | "admin" }).role
        if (id) token.id = id
        if (role) token.role = role
        token.email = user.email
        ;(token as Record<string, unknown>).name = (user as { name?: string }).name
      }

      if (trigger === "update" && session?.user) {
        if (session.user.email) token.email = session.user.email
        const nm = (session.user as { name?: string }).name
        if (nm) (token as Record<string, unknown>).name = nm
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as Record<string, unknown>).id = token.id
        ;(session.user as Record<string, unknown>).role = token.role
        if (token.email) session.user.email = token.email as string
        const nm = (token as Record<string, unknown>).name
        if (typeof nm === "string") session.user.name = nm
      }
      return session
    },
  },
}

export async function getSession() {
  return getServerSession(authOptions)
}
