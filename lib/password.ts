// lib/password.ts
import bcrypt from "bcryptjs"

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
