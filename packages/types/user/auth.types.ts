import { z } from "zod"

export const signUpSchema = z.object({
  firstName: z.string().min(3).max(12),
  lastName: z.string().min(3).max(4),
  email: z.email(),
  password: z.string().min(3).max(14),
})

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(3).max(14),
})
