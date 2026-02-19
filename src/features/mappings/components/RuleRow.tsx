// ============================================================================
// Component: RuleRow — Single mapping rule editor
// ============================================================================

import type { MappingRule, TransformType } from "@/types/mappings";

interface Props {
  rule: MappingRule;
  onChange: (updated: MappingRule) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const transforms: { value: TransformType | ""; label: string }[] = [
  { value: "", label: "Nenhuma" },
  { value: "uppercase", label: "MAIÚSCULO" },
  { value: "lowercase", label: "minúsculo" },
  { value: "trim", label: "Trim" },
  { value: "number", label: "→ Número" },
  { value: "boolean", label: "→ Boolean" },
  { value: "string", label: "→ String" },
  { value: "date_iso", label: "→ Data ISO" },
  { value: "phone_clean", label: "Limpar telefone" },
  { value: "email_lower", label: "Email lower" },
  { value: "array_first", label: "Array[0]" },
  { value: "array_last", label: "Array[-1]" },
  { value: "array_join", label: "Array.join" },
  { value: "json_parse", label: "JSON.parse" },
  { value: "json_stringify", label: "JSON.stringify" },
];

export function RuleRow({ rule, onChange, onRemove, canRemove }: Props) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
      {/* Source Path */}
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] text-gray-500 mb-0.5">Source path</label>
        <input
          type="text"
          value={rule.source_path}
          onChange={(e) => onChange({ ...rule, source_path: e.target.value })}
          className="w-full px-2 py-1.5 text-xs font-mono border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="entry[0].changes[0].value.field"
        />
      </div>

      {/* Arrow */}
      <div className="pt-5 text-gray-400">→</div>

      {/* Target Path */}
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] text-gray-500 mb-0.5">Target path</label>
        <input
          type="text"
          value={rule.target_path}
          onChange={(e) => onChange({ ...rule, target_path: e.target.value })}
          className="w-full px-2 py-1.5 text-xs font-mono border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="lead.name"
        />
      </div>

      {/* Transform */}
      <div className="w-32">
        <label className="block text-[10px] text-gray-500 mb-0.5">Transformar</label>
        <select
          value={rule.transform || ""}
          onChange={(e) =>
            onChange({
              ...rule,
              transform: (e.target.value || undefined) as TransformType | undefined,
            })
          }
          className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {transforms.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Default Value */}
      <div className="w-24">
        <label className="block text-[10px] text-gray-500 mb-0.5">Default</label>
        <input
          type="text"
          value={rule.default_value !== undefined ? String(rule.default_value) : ""}
          onChange={(e) =>
            onChange({
              ...rule,
              default_value: e.target.value || undefined,
            })
          }
          className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="—"
        />
      </div>

      {/* Remove */}
      <div className="pt-4">
        <button
          onClick={onRemove}
          disabled={!canRemove}
          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Remover regra"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
