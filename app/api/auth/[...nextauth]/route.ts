// app/api/auth/[...nextauth]/route.ts (v4)
import NextAuth from "next-auth"
import authOptions from "@/auth"

export const runtime = "nodejs" // wichtig: nicht Edge

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
