// ============================================================================
// Page: Login
// ============================================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  loginSchema,
  magicLinkSchema,
  type LoginFormData,
  type MagicLinkFormData,
} from "@/lib/schemas";

export function LoginPage() {
  const { signIn, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);

  const inviteToken = searchParams.get("invite_token");
  const prefillEmail = searchParams.get("email") || "";

  // Password login form
  const passwordForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefillEmail },
  });

  // Magic link form
  const magicForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: prefillEmail },
  });

  const onPasswordLogin = async (data: LoginFormData) => {
    setServerError(null);
    const { error } = await signIn(data.email, data.password);

    if (error) {
      setServerError(error);
      return;
    }

    // Redirect to invite acceptance or dashboard
    if (inviteToken) {
      navigate(`/invite/accept?token=${inviteToken}`);
    } else {
      navigate("/dashboard");
    }
  };

  const onMagicLink = async (data: MagicLinkFormData) => {
    setServerError(null);
    const { error } = await signInWithMagicLink(data.email);

    if (error) {
      setServerError(error);
      return;
    }

    setMagicLinkSent(true);
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-4xl mb-4">✨</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Link enviado!
          </h2>
          <p className="text-gray-600">
            Verifique seu email e clique no link para entrar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Entrar</h1>
        <p className="text-gray-600 mb-6">
          {inviteToken
            ? "Entre para aceitar o convite."
            : "Acesse sua conta MetaHub."}
        </p>

        {serverError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {serverError}
          </div>
        )}

        {!useMagicLink ? (
          <>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordLogin)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...passwordForm.register("email")}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
                {passwordForm.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Senha
                  </label>
                  <Link
                    to="/auth/reset-password"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <input
                  type="password"
                  {...passwordForm.register("password")}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sua senha"
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 
                           disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {passwordForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            <button
              onClick={() => setUseMagicLink(true)}
              className="w-full border border-gray-300 text-gray-700 py-2 rounded-md 
                         hover:bg-gray-50 font-medium"
            >
              Entrar com Magic Link
            </button>
          </>
        ) : (
          <>
            <form
              onSubmit={magicForm.handleSubmit(onMagicLink)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...magicForm.register("email")}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
                {magicForm.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {magicForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={magicForm.formState.isSubmitting}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 
                           disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {magicForm.formState.isSubmitting
                  ? "Enviando..."
                  : "Enviar Magic Link"}
              </button>
            </form>

            <button
              onClick={() => setUseMagicLink(false)}
              className="w-full mt-3 text-sm text-gray-600 hover:text-gray-800"
            >
              ← Voltar para login com senha
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          Não tem conta?{" "}
          <Link
            to={
              inviteToken
                ? `/auth/signup?invite_token=${inviteToken}&email=${prefillEmail}`
                : "/auth/signup"
            }
            className="text-blue-600 hover:underline font-medium"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
