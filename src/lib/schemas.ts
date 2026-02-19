// ============================================================================
// Zod Validation Schemas — Auth & Workspace Forms
// ============================================================================

import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Pelo menos um número"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Mínimo 2 caracteres").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const magicLinkSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(50, "Máximo 50 caracteres"),
  slug: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hifens"),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["owner", "editor", "viewer"], {
    errorMap: () => ({ message: "Selecione um papel válido" }),
  }),
});

export type InviteFormData = z.infer<typeof inviteSchema>;
