import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";
import { useDashboardSession } from "../lib/session";
import { getCachedLeads, getCachedFollowUps } from "../lib/leadCache";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function fmt(d?: string): string | null {
  if (!d) return null;
  const s = String(d).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

interface EventItem { id: string; title: string; time: string; type: "lead" | "followup"; detail?: string; }

export default function CalendarPage() {
  const session = useDashboardSession();
  const [now, setNow] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const userKey = session?.user || "guest";

  const leads = useMemo(() => getCachedLeads<any>(userKey), [userKey]);
  const followUps = useMemo(() => getCachedFollowUps<any>(userKey), [userKey]);

  const events = useMemo<EventItem[]>(() => {
    const out: EventItem[] = [];
    for (const l of leads) {
      const t = fmt(l.follow_up_time) || fmt(l.post_date) || fmt(l.creation);
      if (t) out.push({ id: `lead-${l.name}`, title: l.business_name || l.name, time: t, type: "lead", detail: l.business_phone_number });
    }
    for (const f of followUps) {
      const t = fmt(f.follow_up_time);
      if (t) out.push({ id: `fu-${f.name || f.lead}`, title: f.business_name || f.lead || "", time: t, type: "followup", detail: f.business_phone });
    }
    return out;
  }, [leads, followUps]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    for (const ev of events) { (map[ev.time] = map[ev.time] || []).push(ev); }
    return map;
  }, [events]);

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const selectedEvents = eventsByDate[dateKey(selected)] || [];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-500" /> Calendar</h1>
        <p className="text-sm text-muted">Track your leads and follow-ups on the go</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <button className="gc-btn gc-btn-ghost" onClick={() => setNow(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold">{MONTH_NAMES[month]} {year}</span>
              <button className="gc-btn gc-btn-ghost text-xs" onClick={() => { const t = new Date(); setNow(t); setSelected(t); }}>Today</button>
            </div>
            <button className="gc-btn gc-btn-ghost" onClick={() => setNow(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {WEEKDAYS.map((w) => <div key={w} className="py-1 font-semibold">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={`e${i}`} />;
              const key = dateKey(c);
              const evts = eventsByDate[key] || [];
              const isSel = dateKey(selected) === key;
              const isToday = dateKey(new Date()) === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(c)}
                  className={`min-h-20 rounded-md border p-1 text-left align-top transition-colors ${
                    isSel ? "border-indigo-500 bg-indigo-50" : isToday ? "border-primary" : "border-border"
                  }`}
                >
                  <div className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted"}`}>{c.getDate()}</div>
                  <div className="mt-1 space-y-1">
                    {evts.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="truncate rounded px-1 text-[10px]" style={{ background: ev.type === "lead" ? "#eef2ff" : "#fef3c7", color: ev.type === "lead" ? "#4f46e5" : "#92400e" }}>
                        {ev.title}
                      </div>
                    ))}
                    {evts.length > 3 && <div className="text-[9px] text-muted">+{evts.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day details */}
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
          <h3 className="mb-3 text-sm font-semibold">{MONTH_NAMES[selected.getMonth()]} {selected.getDate()}, {selected.getFullYear()}</h3>
          {selectedEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No follow-ups or leads scheduled for this date.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 truncate text-sm font-medium">
                      {ev.type === "lead" ? <MapPin className="h-3.5 w-3.5 text-indigo-500" /> : <Phone className="h-3.5 w-3.5 text-amber-600" />}
                      {ev.title || ev.id}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: ev.type === "lead" ? "#eef2ff" : "#fef3c7", color: ev.type === "lead" ? "#4f46e5" : "#92400e" }}>
                      {ev.type === "lead" ? "Lead" : "Follow-up"}
                    </span>
                  </div>
                  {ev.detail && <p className="mt-1 text-xs text-muted">{ev.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
