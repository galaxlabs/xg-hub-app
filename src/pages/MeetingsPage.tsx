import { useEffect, useState } from "react";
import { Video, Plus, ExternalLink, Clock, X, CalendarClock } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";

interface MeetingRow {
  name: string;
  subject?: string;
  description?: string;
  meet_link?: string;
  starts_on?: string;
  owner?: string;
}

export default function MeetingsPage() {
  const session = useDashboardSession();
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", meet_link: "", starts_on: "" });

  async function load() {
    setLoading(true);
    try {
      const rows = await callFrappe<MeetingRow[]>("frappe.client.get_list", {
        doctype: "Event",
        fields: ["name", "subject", "description", "meet_link", "starts_on", "owner"],
        filters: [["event_category", "=", "Meeting"]],
        order_by: "starts_on asc",
        limit_page_length: 200,
      });
      setMeetings(rows || []);
    } catch (e: any) { setError(e.message || "Failed to load meetings"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) return;
    setSending(true);
    setError("");
    try {
      await callFrappe("frappe.client.insert", {
        doc: JSON.stringify({
          doctype: "Event",
          subject: form.subject.trim(),
          description: form.description || "",
          meet_link: form.meet_link || "",
          starts_on: form.starts_on || null,
          event_category: "Meeting",
          event_type: "Private",
          status: "Open",
        }),
      });
      setForm({ subject: "", description: "", meet_link: "", starts_on: "" });
      setShowModal(false);
      await load();
    } catch (err: any) { setError(err.message || "Could not create meeting."); }
    finally { setSending(false); }
  }

  const fmtDateTime = (s?: string) => {
    if (!s) return "—";
    const d = new Date(s);
    return `${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };
  const isPast = (m: MeetingRow) => m.starts_on && new Date(m.starts_on) < new Date();
  const upcoming = meetings.filter((m) => !isPast(m));
  const past = meetings.filter((m) => isPast(m));

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Video className="h-5 w-5 text-indigo-500" /> Meetings</h1>
          <p className="text-sm text-muted">Meetings will be conducted on Google Meet</p>
        </div>
        <button className="gc-btn gc-btn-primary" onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Schedule Meeting</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading…</div>
      ) : (
        <>
          <div>
            <h3 className="mb-3 text-xs font-semibold text-muted">UPCOMING</h3>
            {upcoming.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">No upcoming meetings.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcoming.map((m) => (
                  <div key={m.name} className="rounded-lg border border-border bg-[var(--gc-card)] p-4">
                    <div className="mb-1.5 text-[15px] font-semibold">{m.subject || m.name}</div>
                    {m.description && <p className="mb-2.5 text-[13px] text-muted">{m.description}</p>}
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted"><Clock className="h-3 w-3" /> {fmtDateTime(m.starts_on)}</div>
                    <a href={m.meet_link || "#"} target="_blank" rel="noopener noreferrer"
                      className="gc-btn gc-btn-primary w-full justify-center" onClick={(e) => !m.meet_link && e.preventDefault()}>
                      <ExternalLink className="h-4 w-4" /> Join Meet
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold text-muted">PAST</h3>
              <div className="space-y-2">
                {past.map((m) => (
                  <div key={m.name} className="flex items-center justify-between rounded-lg border border-border bg-[var(--gc-card)] px-4 py-3 opacity-60">
                    <div>
                      <div className="text-[13px] font-semibold">{m.subject || m.name}</div>
                      <div className="text-[11px] text-muted">{fmtDateTime(m.starts_on)}</div>
                    </div>
                    <CalendarClock className="h-4 w-4 text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <form onSubmit={create} className="w-full max-w-md rounded-lg border border-border bg-[var(--gc-card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 flex items-center justify-between text-base font-semibold">
              <span className="flex items-center gap-2"><Video className="h-4 w-4 text-indigo-500" /> Schedule Meeting</span>
              <X className="h-4 w-4 cursor-pointer" onClick={() => setShowModal(false)} />
            </h2>
            <div className="space-y-3">
              <div><label className="text-xs text-muted">Meeting Title *</label>
                <input className="gc-input mt-1 w-full" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Google Meet Link</label>
                <input type="url" className="gc-input mt-1 w-full" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={form.meet_link} onChange={(e) => setForm({ ...form, meet_link: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Date & Time</label>
                <input type="datetime-local" className="gc-input mt-1 w-full" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Description (optional)</label>
                <textarea rows={3} className="gc-input mt-1 w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="gc-btn gc-btn-primary" disabled={sending}>{sending ? "Creating..." : "Schedule Meeting"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
