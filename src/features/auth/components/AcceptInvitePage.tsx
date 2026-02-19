// ============================================================================
// Page: Accept Invite — Handles redirect from Edge Function
// ============================================================================

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getEdgeFunctionUrl } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export function AcceptInvitePage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const token = searchParams.get("token");
  const reason = searchParams.get("reason");
  const noticeParam = searchParams.get("notice");

  useEffect(() => {
    if (noticeParam === "invite_accepted") {
      setStatus("success");
      setNotice("Convite aceito! Você foi adicionado ao workspace.");
      return;
    }

    if (noticeParam === "already_member") {
      setStatus("success");
      setNotice("Você já é membro deste workspace.");
      return;
    }

    if (reason) {
      setStatus("error");
      return;
    }

    if (!token) {
      setStatus("error");
      return;
    }

    if (loading) return;

    if (!user) {
      // Redirect to login with invite token
      navigate(`/auth/login?invite_token=${token}`);
      return;
    }

    // Call Edge Function to accept invite
    const acceptInvite = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch(
          `${getEdgeFunctionUrl("invite-flow")}/accept-invite?token=${token}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
            redirect: "manual",
          }
        );

        // Edge Function redirects — follow the redirect URL
        if (res.type === "opaqueredirect" || res.status === 302) {
          const location = res.headers.get("Location");
          if (location) {
            const url = new URL(location);
            navigate(url.pathname + url.search);
          } else {
            setStatus("success");
            setNotice("Convite aceito!");
          }
        } else if (res.ok) {
          setStatus("success");
          setNotice("Convite aceito!");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    acceptInvite();
  }, [token, reason, noticeParam, user, loading, navigate]);

  const errorMessages: Record<string, string> = {
    not_found: "Este convite não foi encontrado ou já foi utilizado.",
    already_accepted: "Este convite já foi aceito.",
    expired: "Este convite expirou. Solicite um novo convite ao administrador.",
    server_error: "Ocorreu um erro no servidor. Tente novamente.",
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Processando convite...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ops, algo deu errado
          </h2>
          <p className="text-gray-600 mb-6">
            {reason
              ? errorMessages[reason] || "Erro desconhecido."
              : "Token de convite inválido."}
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {notice || "Convite aceito!"}
        </h2>
        <Link
          to="/dashboard"
          className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
}
