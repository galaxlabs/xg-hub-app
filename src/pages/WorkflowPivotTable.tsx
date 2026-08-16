import { useEffect, useState } from "react";
import { TableProperties, Download } from "lucide-react";
import { fetchWorkflowPivot, thisMonthRange } from "../lib/api";
import type { WorkflowPivotResponse } from "../lib/api";

const STAGE_COLORS: Record<string, string> = {
  Submitted: "#334155", Pending: "#3b82f6", Approved: "#f59e0b",
  "Agreement Sent": "#005c08", "Pending Sign": "#0ea5e9",
  Signed: "#10b981", Converted: "#0ea5e9", Installed: "#22c55e",
  Rejected: "#ef4444", "Signed Rejected": "#ef4444",
  "Not Qualified": "#9ca3af", Cancelled: "#9ca3af",
  "Not Interested": "#8b5cf6", Interested: "#f59e0b",
};

export default function WorkflowPivotTable() {
  const { from, to } = thisMonthRange();
  const [fromDate, setFrom] = useState(from);
  const [toDate, setTo] = useState(to);
  const [company, setCompany] = useState("");
  const [agent, setAgent] = useState("");
  const [data, setData] = useState<WorkflowPivotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWorkflowPivot({ start_date: fromDate, end_date: toDate, company: company || undefined, agent: agent || undefined });
      setData(res);
    } catch (e: any) { setError(e.message || "Report failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void run(); }, []);

  const exportCsv = () => {
    if (!data) return;
    const cols = ["Company", "Agent", ...data.stages, "Total"];
    const lines = [
      cols.join(","),
      ...data.rows.map((r) => cols.map((c) => `"${c === "Company" ? r.company : c === "Agent" ? r.agent : r[c] ?? 0}"`).join(",")),
      `"","",${data.stages.map((s) => data.totals[s] ?? 0).join(",")},${data.totals.total ?? ""}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `workflow-pivot-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">From</span>
            <input type="date" className="gc-input" value={fromDate} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">To</span>
            <input type="date" className="gc-input" value={toDate} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Company</span>
            <input className="gc-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="All" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Agent</span>
            <input className="gc-input" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="All" /></label>
          <button className="gc-btn gc-btn-primary" onClick={() => void run()} disabled={loading}>{loading ? "Running…" : "Run"}</button>
          {data && <button className="gc-btn gc-btn-ghost" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</button>}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading workflow pivot…</div>
      ) : data ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="gc-table">
            <thead>
              <tr>
                <th>Company</th><th>Agent</th>
                {data.stages.map((s) => (
                  <th key={s} className="text-right" title={s}>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLORS[s] || "#888" }} />
                      {s}
                    </span>
                  </th>
                ))}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={`${r.company}-${r.agent}-${i}`}>
                  <td className="font-medium">{r.company}</td>
                  <td>{r.agent}</td>
                  {data.stages.map((s) => (
                    <td key={s} className="text-right" style={{ color: (r[s] || 0) > 0 ? STAGE_COLORS[s] || undefined : undefined }}>
                      {r[s] || 0}
                    </td>
                  ))}
                  <td className="text-right font-bold">{r.total || 0}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/40 font-semibold">
                <td colSpan={2} className="text-right">TOTAL</td>
                {data.stages.map((s) => <td key={s} className="text-right">{data.totals[s] ?? 0}</td>)}
                <td className="text-right">{data.totals.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {data && (
        <p className="text-xs text-muted">
          {data.rows.length} company × agent rows · stage counts measured by each stage's own date field when available, otherwise current workflow state.
        </p>
      )}
    </div>
  );
}
