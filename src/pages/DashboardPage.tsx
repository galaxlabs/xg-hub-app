import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, TrendingUp, BarChart3, CheckCircle2,
  PhoneCall, Users, Activity as ActivityIcon, PhoneOutgoing,
} from "lucide-react";
import { fetchDashboardStats, thisMonthRange } from "../lib/api";
import OverviewPage from "./OverviewPage";
import PipelinePage from "./PipelinePage";
import AnalyticsPage from "./AnalyticsPage";
import SignsPage from "./SignsPage";
import FollowUpStatsTab from "./FollowUpStatsTab";
import HRMSStatsTab from "./HRMSStatsTab";
import ActivityStatsTab from "./ActivityStatsTab";
import CallsStatsTab from "./CallsStatsTab";

const TABS = [
  { id: "command", label: "Command Centre", icon: LayoutDashboard },
  { id: "followups", label: "Follow-ups", icon: PhoneCall },
  { id: "hrms", label: "HRMS", icon: Users },
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "calls", label: "Calls", icon: PhoneOutgoing },
  { id: "pipeline", label: "Pipeline", icon: TrendingUp },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "signs", label: "Signs", icon: CheckCircle2 },
];

export default function DashboardPage() {
  const [tab, setTab] = useState("command");
  const { from, to } = thisMonthRange();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", from, to],
    queryFn: () => fetchDashboardStats({ from_date: from, to_date: to }),
  });

  return (
    <div className="space-y-5 animate-fade-in">
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
        {tab === "followups" && <FollowUpStatsTab stats={stats} />}
        {tab === "hrms" && <HRMSStatsTab stats={stats} />}
        {tab === "activity" && <ActivityStatsTab stats={stats} />}
        {tab === "calls" && <CallsStatsTab stats={stats} />}
        {tab === "pipeline" && <PipelinePage />}
        {tab === "analytics" && <AnalyticsPage />}
        {tab === "signs" && <SignsPage />}
      </div>
    </div>
  );
}
