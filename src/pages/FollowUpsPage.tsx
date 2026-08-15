import { useEffect, useState } from "react";
import { useDashboardSession } from "../lib/session";
import { callFrappe } from "../lib/frappe";
import { syncFollowUps } from "../lib/leadCache";

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
                      {(fu.status === "Due" || fu.status === "Scheduled" || fu.status === "Completed") && (
                        <button className="gc-btn gc-btn-sm" onClick={() => void convert(fu)}>Convert → Lead</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
