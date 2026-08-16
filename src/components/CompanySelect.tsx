import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { fetchCompaniesByDomain } from "../lib/api";

interface CompanyOption { name: string; operator_name?: string; domain?: string; }

export default function CompanySelect({
  value, onChange, disabled, allowEmpty = true, placeholder = "Select Company", domain,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
  domain?: string;
}) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (domain) {
      fetchCompaniesByDomain(domain).then((rows) => setCompanies(rows || [])).catch(() => {});
    } else {
      callFrappe<CompanyOption[]>("frappe.client.get_list", {
        doctype: "Operator Companies",
        fields: ["name", "operator_name", "domain"],
        order_by: "operator_name asc",
        limit_page_length: 200,
      }).then((rows) => setCompanies(rows || [])).catch(() => {});
    }
  }, [domain]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = companies.find((c) => c.name === value)?.operator_name || value || "";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="gc-input flex w-full items-center justify-between text-left disabled:opacity-60"
      >
        <span className={label ? "" : "text-muted"}>{label || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-[var(--gc-card)] shadow-xl">
          {allowEmpty && (
            <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40" onClick={() => { onChange(""); setOpen(false); }}>
              <span className="text-muted">None</span>
              {!value && <Check className="h-4 w-4 text-primary" />}
            </button>
          )}
          {companies.length === 0 && <div className="px-3 py-2 text-xs text-muted">No operator companies found.</div>}
          {companies.map((c) => (
            <button
              key={c.name}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40"
              onClick={() => { onChange(c.name); setOpen(false); }}
            >
              <span>{c.operator_name || c.name}</span>
              {value === c.name && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
