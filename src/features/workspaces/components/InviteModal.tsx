// ============================================================================
// Component: InviteModal — Send workspace invite
// ============================================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInvites } from "@/features/workspaces/hooks/useInvites";
import { inviteSchema, type InviteFormData } from "@/lib/schemas";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function InviteModal({ isOpen, onClose, workspaceId }: Props) {
  const { sendInvite, isSending } = useInvites(workspaceId);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "editor" },
  });

  const onSubmit = async (data: InviteFormData) => {
    setServerError(null);
    setSuccess(false);
    try {
      await sendInvite({
        workspace_id: workspaceId,
        email: data.email,
        role: data.role,
      });
      setSuccess(true);
      reset();
      // Auto close after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setServerError((err as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Convidar membro
        </h2>

        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 text-sm">
            Convite enviado com sucesso!
          </div>
        )}

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
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Papel
            </label>
            <select
              {...register("role")}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Visualizador — apenas leitura</option>
              <option value="editor">Editor — pode criar e editar</option>
              <option value="owner">Dono — acesso total</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md 
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? "Enviando..." : "Enviar convite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
