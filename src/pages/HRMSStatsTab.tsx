import type { DashboardStats } from "../lib/api";
import { Users, UserCheck, UserX, CalendarOff } from "lucide-react";

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

export default function HRMSStatsTab({ stats }: { stats?: DashboardStats }) {
  const h = stats?.hrms;
  const presentRate = h?.active_employees ? Math.round(((h.present ?? 0) / h.active_employees) * 100) : 0;
  const tiles = [
    { label: "Active Employees", value: h?.active_employees ?? 0, color: "#0ea5e9", icon: Users },
    { label: "Present", value: h?.present ?? 0, color: "#22c55e", icon: UserCheck },
    { label: "Absent", value: h?.absent ?? 0, color: "#ef4444", icon: UserX },
    { label: "On Leave", value: h?.on_leave ?? 0, color: "#f59e0b", icon: CalendarOff },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => <Tile key={t.label} {...t} />)}
      </div>
      <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
        <div className="mb-2 text-sm font-semibold">Attendance Today</div>
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted/50">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(presentRate, 100)}%` }} />
          </div>
          <span className="text-lg font-bold text-emerald-600">{presentRate}%</span>
        </div>
        <p className="mt-2 text-xs text-muted">{h?.present ?? 0} present · {h?.absent ?? 0} absent · {h?.on_leave ?? 0} on leave out of {h?.active_employees ?? 0} active employees.</p>
      </div>
    </div>
  );
}
