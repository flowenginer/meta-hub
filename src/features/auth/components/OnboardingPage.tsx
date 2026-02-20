// ============================================================================
// Page: Onboarding — Create First Workspace
// ============================================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createWorkspaceSchema, type CreateWorkspaceFormData } from "@/lib/schemas";

/** Generate slug from name */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OnboardingPage() {
  const { user } = useAuth();
  const { workspaces, isLoading, createWorkspace, isCreating, refetch } = useWorkspaces();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "", slug: "" },
  });

  const watchName = watch("name");

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    register("name").onChange(e);
    setValue("slug", toSlug(e.target.value), { shouldValidate: true });
  };

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    setServerError(null);
    try {
      const workspace = await createWorkspace(data);
      await refetch(); // Ensure cache is updated before navigation
      navigate(`/workspace/${workspace.id}`);
    } catch (err) {
      setServerError((err as Error).message);
    }
  };

  // Loading enquanto verifica workspaces existentes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Se já tem workspaces, redireciona para o mais recente
  if (workspaces.length > 0) {
    return <Navigate to={`/workspace/${workspaces[0].id}`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-8">
        <div className="text-4xl mb-4 text-center">🚀</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Bem-vindo ao MetaHub!
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Crie seu primeiro workspace para começar.
        </p>

        {serverError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do workspace
            </label>
            <input
              type="text"
              {...register("name")}
              onChange={onNameChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minha Empresa"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL)
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-1">metahub.app/</span>
              <input
                type="text"
                {...register("slug")}
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="minha-empresa"
              />
            </div>
            {errors.slug && (
              <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isCreating ? "Criando..." : "Criar workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
