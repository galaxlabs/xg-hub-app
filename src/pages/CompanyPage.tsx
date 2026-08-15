import { useEffect, useState } from "react";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { callFrappe } from "../lib/frappe";

interface CompanyRow {
  name: string;
  operator_name?: string;
  operator_company_name?: string;
}

export default function CompanyPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await callFrappe<CompanyRow[]>("frappe.client.get_list", {
        doctype: "Operator Companies",
        fields: ["name", "operator_name"],
        order_by: "operator_name asc",
        limit_page_length: 200,
      });
      setCompanies(rows || []);
    } catch (e: any) { setError(e.message || "Failed to load companies"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    try {
      await callFrappe("frappe.client.insert", {
        doc: JSON.stringify({ doctype: "Operator Companies", operator_name: newName.trim() }),
      });
      setNewName("");
      await load();
    } catch (err: any) { setError(err.message || "Failed to add company."); }
  }

  async function handleDelete(name: string) {
    if (!window.confirm("Are you sure you want to delete this company?")) return;
    try {
      await callFrappe("frappe.client.delete", { doctype: "Operator Companies", name });
      setCompanies(companies.filter((c) => c.name !== name));
    } catch (err: any) { setError(err.message || "Failed to delete company."); }
  }

  const displayName = (c: CompanyRow) => c.operator_name || c.name;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5 text-indigo-500" /> Companies</h1>
        <p className="text-sm text-muted">Add operator companies used across leads and contracts.</p>
      </div>

      <div className="max-w-xl space-y-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="gc-input flex-1"
              placeholder="Add Company Name"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(""); }}
            />
            <button type="submit" className="gc-btn gc-btn-primary"><Plus className="h-4 w-4" /> Add</button>
          </div>
        </form>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {loading ? (
          <div className="py-10 text-center text-sm text-muted">Loading…</div>
        ) : companies.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">No companies added yet.</div>
        ) : (
          <div className="space-y-2">
            {companies.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-[var(--gc-card)] px-4 py-3">
                <div>
                  <div className="font-medium">{displayName(c)}</div>
                </div>
                <button className="gc-btn gc-btn-ghost text-red-500" onClick={() => handleDelete(c.name)} title="Delete Company">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
