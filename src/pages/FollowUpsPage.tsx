import { useEffect, useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { useDashboardSession } from "../lib/session";
import { callFrappe } from "../lib/frappe";
import { syncFollowUps } from "../lib/leadCache";
import BusinessHours, { type OpeningHourRow } from "../components/BusinessHours";
import CompanySelect from "../components/CompanySelect";
import { fetchFollowUpSlots, fetchFollowUpSettings } from "../lib/api";
import type { FollowUpSlot, FollowUpSettings } from "../lib/api";

type FollowUp = {
  name?: string;
  lead?: string;
  business_name?: string;
  business_phone?: string;
  company?: string;
  priority?: string;
  follow_up_time?: string;
  status?: string;
  assigned_to?: string;
  assigned_branch?: string;
  notes?: string;
  dial_result?: string;
  business_address?: string;
  state_code?: string;
};

const STATUS_STYLE: Record<string, string> = {
  Scheduled: "#6b7280",
  Due: "#d97706",
  Dialing: "#2563eb",
  Completed: "#16a34a",
  Missed: "#ef4444",
  Cancelled: "#6b7280",
};

export default function FollowUpsPage() {
  const session = useDashboardSession();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await syncFollowUps(session?.user || "guest");
      const rows = Array.isArray(res) ? res : (res as any)?.rows || [];
      setRows(status ? rows.filter((r: FollowUp) => r.status === status) : rows);
    } catch (e: any) {
      setError(e.message || "Failed to load follow-ups");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [status, session?.user]);

  async function complete(fu: FollowUp) {
    try {
      await callFrappe("cclms.api.follow_up.complete_follow_up", { name: fu.name, result: "Completed from XG Hub" });
      await load();
    } catch (e: any) {
      setError(e.message || "Failed");
    }
  }

  async function convert(fu: FollowUp) {
    const company = window.prompt("Operator company for the ATM Lead (e.g. Rocket Coin):", fu.company || "Rocket Coin");
    if (!company) return;
    try {
      await callFrappe("cclms.api.follow_up.convert_follow_up_to_lead", {
        name: fu.name, company, workflow_state: "Pending",
        full_address: fu.business_address || "",
        state_code: fu.state_code || "",
      });
      window.alert("ATM Lead created from follow-up");
      await load();
    } catch (e: any) {
      setError(e.message || "Convert failed");
    }
  }

  async function notInterested(fu: FollowUp) {
    const reason = window.prompt("Reason for Not Interested (optional):", "");
    try {
      await callFrappe("cclms.api.follow_up.mark_not_interested", {
        name: fu.name,
        reason: reason || "",
      });
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to mark Not Interested");
    }
  }

  async function attachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !attachTarget) return;
    setAttaching(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("is_private", "0");
      body.append("attached_to_doctype", "Follow-up Schedule");
      body.append("attached_to_name", attachTarget);
      const res = await fetch("/api/method/frappe.handler.upload_file", { method: "POST", credentials: "include", body });
      const data = await res.json();
      if (!data?.message?.file_name) throw new Error("Upload failed");
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setAttaching(false);
      setAttachTarget(null);
      if (attachRef.current) attachRef.current.value = "";
    }
  }

  const [showCreate, setShowCreate] = useState(false);
  const [attachTarget, setAttachTarget] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const [newFu, setNewFu] = useState({
    business_name: "", business_phone: "", contact: "", follow_up_time: "", priority: "Normal",
    business_type: "", owner_name: "", email: "", personal_cell_phone: "", company: "",
    operating_company: "", business_address: "", city: "", state: "", state_code: "",
    zip_code: "", country: "",     website_url: "", source_url: "", notes: "",
    opening_hours: [] as OpeningHourRow[],
    domain: "",
  });
  const [fuSettings, setFuSettings] = useState<FollowUpSettings | null>(null);
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<FollowUpSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    fetchFollowUpSettings().then((s) => { setFuSettings(s); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showCreate) return;
    setSlotsLoading(true);
    fetchFollowUpSlots({ date: slotDate })
      .then((res) => { setSlots(res.slots || []); setSelectedSlot(""); setNewFu((p) => ({ ...p, follow_up_time: "" })); })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [showCreate, slotDate]);

  async function createFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!newFu.business_name.trim()) { setError("Business name is required"); return; }
    if (!newFu.follow_up_time) { setError("Pick a 5-minute time slot for the follow-up"); return; }
    try {
      await callFrappe("cclms.api.follow_up.schedule_follow_up", {
        lead_name: null,
        follow_up_time: newFu.follow_up_time,
        priority: newFu.priority || "Normal",
        business_name: newFu.business_name,
        business_phone: newFu.business_phone || newFu.contact,
        contact: newFu.contact,
        company: newFu.company,
        operating_company: newFu.operating_company,
        business_type: newFu.business_type,
        owner_name: newFu.owner_name,
        email: newFu.email,
        personal_cell_phone: newFu.personal_cell_phone,
        business_address: newFu.business_address,
        city: newFu.city,
        state: newFu.state,
        state_code: newFu.state_code,
        zip_code: newFu.zip_code,
        country: newFu.country,
        website_url: newFu.website_url,
        source_url: newFu.source_url,
        notes: newFu.notes,
        opening_hours: newFu.opening_hours,
        domain: newFu.domain,
      });
      setShowCreate(false);
      setNewFu({
        business_name: "", business_phone: "", contact: "", follow_up_time: "", priority: "Normal",
        business_type: "", owner_name: "", email: "", personal_cell_phone: "", company: "",
        operating_company: "", business_address: "", city: "", state: "", state_code: "",
        zip_code: "", country: "", website_url: "", source_url: "", notes: "",
        opening_hours: [],
        domain: "",
      });
      await load();
    } catch (e: any) {
      setError(e.message || "Create failed");
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Sales Follow-ups</h1>
          <p className="text-sm text-muted">Auto-assigned follow-up calls for sales agents. Convert a positive call into an ATM Lead.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="gc-input h-9 w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_STYLE).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="gc-btn gc-btn-primary" onClick={() => setShowCreate(true)}>+ New Follow-up</button>
          <button className="gc-btn" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading follow-ups…</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">No follow-ups found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted">
                <th className="px-3 py-2">Business</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Priority</th><th className="px-3 py-2">Follow-up</th><th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Branch</th><th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((fu) => (
                <tr key={fu.name} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{fu.business_name || fu.lead || fu.name}</td>
                  <td className="px-3 py-2">{fu.business_phone || "-"}</td>
                  <td className="px-3 py-2">{fu.company || "-"}</td>
                  <td className="px-3 py-2">{fu.priority || "Normal"}</td>
                  <td className="px-3 py-2">{fu.follow_up_time ? String(fu.follow_up_time).slice(0, 16) : "-"}</td>
                  <td className="px-3 py-2"><span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: STATUS_STYLE[fu.status || ""] || "#6b7280" }}>{fu.status || "-"}</span></td>
                  <td className="px-3 py-2">{fu.assigned_branch || fu.assigned_to || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {(fu.status === "Due" || fu.status === "Scheduled") && (
                        <button className="gc-btn gc-btn-sm" style={{ color: "#16a34a" }} onClick={() => void complete(fu)}>Complete</button>
                      )}
                      {(fu.status === "Due" || fu.status === "Scheduled") && (
                        <button className="gc-btn gc-btn-sm" style={{ color: "#8b5cf6" }} onClick={() => void notInterested(fu)}>Not Interested</button>
                      )}
                      {(fu.status === "Due" || fu.status === "Scheduled" || fu.status === "Completed") && (
                        <button className="gc-btn gc-btn-sm" onClick={() => void convert(fu)}>Convert → Lead</button>
                      )}
                      <button
                        className="gc-btn gc-btn-sm"
                        title="Attach document"
                        disabled={attaching && attachTarget === fu.name}
                        onClick={() => { setAttachTarget(fu.name || ""); attachRef.current?.click(); }}
                      >
                        {attaching && attachTarget === fu.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <input ref={attachRef} type="file" className="hidden" onChange={attachFile} />

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={createFollowUp} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-[var(--gc-card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-base font-semibold">New Follow-up</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="text-xs text-muted">Business Name *</label>
                <input className="gc-input mt-1 w-full" value={newFu.business_name} onChange={(e) => setNewFu({ ...newFu, business_name: e.target.value })} placeholder="e.g. Sinclair Gas Station" required /></div>
              <div><label className="text-xs text-muted">Business Phone</label>
                <input className="gc-input mt-1 w-full" value={newFu.business_phone} onChange={(e) => setNewFu({ ...newFu, business_phone: e.target.value })} placeholder="e.g. 5558675309" /></div>
              <div><label className="text-xs text-muted">Contact (Email/Phone)</label>
                <input className="gc-input mt-1 w-full" value={newFu.contact} onChange={(e) => setNewFu({ ...newFu, contact: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Follow-up Date</label>
                <input type="date" className="gc-input mt-1 w-full" value={slotDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSlotDate(e.target.value)} /></div>
              <div><label className="text-xs text-muted">Priority</label>
                <select className="gc-input mt-1 w-full" value={newFu.priority} onChange={(e) => setNewFu({ ...newFu, priority: e.target.value })}>
                  {["Low", "Normal", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted">Time Slot (5-minute slots)</label>
                {slotsLoading ? (
                  <div className="mt-1 py-3 text-center text-xs text-muted">Loading slots…</div>
                ) : (() => {
                  const available = slots.filter((s) => !s.booked);
                  return (
                    <div>
                      <div className="mb-1 text-[11px] text-muted">{available.length} of {slots.length} slots available (booked ones are hidden for you)</div>
                      <div className="mt-1 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
                        {available.map((s) => {
                          const active = selectedSlot === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => { setSelectedSlot(s.value); setNewFu((p) => ({ ...p, follow_up_time: s.value })); }}
                              className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-fore" : "border-border hover:border-primary hover:text-primary"}`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                        {available.length === 0 && <div className="w-full py-3 text-center text-xs text-muted">No slots available for this day.</div>}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div><label className="text-xs text-muted">Domain *</label>
                <select
                  className="gc-input mt-1 w-full"
                  value={newFu.domain}
                  onChange={(e) => setNewFu({ ...newFu, domain: e.target.value, company: "" })}
                >
                  <option value="">Select domain</option>
                  {(fuSettings?.domains || []).map((d) => <option key={d} value={d}>{d}</option>)}
                </select></div>
              <div><label className="text-xs text-muted">Operator Company *</label>
                <div className="mt-1"><CompanySelect domain={newFu.domain || undefined} value={newFu.company} onChange={(v) => setNewFu({ ...newFu, company: v, operating_company: v })} placeholder="Select operator company" /></div></div>
              <div><label className="text-xs text-muted">Owner / Operating Company</label>
                <input className="gc-input mt-1 w-full" value={newFu.operating_company} onChange={(e) => setNewFu({ ...newFu, operating_company: e.target.value })} placeholder="e.g. Rocket Coin" /></div>
              <div><label className="text-xs text-muted">Business Type</label>
                <input className="gc-input mt-1 w-full" value={newFu.business_type} onChange={(e) => setNewFu({ ...newFu, business_type: e.target.value })} placeholder="e.g. Gas Station" /></div>
              <div><label className="text-xs text-muted">Owner Name</label>
                <input className="gc-input mt-1 w-full" value={newFu.owner_name} onChange={(e) => setNewFu({ ...newFu, owner_name: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Email</label>
                <input className="gc-input mt-1 w-full" value={newFu.email} onChange={(e) => setNewFu({ ...newFu, email: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Personal Cell Phone</label>
                <input className="gc-input mt-1 w-full" value={newFu.personal_cell_phone} onChange={(e) => setNewFu({ ...newFu, personal_cell_phone: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Address</label>
                <input className="gc-input mt-1 w-full" value={newFu.business_address} onChange={(e) => setNewFu({ ...newFu, business_address: e.target.value })} /></div>
              <div><label className="text-xs text-muted">City</label>
                <input className="gc-input mt-1 w-full" value={newFu.city} onChange={(e) => setNewFu({ ...newFu, city: e.target.value })} /></div>
              <div><label className="text-xs text-muted">State/Province</label>
                <input className="gc-input mt-1 w-full" value={newFu.state} onChange={(e) => setNewFu({ ...newFu, state: e.target.value })} /></div>
              <div><label className="text-xs text-muted">State Code</label>
                <input className="gc-input mt-1 w-full" value={newFu.state_code} onChange={(e) => setNewFu({ ...newFu, state_code: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Zip/Postal Code</label>
                <input className="gc-input mt-1 w-full" value={newFu.zip_code} onChange={(e) => setNewFu({ ...newFu, zip_code: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Country</label>
                <input className="gc-input mt-1 w-full" value={newFu.country} onChange={(e) => setNewFu({ ...newFu, country: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Website URL</label>
                <input className="gc-input mt-1 w-full" value={newFu.website_url} onChange={(e) => setNewFu({ ...newFu, website_url: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Source URL</label>
                <input className="gc-input mt-1 w-full" value={newFu.source_url} onChange={(e) => setNewFu({ ...newFu, source_url: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="text-xs text-muted">Notes</label>
                <textarea rows={2} className="gc-input mt-1 w-full" value={newFu.notes} onChange={(e) => setNewFu({ ...newFu, notes: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <BusinessHours value={newFu.opening_hours} onChange={(rows) => setNewFu({ ...newFu, opening_hours: rows })} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="gc-btn gc-btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
