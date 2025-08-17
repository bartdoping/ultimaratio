// lib/validators.ts
import { z } from "zod"

export const RegisterSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirm: z.string().min(8),
}).refine(d => d.password === d.confirm, { path: ["confirm"], message: "Passwörter stimmen nicht überein" })

export const VerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
})
