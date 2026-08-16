import type { DashboardStats } from "../lib/api";
import { PhoneOutgoing, PhoneIncoming, PhoneMissed, Timer, Target } from "lucide-react";

function Tile({ label, value, color, icon: Icon }: { label: string; value: React.ReactNode; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className="h-4 w-4" style={{ color }} /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

export default function CallsStatsTab({ stats }: { stats?: DashboardStats }) {
  const c = stats?.calls;
  const tiles = [
    { label: "Total Calls", value: c?.total_calls ?? 0, color: "#f97316", icon: PhoneOutgoing },
    { label: "Answered", value: c?.answered ?? 0, color: "#16a34a", icon: PhoneIncoming },
    { label: "Missed / Not Answered", value: c?.missed ?? 0, color: "#ef4444", icon: PhoneMissed },
    { label: "Talk Time (min)", value: c?.talk_minutes ?? 0, color: "#14b8a6", icon: Timer },
  ];
  const days = c?.days ?? [];
  const metDays = c?.met_days ?? 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => <Tile key={t.label} {...t} />)}
      </div>

      <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-orange-500" /> Daily Call Target</div>
          <span className="text-xs text-muted">Target {c?.daily_target ?? 20} calls/day · {metDays} of {days.length} days met</span>
        </div>
        {days.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">No call summaries in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="gc-table">
              <thead>
                <tr><th>Date</th><th className="text-right">Calls</th><th className="text-right">Answered</th><th className="text-right">Target</th><th>Status</th></tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date}>
                    <td>{String(d.date).slice(0, 10)}</td>
                    <td className="text-right font-semibold">{d.total_calls}</td>
                    <td className="text-right">{d.answered}</td>
                    <td className="text-right">{d.target}</td>
                    <td>
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: d.met ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.12)", color: d.met ? "#16a34a" : "#ef4444" }}>
                        {d.met ? "Met" : "Missed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
