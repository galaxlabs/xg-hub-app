import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PhoneCall, UserCheck, Activity as ActivityIcon, PhoneOutgoing,
  LayoutDashboard, TrendingUp, BarChart3, CheckCircle2,
} from "lucide-react";
import { fetchDashboardStats, thisMonthRange } from "../lib/api";
import OverviewPage from "./OverviewPage";
import PipelinePage from "./PipelinePage";
import AnalyticsPage from "./AnalyticsPage";
import SignsPage from "./SignsPage";
import { LoadingBlock } from "../components/ui/index";

const TABS = [
  { id: "command", label: "Command Centre", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: TrendingUp },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "signs", label: "Signs", icon: CheckCircle2 },
];

function StatTile({ label, value, color, icon: Icon }: { label: string; value: React.ReactNode; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--gc-card)] p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <Icon className="h-3.5 w-3.5" style={{ color }} /> {label}
      </div>
      <div className="mt-1 text-lg font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState("command");
  const { from, to } = thisMonthRange();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", from, to],
    queryFn: () => fetchDashboardStats({ from_date: from, to_date: to }),
  });

  const fu = stats?.followups;
  const hrms = stats?.hrms;
  const act = stats?.activity;
  const calls = stats?.calls;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats strip: follow-ups, HRMS, activity, calls */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {isLoading || !stats ? (
          <div className="col-span-2 lg:col-span-4 xl:col-span-8"><LoadingBlock /></div>
        ) : (
          <>
            <StatTile label="Follow-ups Due" value={fu?.today_due ?? 0} color="#f59e0b" icon={PhoneCall} />
            <StatTile label="Follow-ups Done" value={fu?.completed ?? 0} color="#16a34a" icon={CheckCircle2} />
            <StatTile label="Follow-up Rate" value={`${fu?.completion_rate ?? 0}%`} color="#6366f1" icon={PhoneOutgoing} />
            <StatTile label="Active Employees" value={hrms?.active_employees ?? 0} color="#0ea5e9" icon={UserCheck} />
            <StatTile label="Present Today" value={hrms?.present ?? 0} color="#22c55e" icon={ActivityIcon} />
            <StatTile label="Active Hours" value={act?.active_hours ?? 0} color="#8b5cf6" icon={ActivityIcon} />
            <StatTile label="Total Calls" value={calls?.total_calls ?? 0} color="#f97316" icon={PhoneOutgoing} />
            <StatTile label="Talk (min)" value={calls?.talk_minutes ?? 0} color="#14b8a6" icon={PhoneCall} />
          </>
        )}
      </div>

      {/* Daily call target met/not */}
      {!isLoading && stats && (calls?.days?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Daily Call Target</span>
            <span className="text-xs text-muted">
              Target {calls?.daily_target} calls/day · {calls?.met_days ?? 0} of {calls?.days?.length ?? 0} days met
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(calls?.days ?? []).slice(0, 30).map((d) => (
              <span
                key={d.date}
                className="rounded px-2 py-1 text-[11px] font-medium"
                style={{ background: d.met ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.12)", color: d.met ? "#16a34a" : "#ef4444" }}
                title={`${d.date}: ${d.total_calls} calls (${d.met ? "met" : "missed"})`}
              >
                {String(d.date).slice(5)} · {d.total_calls}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-[var(--gc-surface)] p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-[var(--gc-card)] text-primary shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === "command" && <OverviewPage />}
        {tab === "pipeline" && <PipelinePage />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "signs" && <SignsPage />}
      </div>
    </div>
  );
}
