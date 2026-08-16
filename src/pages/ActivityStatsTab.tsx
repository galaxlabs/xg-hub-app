import type { DashboardStats } from "../lib/api";
import { Timer, Coffee, Gauge, Ban, PhoneOutgoing, CalendarRange } from "lucide-react";

function Tile({ label, value, color, icon: Icon, sub }: { label: string; value: React.ReactNode; color: string; sub?: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className="h-4 w-4" style={{ color }} /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export default function ActivityStatsTab({ stats }: { stats?: DashboardStats }) {
  const a = stats?.activity;
  const tiles = [
    { label: "Active Hours", value: a?.active_hours ?? 0, color: "#8b5cf6", icon: Timer, sub: "9h tracked workday" },
    { label: "Active Minutes", value: a?.active_minutes ?? 0, color: "#6366f1", icon: Timer },
    { label: "Idle Minutes", value: a?.idle_minutes ?? 0, color: "#f59e0b", icon: Coffee },
    { label: "Avg Productivity", value: a?.avg_productivity ? `${a.avg_productivity}%` : "—", color: "#16a34a", icon: Gauge },
    { label: "Unauthorized Hits", value: a?.unauthorized_hits ?? 0, color: "#ef4444", icon: Ban },
    { label: "Tracked Calls", value: a?.tracked_calls ?? 0, color: "#0ea5e9", icon: PhoneOutgoing },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => <Tile key={t.label} {...t} />)}
      </div>
      <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4 text-xs text-muted">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarRange className="h-4 w-4 text-violet-500" /> Productivity (Tracker)</div>
        <p className="mt-2">Based on {a?.log_days ?? 0} days of tracker logs. Active time = total active minus idle, capped at the 9-hour workday. Unauthorized site hits and per-day productivity scores are captured by the cclms tracker.</p>
      </div>
    </div>
  );
}
