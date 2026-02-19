// ============================================================================
// Component: MappingEditor — Visual mapping editor with live preview
// ============================================================================

import { useState, useEffect } from "react";
import { useMappings } from "@/features/mappings/hooks/useMappings";
import { RuleRow } from "./RuleRow";
import type {
  Mapping,
  MappingRule,
  MappingMode,
  MappingSourceType,
  TransformType,
} from "@/types/mappings";

interface Props {
  workspaceId: string;
  mapping: Mapping | null;
  onClose: () => void;
}

const sourceOptions: { value: MappingSourceType; label: string }[] = [
  { value: "any", label: "🌐 Qualquer" },
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "forms", label: "📝 Formulários" },
  { value: "ads", label: "📊 Ads" },
  { value: "webhook", label: "🔗 Webhook" },
];

const SAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
  whatsapp: {
    object: "whatsapp_business_account",
    entry: [{
      id: "123456",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          contacts: [{ profile: { name: "João Silva" }, wa_id: "5521999998888" }],
          messages: [{ id: "wamid.xxx", from: "5521999998888", timestamp: "1700000000", type: "text", text: { body: "Olá!" } }],
        },
        field: "messages",
      }],
    }],
  },
  forms: {
    object: "page",
    entry: [{
      id: "page_123",
      changes: [{
        value: {
          form_id: "form_456",
          leadgen_id: "lead_789",
          field_data: [
            { name: "full_name", values: ["Maria Santos"] },
            { name: "email", values: ["maria@email.com"] },
            { name: "phone_number", values: ["+5511999887766"] },
          ],
        },
        field: "leadgen",
      }],
    }],
  },
  ads: { object: "ad_account", entry: [{ id: "act_123", changes: [{ value: { campaign_id: "camp_456" }, field: "insights" }] }] },
  webhook: { event: "custom", data: { id: "123", name: "Test", email: "test@email.com" } },
  any: { source: "generic", data: { key: "value" } },
};

const emptyRule = (): MappingRule => ({
  source_path: "",
  target_path: "",
  transform: undefined,
  default_value: undefined,
});

export function MappingEditor({ workspaceId, mapping, onClose }: Props) {
  const {
    createMapping, isCreating,
    updateMapping, isUpdating,
    previewMapping, isPreviewing, previewResult,
  } = useMappings(workspaceId);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<MappingSourceType>("any");
  const [mode, setMode] = useState<MappingMode>("field_map");
  const [rules, setRules] = useState<MappingRule[]>([emptyRule()]);
  const [staticFields, setStaticFields] = useState("{}");
  const [template, setTemplate] = useState("");
  const [passThrough, setPassThrough] = useState(false);

  // Preview state
  const [samplePayload, setSamplePayload] = useState("{}");
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Init from existing mapping
  useEffect(() => {
    if (mapping) {
      setName(mapping.name);
      setDescription(mapping.description || "");
      setSourceType(mapping.source_type);
      setMode(mapping.mode);
      setRules(mapping.rules.length > 0 ? mapping.rules : [emptyRule()]);
      setStaticFields(JSON.stringify(mapping.static_fields, null, 2));
      setTemplate(mapping.template || "");
      setPassThrough(mapping.pass_through);
    }
  }, [mapping]);

  // Load sample payload when source type changes
  useEffect(() => {
    setSamplePayload(JSON.stringify(SAMPLE_PAYLOADS[sourceType] || {}, null, 2));
  }, [sourceType]);

  const addRule = () => setRules([...rules, emptyRule()]);

  const updateRule = (index: number, updated: MappingRule) => {
    const newRules = [...rules];
    newRules[index] = updated;
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    if (rules.length === 1) return;
    setRules(rules.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    setError(null);
    setPreviewOutput(null);

    let parsedPayload: unknown;
    let parsedStatic: Record<string, unknown> = {};

    try {
      parsedPayload = JSON.parse(samplePayload);
    } catch {
      setError("Payload JSON inválido");
      return;
    }

    try {
      parsedStatic = JSON.parse(staticFields);
    } catch {
      setError("Static fields JSON inválido");
      return;
    }

    try {
      const result = await previewMapping({
        rules: rules.filter((r) => r.source_path && r.target_path),
        payload: parsedPayload,
        static_fields: parsedStatic,
        mode,
        template: mode === "template" ? template : undefined,
        pass_through: passThrough,
      });

      if (result.success) {
        setPreviewOutput(JSON.stringify(result.output, null, 2));
      } else {
        setError(result.error || "Erro no preview");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    let parsedStatic: Record<string, unknown> = {};
    try {
      parsedStatic = JSON.parse(staticFields);
    } catch {
      setError("Static fields JSON inválido");
      return;
    }

    const validRules = rules.filter((r) => r.source_path && r.target_path);
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      source_type: sourceType,
      mode,
      rules: validRules,
      static_fields: parsedStatic,
      template: mode === "template" ? template : undefined,
      pass_through: passThrough,
    };

    try {
      if (mapping) {
        await updateMapping({ id: mapping.id, ...payload });
      } else {
        await createMapping(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen -mx-6 -mt-6">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {mapping ? "Editar mapeamento" : "Novo mapeamento"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={isPreviewing}
            className="px-4 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 disabled:opacity-50"
          >
            {isPreviewing ? "Testando..." : "▶ Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating || isUpdating ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-6 p-6">
        {/* LEFT: Editor */}
        <div className="space-y-4">
          {/* Name + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Meta Lead → CRM"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as MappingSourceType)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sourceOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={mode === "field_map"}
                onChange={() => setMode("field_map")}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Field Map</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={mode === "template"}
                onChange={() => setMode("template")}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Template</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={passThrough}
                onChange={(e) => setPassThrough(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-xs text-gray-600">Pass-through (incluir campos não mapeados)</span>
            </label>
          </div>

          {/* Field Map Rules */}
          {mode === "field_map" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">Regras de mapeamento</label>
                <button
                  onClick={addRule}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  + Adicionar regra
                </button>
              </div>

              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <RuleRow
                    key={idx}
                    rule={rule}
                    onChange={(updated) => updateRule(idx, updated)}
                    onRemove={() => removeRule(idx)}
                    canRemove={rules.length > 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Template Mode */}
          {mode === "template" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Template (use {"{{path}}"} para acessar campos do payload)
              </label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={'{\n  "nome": "{{entry[0].changes[0].value.contacts[0].profile.name}}",\n  "telefone": "{{entry[0].changes[0].value.contacts[0].wa_id}}"\n}'}
              />
            </div>
          )}

          {/* Static Fields */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Campos estáticos (JSON adicionado ao output)
            </label>
            <textarea
              value={staticFields}
              onChange={(e) => setStaticFields(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='{ "source": "metahub", "version": "1.0" }'
            />
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Payload de entrada (teste)
            </label>
            <textarea
              value={samplePayload}
              onChange={(e) => setSamplePayload(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 text-xs font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Resultado (output)
            </label>
            <div className="w-full min-h-[200px] px-3 py-2 text-xs font-mono border rounded-md bg-gray-900 text-green-400 overflow-auto whitespace-pre-wrap">
              {previewOutput || (previewResult?.output
                ? JSON.stringify(previewResult.output, null, 2)
                : "Clique em Preview para testar...")}
            </div>
            {previewResult?.duration_ms !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                Transformado em {previewResult.duration_ms}ms
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
