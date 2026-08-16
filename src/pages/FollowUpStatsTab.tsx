import type { DashboardStats } from "../lib/api";
import { PhoneCall, CheckCircle2, XCircle, Clock, Percent } from "lucide-react";

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

export default function FollowUpStatsTab({ stats }: { stats?: DashboardStats }) {
  const fu = stats?.followups;
  const items = [
    { label: "Total", value: fu?.total ?? 0, color: "#6366f1" },
    { label: "Scheduled", value: fu?.scheduled ?? 0, color: "#0ea5e9" },
    { label: "Due Now", value: fu?.due ?? 0, color: "#f59e0b" },
    { label: "Due Today", value: fu?.today_due ?? 0, color: "#f97316" },
    { label: "Completed", value: fu?.completed ?? 0, color: "#16a34a" },
    { label: "Missed", value: fu?.missed ?? 0, color: "#ef4444" },
  ];
  const rate = fu?.completion_rate ?? 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((t) => (
          <Tile key={t.label} {...t} icon={t.label === "Missed" ? XCircle : t.label === "Completed" ? CheckCircle2 : PhoneCall} />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Percent className="h-4 w-4 text-indigo-500" /> Follow-up Completion Rate</div>
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted/50">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <span className="text-lg font-bold" style={{ color: rate >= 70 ? "#16a34a" : rate >= 40 ? "#f59e0b" : "#ef4444" }}>{rate}%</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Clock className="h-3.5 w-3.5" /> {fu?.completed ?? 0} of {fu?.total ?? 0} scheduled follow-ups completed.</p>
      </div>
    </div>
  );
}
