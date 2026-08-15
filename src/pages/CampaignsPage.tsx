import { useEffect, useState } from "react";
import { Plus, Target, Users, Activity, X, ArrowLeft, Calendar as CalendarIcon, DollarSign, MoreVertical, Trash2 } from "lucide-react";
import { callFrappe } from "../lib/frappe";

interface CampaignRow {
  name: string;
  campaign_name?: string;
  description?: string;
  budget?: number | string | null;
  start_date?: string | null;
  campaign_status?: string;
  owner?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<CampaignRow | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [form, setForm] = useState({ campaign_name: "", budget: "", start_date: "", description: "" });

  async function load() {
    setLoading(true);
    try {
      const rows = await callFrappe<CampaignRow[]>("frappe.client.get_list", {
        doctype: "Campaign",
        fields: ["name", "campaign_name", "description", "budget", "start_date", "campaign_status", "owner"],
        order_by: "creation desc",
        limit_page_length: 100,
      });
      setCampaigns(rows || []);
    } catch (e: any) { setError(e.message || "Failed to load campaigns"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaign_name.trim()) return;
    setError("");
    try {
      await callFrappe("frappe.client.insert", {
        doc: JSON.stringify({
          doctype: "Campaign",
          campaign_name: form.campaign_name.trim(),
          budget: form.budget ? Number(form.budget) : 0,
          start_date: form.start_date || null,
          campaign_status: "Active",
          description: form.description || "",
        }),
      });
      setForm({ campaign_name: "", budget: "", start_date: "", description: "" });
      setModalOpen(false);
      await load();
    } catch (err: any) { setError(err.message || "Failed to create campaign."); }
  }

  async function changeStatus(name: string, status: string) {
    try {
      await callFrappe("frappe.client.set_value", { doctype: "Campaign", name, fieldname: "campaign_status", value: status });
      setCampaigns(campaigns.map((c) => (c.name === name ? { ...c, campaign_status: status } : c)));
    } catch (e: any) { setError(e.message || "Update failed."); }
    setOpenMenu(null);
  }

  async function remove(name: string) {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await callFrappe("frappe.client.delete", { doctype: "Campaign", name });
      setCampaigns(campaigns.filter((c) => c.name !== name));
      setOpenMenu(null);
    } catch (e: any) { setError(e.message || "Delete failed."); }
  }

  if (selected) {
    return (
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button className="flex items-center gap-1 text-xs text-muted hover:text-foreground" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Campaigns
            </button>
            <h1 className="mt-2 text-xl font-semibold">{selected.campaign_name || selected.name}</h1>
            <p className="text-sm text-muted">Campaign Details & Metrics</p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: selected.campaign_status === "Active" ? "rgba(76,175,80,0.12)" : "rgba(255,152,0,0.12)", color: selected.campaign_status === "Active" ? "#16a34a" : "#f59e0b" }}>
            {selected.campaign_status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
            <div className="flex items-center justify-between text-xs text-muted"><span>Total Reach</span><Users className="h-4 w-4 text-indigo-500" /></div>
            <div className="mt-2 text-xl font-semibold">—</div>
          </div>
          <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
            <div className="flex items-center justify-between text-xs text-muted"><span>Conversion Rate</span><Activity className="h-4 w-4 text-green-500" /></div>
            <div className="mt-2 text-xl font-semibold">—</div>
          </div>
          <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
            <div className="flex items-center justify-between text-xs text-muted"><span>Budget</span><DollarSign className="h-4 w-4 text-amber-500" /></div>
            <div className="mt-2 text-xl font-semibold">{selected.budget ? `$${Number(selected.budget).toLocaleString()}` : "N/A"}</div>
          </div>
          <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
            <div className="flex items-center justify-between text-xs text-muted"><span>Start Date</span><CalendarIcon className="h-4 w-4 text-muted" /></div>
            <div className="mt-2 text-xl font-semibold">{selected.start_date ? String(selected.start_date).slice(0, 10) : "N/A"}</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-red-500" /> Campaign Strategy & Details</div>
          <p className="text-sm leading-relaxed">{selected.description || "No detailed description provided for this campaign."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Campaign Management</h1>
          <p className="text-sm text-muted">Monitor and deploy AI campaigns</p>
        </div>
        <button className="gc-btn gc-btn-primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Campaign</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">No campaigns created yet. Add campaign from here.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <div key={c.name} className="relative rounded-lg border border-border bg-[var(--gc-card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <button className="flex items-center gap-2 text-sm font-semibold hover:text-indigo-500" onClick={() => setSelected(c)}>
                  <Target className="h-4 w-4 text-indigo-500" /> {c.campaign_name || c.name}
                </button>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: c.campaign_status === "Active" ? "rgba(76,175,80,0.12)" : "rgba(255,152,0,0.12)", color: c.campaign_status === "Active" ? "#16a34a" : "#f59e0b" }}>
                    {c.campaign_status}
                  </span>
                  <div className="relative">
                    <button className="gc-btn gc-btn-ghost h-7 w-7 p-0" onClick={() => setOpenMenu(openMenu === c.name ? null : c.name)}><MoreVertical className="h-4 w-4" /></button>
                    {openMenu === c.name && (
                      <div className="absolute right-0 top-8 z-10 min-w-36 overflow-hidden rounded-lg border border-border bg-[var(--gc-card)] shadow-xl">
                        <button className="block w-full px-4 py-2 text-left text-xs hover:bg-muted" onClick={() => changeStatus(c.name, "Active")}>Active</button>
                        <button className="block w-full px-4 py-2 text-left text-xs hover:bg-muted" onClick={() => changeStatus(c.name, "Paused")}>Paused</button>
                        <button className="flex w-full items-center gap-1.5 px-4 py-2 text-left text-xs text-red-500 hover:bg-muted" onClick={() => remove(c.name)}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[11px] text-muted">Budget</div>
                  <div className="mt-0.5 font-semibold">{c.budget ? `$${Number(c.budget).toLocaleString()}` : "N/A"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">Start Date</div>
                  <div className="mt-0.5 font-semibold">{c.start_date ? String(c.start_date).slice(0, 10) : "N/A"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <form onSubmit={create} className="w-full max-w-md rounded-lg border border-border bg-[var(--gc-card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 flex items-center justify-between text-base font-semibold">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-500" /> Add Campaign</span>
              <X className="h-4 w-4 cursor-pointer" onClick={() => setModalOpen(false)} />
            </h2>
            <div className="space-y-3">
              <div><label className="text-xs text-muted">Campaign Name *</label>
                <input className="gc-input mt-1 w-full" required placeholder="e.g., Q4 Black Friday AI Boost" value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted">Budget</label>
                  <input className="gc-input mt-1 w-full" placeholder="e.g., 5000" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
                <div><label className="text-xs text-muted">Start Date</label>
                  <input type="date" className="gc-input mt-1 w-full" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              </div>
              <div><label className="text-xs text-muted">Description & Strategy</label>
                <textarea rows={3} className="gc-input mt-1 w-full" placeholder="Campaign strategy details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="gc-btn gc-btn-primary">Add Campaign</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
