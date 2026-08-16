// XG Hub Dashboard - ERP workspace shell
// @ts-nocheck - route/layout scaffold; individual pages are typed where needed
import { useState, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  Activity,
  CalendarDays,
  Calendar,
  Building2,
  Target,
  FileText,
  Settings,
  Video,
  MessageCircle,
  CheckCircle2,
  CheckSquare,
  Compass,
  Gauge,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Clock,
  PanelLeftClose,
  PhoneCall,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import OverviewPage from "./pages/OverviewPage";
import DashboardPage from "./pages/DashboardPage";
import SignsPage from "./pages/SignsPage";
import AgentsPage from "./pages/AgentsPage";
import PipelinePage from "./pages/PipelinePage";
import AttendancePage from "./pages/AttendancePage";
import DirectionPage from "./pages/DirectionPage";
import LeadsPage from "./pages/LeadsPage";
import ProjectsPage from "./pages/ProjectsPage";
import FinancialsPage from "./pages/FinancialsPage";
import PayrollPage from "./pages/PayrollPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import EmployeesPage from "./pages/EmployeesPage";
import ActivityPage from "./pages/ActivityPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import CompanyPage from "./pages/CompanyPage";
import CampaignsPage from "./pages/CampaignsPage";
import DocumentsPage from "./pages/DocumentsPage";
import SettingsPage from "./pages/SettingsPage";
import MeetingsPage from "./pages/MeetingsPage";
import ChatPage from "./pages/ChatPage";

import { loginFrappe, logoutFrappe } from "./lib/frappe";
import { fetchThemeConfig, setMyTimezone, hasPortalPin, verifyPortalPin } from "./lib/api";
import type { PortalTheme, TimezoneOption } from "./lib/api";
import { themeStyleVars } from "./lib/theme";

import {
  DashboardSessionProvider,
  fetchDashboardSession,
  formatRoles,
  hasAnyRole,
  isGuestSession,
  useDashboardSession,
} from "./lib/session";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

type NavItem = {
  path: string;
  label: string;
  module: string;
  description: string;
  icon: any;
  roles?: string[];
};

const ROLE = {
  sales: ["Sales Agent", "Sales User", "Sales Manager", "Data Executive", "Onboarding Executive", "OC", "Administrator", "System Manager"],
  cclms: ["Sales Agent", "Sales User", "Sales Manager", "Data Executive", "Onboarding Executive", "OC", "Administrator", "System Manager"],
  projects: ["Project Manager", "Project User", "Administrator", "System Manager"],
  accounts: ["Accounts Manager", "Accounts User", "Finance Manager", "Administrator", "System Manager"],
  hr: ["HR Manager", "HR User", "Payroll Manager", "Administrator", "System Manager"],
  analytics: ["Sales Manager", "Data Executive", "Accounts Manager", "HR Manager", "Administrator", "System Manager"],
};

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", module: "ERP", description: "Live executive overview", icon: Gauge },
  { path: "/leads", label: "ATM Leads", module: "CCLMS", description: "Lead capture, workflow, dedupe", icon: Users, roles: ROLE.cclms },
  { path: "/followups", label: "Follow-ups", module: "Sales", description: "Sales-agent follow-up calls and convert to lead", icon: PhoneCall, roles: ROLE.sales },
  { path: "/tasks", label: "Tasks", module: "Sales", description: "Assign and track tasks", icon: CheckSquare, roles: ROLE.sales },
  { path: "/calendar", label: "Calendar", module: "Sales", description: "Leads and follow-ups calendar", icon: Calendar, roles: ROLE.sales },
  { path: "/companies", label: "Companies", module: "Sales", description: "Operator companies directory", icon: Building2, roles: ROLE.sales },
  { path: "/campaigns", label: "Campaigns", module: "Sales", description: "Monitor and deploy campaigns", icon: Target, roles: ROLE.sales },
  { path: "/documents", label: "Documents", module: "Sales", description: "Import and open documents", icon: FileText, roles: ROLE.sales },
  { path: "/meetings", label: "Meetings", module: "Sales", description: "Schedule and join Google Meet calls", icon: Video, roles: ROLE.sales },
  { path: "/chat", label: "Team Chat", module: "Sales", description: "Message your colleagues", icon: MessageCircle, roles: ROLE.sales },
  { path: "/settings", label: "Settings", module: "Sales", description: "Profile and appearance", icon: Settings, roles: ROLE.sales },
  { path: "/direction", label: "Direction", module: "CRM", description: "State and executive coverage", icon: Compass, roles: ROLE.sales },
  { path: "/agents", label: "Agents", module: "CRM", description: "Sales agent performance", icon: BadgeDollarSign, roles: ROLE.sales },
  { path: "/projects", label: "Projects", module: "Projects", description: "Project and task delivery", icon: BriefcaseBusiness, roles: ROLE.projects },
  { path: "/financials", label: "Financials", module: "Accounting", description: "GL, accounts, balances", icon: WalletCards, roles: ROLE.accounts },
  { path: "/employees", label: "Employees", module: "HR", description: "Employee directory and details", icon: Users, roles: ROLE.hr },
  { path: "/activity", label: "Activity", module: "HR", description: "Call & activity analytics", icon: Activity, roles: ROLE.hr },
  { path: "/attendance", label: "Attendance", module: "HR", description: "Activity and attendance logs", icon: CalendarDays, roles: ROLE.hr },
  { path: "/payroll", label: "Payroll", module: "HR", description: "Salary slips and payroll entries", icon: BadgeDollarSign, roles: ROLE.hr },
];

const PAGE_TITLES = Object.fromEntries(NAV_ITEMS.map((item) => [item.path, item.label]));

function currentPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function AppShellMessage({ kind, title, copy, action }: { kind: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--gc-bg)] px-6 text-[var(--gc-text)]">
      <div className="w-full max-w-xl rounded-[8px] border border-[var(--gc-border)] bg-[var(--gc-card)] p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-1 text-xs font-semibold text-[var(--gc-muted)]">
          <Sparkles className="h-3.5 w-3.5" />
          {kind}
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gc-muted)]">{copy}</p>
        {action ? <div className="mt-6 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: any }, { error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <AppShellMessage
          kind="Runtime error"
          title="The workspace needs a reload"
          copy="A frontend component stopped rendering. Retry the workspace; if it repeats, the browser console will show the failing component."
          action={<button className="gc-btn-primary" onClick={() => this.setState({ error: null })}>Retry</button>}
        />
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return <AppShellMessage kind="XG Hub" title="Preparing your workspace" copy="Checking the Frappe session, loading role access, and warming up the ERP modules." />;
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: () => Promise<unknown> }) {
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginFrappe(usr, pwd);
      await onLoggedIn();
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--gc-bg)] px-6 text-[var(--gc-text)]">
      <form onSubmit={submit} className="w-full max-w-md rounded-[8px] border border-[var(--gc-border)] bg-[var(--gc-card)] p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-1 text-xs font-semibold text-[var(--gc-muted)]">
          <LogIn className="h-3.5 w-3.5" /> Secure workspace
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-normal">Sign in to XG Hub</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gc-muted)]">Use your Frappe account. After login, the workspace only shows modules allowed by your roles.</p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-[var(--gc-muted)]">Email or username</span>
            <input className="gc-input h-11" value={usr} onChange={(event) => setUsr(event.target.value)} autoComplete="username" required />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-[var(--gc-muted)]">Password</span>
            <input className="gc-input h-11" value={pwd} onChange={(event) => setPwd(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
        </div>

        {error ? <div className="mt-4 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}

        <button className="mt-6 w-full justify-center gc-btn-primary" disabled={busy || !usr || !pwd} type="submit">
          <LogIn className="h-4 w-4" /> {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function AccessDenied({ path, title, roles }: { path: string; title: string; roles: string[] }) {
  const session = useDashboardSession();
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl rounded-[8px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-amber-700">
          <ShieldAlert className="h-4 w-4" /> Access restricted
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">Your current Frappe roles do not include this module. Ask an admin to adjust the role assignment, or sign in with the right account.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.map((role) => <span key={role} className="rounded-[6px] border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700">{role}</span>)}
        </div>
        {session && session.user !== "Guest" ? <p className="mt-4 text-xs text-slate-500">Signed in as {session.full_name ?? session.user} · {formatRoles(session.roles)}</p> : null}
      </div>
    </div>
  );
}

function RouteGate({ path, title, roles, children }: { path: string; title: string; roles: string[]; children: any }) {
  const session = useDashboardSession();
  if (!hasAnyRole(session?.roles, roles)) return <AccessDenied path={path} title={title} roles={roles} />;
   return children;
}

function TopBarClock({ timezone, timezones, onSelect }: {
  timezone?: string | null;
  timezones?: TimezoneOption[];
  onSelect?: (tz: string) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [localTz, setLocalTz] = useState(() => localStorage.getItem("gc-tz") || "");
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tz = localTz || timezone || "America/New_York";
  const label = timezones?.find((z) => z.value === tz)?.label || tz;
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: tz });
  const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz });
  return (
    <div className="relative hidden md:block">
      <button
        className="flex items-center gap-1.5 rounded-[6px] border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-xs text-[var(--gc-muted)]"
        onClick={() => setOpen((o) => !o)}
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="flex flex-col items-start leading-none">
          <span>{time} <span className="opacity-70">{date}</span></span>
          <span className="mt-0.5 text-[10px] opacity-70">{label}</span>
        </span>
      </button>
      {open && timezones && timezones.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 min-w-56 overflow-hidden rounded-lg border border-border bg-[var(--gc-card)] shadow-xl">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold">Choose your timezone</div>
            {timezones.map((z) => (
              <button
                key={z.value}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/50 ${z.value === tz ? "font-semibold" : ""}`}
                onClick={() => { setLocalTz(z.value); onSelect?.(z.value); setOpen(false); }}
              >
                <span>{z.label}</span>
                <span className="text-muted">{z.value.replace("America/", "").replace("Pacific/", "Hawaii ")}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SessionLock({ onUnlock, onLogout }: { onUnlock: () => void; onLogout: () => void }) {
  const [pin, setPin] = useState("");
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    hasPortalPin()
      .then((r) => setHasPin(!!r.has_pin))
      .catch(() => setHasPin(false))
      .finally(() => setChecking(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (hasPin) {
      if (!/^\d{8}$/.test(pin)) { setError("PIN must be exactly 8 digits."); return; }
      setUnlocking(true);
      try {
        const res = await verifyPortalPin(pin);
        if (res.ok) onUnlock();
        else setError("Incorrect PIN. Try again.");
      } catch (err: any) {
        setError(err.message || "Could not verify PIN.");
      } finally { setUnlocking(false); }
    } else {
      onUnlock();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-border bg-[var(--gc-card)] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Session Locked</h2>
        <p className="mt-1 text-xs text-muted">
          {checking ? "Checking…" : hasPin ? "Enter your 8-digit PIN to continue (no OTP needed)." : "Your session was locked for inactivity. Resume to continue."}
        </p>
        {!checking && hasPin && (
          <input
            autoFocus
            inputMode="numeric" pattern="\d{8}" maxLength={8} autoComplete="current-password"
            className="gc-input mt-4 w-full text-center text-xl tracking-[0.5em]"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
            placeholder="••••••••"
          />
        )}
        {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
        <div className="mt-5 flex gap-2">
          <button type="button" className="gc-btn gc-btn-ghost flex-1" onClick={onLogout}>Log out</button>
          <button type="submit" className="gc-btn gc-btn-primary flex-1" disabled={unlocking || checking}>
            {unlocking ? "Unlocking…" : hasPin ? "Unlock" : "Resume"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DashboardShell() {
  const session = useDashboardSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [locked, setLocked] = useState(false);

  // Backend-driven theme: a theme key is "accentId:mode" (e.g. "pink:light").
  const [themeKey, setThemeKey] = useState(() => {
    const stored = localStorage.getItem("gc-theme-key");
    if (stored) return stored;
    const t = localStorage.getItem("gc-theme");
    const m = localStorage.getItem("gc-mode");
    if (t && t !== "dark" && t !== "light") return `${t}:${m === "light" ? "light" : "dark"}`;
    return `default:${m === "light" ? "light" : "dark"}`;
  });
  const [themeConfig, setThemeConfig] = useState<{ themes: PortalTheme[]; timezones: TimezoneOption[] } | null>(null);

  useEffect(() => {
    fetchThemeConfig()
      .then((cfg) => setThemeConfig(cfg))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => {
      const stored = localStorage.getItem("gc-theme-key");
      if (stored) setThemeKey(stored);
    };
    window.addEventListener("gc-theme-change", onChange);
    return () => window.removeEventListener("gc-theme-change", onChange);
  }, []);

  const [accentId, mode] = themeKey.split(":") as [string, string];
  const darkMode = mode !== "light";
  const activeTheme = themeConfig?.themes.find((t) => t.id === accentId && t.mode === (darkMode ? "dark" : "light"))
    ?? themeConfig?.themes.find((t) => t.id === accentId)
    ?? themeConfig?.themes[0];
  const themeVars = activeTheme ? themeStyleVars(activeTheme) : {};
  const [navSearch, setNavSearch] = useState("");

  const handleLogout = async () => {
    await logoutFrappe();
    // Invalidate the session query so AppContent refetches and shows the login screen.
    await qc.invalidateQueries({ queryKey: ["dashboard-session"] });
    window.location.href = "/";
  };
  const location = useLocation();

  // Session lock after 15 min of inactivity (resume via PIN or simply resume).
  useEffect(() => {
    const SESSION_LOCK_MS = 15 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setLocked(true), SESSION_LOCK_MS);
    };
    reset();
    window.addEventListener("mousemove", reset);
    window.addEventListener("mousedown", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("touchstart", reset);
    window.addEventListener("scroll", reset, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("mousedown", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("touchstart", reset);
      window.removeEventListener("scroll", reset);
    };
  }, []);

  const roles = session?.roles ?? [];
  const visibleNav = NAV_ITEMS.filter((item) => hasAnyRole(roles, item.roles));
  const filteredNav = visibleNav.filter((item) => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return true;
    return `${item.label} ${item.module} ${item.description}`.toLowerCase().includes(q);
  });
  const groupedNav = filteredNav.reduce<Record<string, NavItem[]>>((groups, item) => {
    groups[item.module] = [...(groups[item.module] ?? []), item];
    return groups;
  }, {});
  const activeItem = visibleNav.find((item) => item.path === location.pathname) ?? visibleNav[0];
  const pageTitle = PAGE_TITLES[location.pathname] ?? activeItem?.label ?? "XG Hub";

  return (
    <div className={`${darkMode ? "dark" : ""}`} style={themeVars as React.CSSProperties}>
      {locked ? <SessionLock onUnlock={() => setLocked(false)} onLogout={() => void handleLogout()} /> : null}
      <div className="min-h-screen bg-[var(--gc-bg)] text-[var(--gc-text)]">
        {sidebarOpen ? <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

        <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--gc-sidebar-border)] bg-[var(--gc-sidebar)] text-white transition-all duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-24" : "lg:w-80"} w-80 lg:translate-x-0`}>
          <div className="flex items-center gap-3 border-b border-[var(--gc-sidebar-border)] px-5 py-5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-[var(--gc-sidebar-primary)] text-base font-black text-[var(--gc-sidebar-primary-text)] shadow-sm">XG</div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">XG Hub</div>
              </div>
            ) : null}
            <button className="ml-auto hidden rounded-[6px] p-2 text-white/70 hover:bg-white/10 lg:inline-flex" onClick={() => setCollapsed((v) => !v)} title="Toggle sidebar">
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <button className="ml-auto rounded-[6px] p-2 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(false)} title="Close navigation">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!collapsed ? (
            <div className="px-4 py-4">
              <label className="flex h-10 items-center gap-2 rounded-[8px] border border-white/10 bg-white/7 px-3 text-white/70">
                <Search className="h-4 w-4" />
                <input className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45" value={navSearch} onChange={(e) => setNavSearch(e.target.value)} placeholder="Search modules" />
              </label>
            </div>
          ) : null}

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {Object.entries(groupedNav).map(([module, items]) => (
              <div key={module} className="mb-4">
                {!collapsed ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-normal text-white/45">{module}</div> : null}
                <div className="grid gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `xg-nav-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`} title={collapsed ? item.label : undefined}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed ? (
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.label}</span>
                          </span>
                        ) : null}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-[var(--gc-sidebar-border)] p-4">
            <div className="rounded-[8px] bg-white/7 p-3">
              <div className="truncate text-sm font-semibold">{session?.full_name ?? session?.user}</div>
              {!collapsed ? <div className="mt-1 truncate text-xs text-white/60">{formatRoles(roles)}</div> : null}
            </div>
            <button
              onClick={() => void handleLogout()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" /> {collapsed ? "" : "Sign out"}
            </button>
          </div>
        </aside>

        <div className={`${collapsed ? "lg:pl-24" : "lg:pl-80"} transition-all duration-200`}>
          <header className="sticky top-0 z-20 border-b border-[var(--gc-border)] bg-[var(--gc-card)]/95 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button className="rounded-[6px] p-2 hover:bg-[var(--gc-surface)] lg:hidden" onClick={() => setSidebarOpen(true)} title="Open navigation"><Menu className="h-5 w-5" /></button>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-normal">{pageTitle}</div>
                </div>
              </div>
               <div className="flex items-center gap-2">
                 <TopBarClock
                   timezone={session?.timezone}
                   timezones={themeConfig?.timezones}
                   onSelect={(tz) => {
                     localStorage.setItem("gc-tz", tz);
                     setMyTimezone(tz).catch(() => {});
                   }}
                 />
                 <button className="rounded-[6px] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-2" onClick={() => { const next = darkMode ? "light" : "dark"; const [a] = themeKey.split(":"); localStorage.setItem("gc-theme-key", `${a}:${next}`); window.dispatchEvent(new Event("gc-theme-change")); }} title={darkMode ? "Light mode" : "Dark mode"}>{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/leads" element={<RouteGate path="/leads" title="ATM Leads" roles={ROLE.cclms}><LeadsPage /></RouteGate>} />
              <Route path="/followups" element={<RouteGate path="/followups" title="Follow-ups" roles={ROLE.sales}><FollowUpsPage /></RouteGate>} />
              <Route path="/tasks" element={<RouteGate path="/tasks" title="Tasks" roles={ROLE.sales}><TasksPage /></RouteGate>} />
              <Route path="/calendar" element={<RouteGate path="/calendar" title="Calendar" roles={ROLE.sales}><CalendarPage /></RouteGate>} />
              <Route path="/companies" element={<RouteGate path="/companies" title="Companies" roles={ROLE.sales}><CompanyPage /></RouteGate>} />
              <Route path="/campaigns" element={<RouteGate path="/campaigns" title="Campaigns" roles={ROLE.sales}><CampaignsPage /></RouteGate>} />
              <Route path="/documents" element={<RouteGate path="/documents" title="Documents" roles={ROLE.sales}><DocumentsPage /></RouteGate>} />
              <Route path="/meetings" element={<RouteGate path="/meetings" title="Meetings" roles={ROLE.sales}><MeetingsPage /></RouteGate>} />
              <Route path="/chat" element={<RouteGate path="/chat" title="Team Chat" roles={ROLE.sales}><ChatPage /></RouteGate>} />
              <Route path="/settings" element={<RouteGate path="/settings" title="Settings" roles={ROLE.sales}><SettingsPage /></RouteGate>} />
              <Route path="/signs" element={<RouteGate path="/signs" title="Signs" roles={ROLE.cclms}><SignsPage /></RouteGate>} />
              <Route path="/pipeline" element={<RouteGate path="/pipeline" title="Pipeline" roles={ROLE.cclms}><PipelinePage /></RouteGate>} />
              <Route path="/agents" element={<RouteGate path="/agents" title="Agents" roles={ROLE.sales}><AgentsPage /></RouteGate>} />
              <Route path="/employees" element={<RouteGate path="/employees" title="Employees" roles={ROLE.hr}><EmployeesPage /></RouteGate>} />
              <Route path="/activity" element={<RouteGate path="/activity" title="Activity" roles={ROLE.hr}><ActivityPage /></RouteGate>} />
              <Route path="/attendance" element={<RouteGate path="/attendance" title="Attendance" roles={ROLE.hr}><AttendancePage /></RouteGate>} />
              <Route path="/direction" element={<RouteGate path="/direction" title="Direction" roles={ROLE.sales}><DirectionPage /></RouteGate>} />
              <Route path="/projects" element={<RouteGate path="/projects" title="Projects" roles={ROLE.projects}><ProjectsPage /></RouteGate>} />
              <Route path="/financials" element={<RouteGate path="/financials" title="Financials" roles={ROLE.accounts}><FinancialsPage /></RouteGate>} />
              <Route path="/payroll" element={<RouteGate path="/payroll" title="Payroll" roles={ROLE.hr}><PayrollPage /></RouteGate>} />
              <Route path="*" element={<Navigate to={visibleNav[0]?.path ?? "/"} replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-session"],
    queryFn: fetchDashboardSession,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const refetchSession = async () => {
    await refetch();
  };

  if (isLoading) return <LoadingScreen />;
  if (error) {
    return (
      <AppShellMessage
        kind="Connection error"
        title="Could not verify the Frappe session"
        copy="Confirm the site is reachable and this app is served from the Frappe domain or has a valid API token configured for development."
        action={null}
      />
    );
  }
  if (isGuestSession(session)) return <LoginScreen onLoggedIn={refetchSession} />;

  return (
    <DashboardSessionProvider session={session}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardShell />
      </BrowserRouter>
    </DashboardSessionProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
