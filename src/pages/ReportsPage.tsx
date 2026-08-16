import { useEffect, useState } from "react";
import { Table2, Download } from "lucide-react";
import {
  fetchMultiDimReport, REPORT_DIMENSIONS, REPORT_MEASURES, thisMonthRange,
} from "../lib/api";
import type { MultiDimReportResponse } from "../lib/api";

export default function ReportsPage() {
  const { from, to } = thisMonthRange();
  const [dims, setDims] = useState<string[]>(["company"]);
  const [measures, setMeasures] = useState<string[]>(["count", "signed", "approved", "rejected"]);
  const [fromDate, setFrom] = useState(from);
  const [toDate, setTo] = useState(to);
  const [data, setData] = useState<MultiDimReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (dims.length === 0 || measures.length === 0) { setError("Pick at least one dimension and one measure"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetchMultiDimReport({ dimensions: dims, measures, start_date: fromDate, end_date: toDate });
      setData(res);
    } catch (e: any) {
      setError(e.message || "Report failed");
    } finally { setLoading(false); }
  }

  useEffect(() => { void run(); }, []);

  const toggle = (list: string[], key: string, set: (v: string[]) => void) => {
    set(list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);
  };

  const dimLabel = (k: string) => REPORT_DIMENSIONS.find((d) => d.key === k)?.label ?? k;
  const measureLabel = (k: string) => REPORT_MEASURES.find((m) => m.key === k)?.label ?? k;

  const exportCsv = () => {
    if (!data) return;
    const cols = [...data.dimensions, ...data.measures];
    const lines = [
      cols.join(","),
      ...data.rows.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Table2 className="h-5 w-5 text-indigo-500" /> Multi-Dimensional Report</h1>
          <p className="text-sm text-muted">Generate ATM Leads reports by any combination of dimensions and measures</p>
        </div>
        {data && <button className="gc-btn gc-btn-ghost" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</button>}
      </div>

      {/* Controls */}
      <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">From</span>
            <input type="date" className="gc-input" value={fromDate} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">To</span>
            <input type="date" className="gc-input" value={toDate} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        <div>
          <span className="text-xs font-medium text-muted">Dimensions (group by)</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {REPORT_DIMENSIONS.map((d) => (
              <button key={d.key} type="button" onClick={() => toggle(dims, d.key, setDims)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${dims.includes(d.key) ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-border text-muted hover:border-foreground/30"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs font-medium text-muted">Measures (show)</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {REPORT_MEASURES.map((m) => (
              <button key={m.key} type="button" onClick={() => toggle(measures, m.key, setMeasures)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${measures.includes(m.key) ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-border text-muted hover:border-foreground/30"}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <div className="flex justify-end">
          <button className="gc-btn gc-btn-primary" onClick={() => void run()} disabled={loading}>
            {loading ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Generating report…</div>
      ) : data ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="gc-table">
            <thead>
              <tr>
                {data.dimensions.map((d) => <th key={d}>{dimLabel(d)}</th>)}
                {data.measures.map((m) => <th key={m} className="text-right">{measureLabel(m)}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  {data.dimensions.map((d) => <td key={d} className="font-medium">{r[d] || "—"}</td>)}
                  {data.measures.map((m) => (
                    <td key={m} className="text-right">{typeof r[m] === "number" ? Math.round(r[m]) : r[m] ?? 0}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t bg-muted/40 font-semibold">
                <td colSpan={data.dimensions.length} className="text-right">TOTAL</td>
                {data.measures.map((m) => <td key={m} className="text-right">{data.totals[m] ?? 0}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
