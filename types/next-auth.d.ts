import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    role: "user" | "admin"
  }
  interface Session {
    user: {
      id: string
      role: "user" | "admin"
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "user" | "admin"
  }
}
