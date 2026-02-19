// ============================================================================
// Page: Reset Password
// ============================================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/schemas";

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null);
    const { error } = await resetPassword(data.email);

    if (error) {
      setServerError(error);
      return;
    }

    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Email enviado
          </h2>
          <p className="text-gray-600">
            Se uma conta existir com esse email, você receberá um link para
            redefinir sua senha.
          </p>
          <Link
            to="/auth/login"
            className="inline-block mt-6 text-blue-600 hover:underline font-medium"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Redefinir senha
        </h1>
        <p className="text-gray-600 mb-6">
          Informe seu email para receber o link de redefinição.
        </p>

        {serverError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link to="/auth/login" className="text-blue-600 hover:underline font-medium">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
