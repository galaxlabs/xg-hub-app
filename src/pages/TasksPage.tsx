import { useEffect, useState } from "react";
import { CheckSquare, Plus, X, Clock, User } from "lucide-react";
import { callFrappe } from "../lib/frappe";

const STATUS_OPTIONS = ["Open", "Working", "Pending Review", "Overdue", "Completed", "Cancelled"];

function statusColor(s: string) {
  switch (s) {
    case "Completed": return "#16a34a";
    case "Working": return "#f59e0b";
    case "Overdue": return "#dc2626";
    case "Cancelled": return "#9ca3af";
    default: return "#6b7280";
  }
}

interface TaskRow {
  name: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  project?: string;
  owner?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<{ name: string; employee_name?: string; user_id?: string }[]>([]);
  const [form, setForm] = useState({ subject: "", description: "", exp_end_date: "", assigned_to: "" });

  async function load() {
    setLoading(true);
    try {
      const rows = await callFrappe<TaskRow[]>("frappe.client.get_list", {
        doctype: "Task",
        fields: ["name", "subject", "description", "status", "priority", "exp_start_date", "exp_end_date", "project", "owner"],
        order_by: "creation desc",
        limit_page_length: 200,
      });
      setTasks(rows || []);
    } catch (e: any) { setError(e.message || "Failed to load tasks"); }
    finally { setLoading(false); }
  }

  async function loadEmployees() {
    try {
      const rows = await callFrappe<any[]>("frappe.client.get_list", {
        doctype: "Employee",
        fields: ["name", "employee_name", "user_id"],
        filters: [["status", "=", "Active"]],
        order_by: "employee_name asc",
        limit_page_length: 200,
      });
      setEmployees(rows || []);
    } catch {}
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (showModal) void loadEmployees(); }, [showModal]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await callFrappe("frappe.client.insert", {
        doc: JSON.stringify({
          doctype: "Task",
          subject: form.subject,
          description: form.description || "",
          exp_end_date: form.exp_end_date || null,
          status: "Open",
        }),
      });
      setForm({ subject: "", description: "", exp_end_date: "", assigned_to: "" });
      setShowModal(false);
      await load();
    } catch (err: any) { setError(err.message || "Create failed"); }
  }

  async function changeStatus(name: string, status: string) {
    try {
      await callFrappe("frappe.client.set_value", {
        doctype: "Task", name, fieldname: "status", value: status,
      });
      setTasks(tasks.map((t) => (t.name === name ? { ...t, status } : t)));
    } catch (e: any) { setError(e.message || "Update failed"); }
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><CheckSquare className="h-5 w-5 text-indigo-500" /> Tasks and Projects</h1>
          <p className="text-sm text-muted">Assign tasks to the team and track progress</p>
        </div>
        <button className="gc-btn gc-btn-primary" onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Assign Task</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">No tasks assigned.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="gc-table">
            <thead>
              <tr><th>Title</th><th>Description</th><th>Deadline</th><th>Status</th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.name}>
                  <td className="font-medium">{t.subject || t.name}</td>
                  <td className="text-muted max-w-[260px]">{t.description || "—"}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {t.exp_end_date ? String(t.exp_end_date).slice(0, 10) : "—"}</span>
                  </td>
                  <td>
                    <select className="gc-input h-8 w-32 text-xs" value={t.status || "Open"} onChange={(e) => changeStatus(t.name, e.target.value)}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <form onSubmit={create} className="w-full max-w-md rounded-lg border border-border bg-[var(--gc-card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-indigo-500" /> Assign Task</span>
              <X className="h-4 w-4 cursor-pointer" onClick={() => setShowModal(false)} />
            </h2>
            <div className="space-y-3">
              <div><label className="text-xs text-muted">Task Title *</label>
                <input className="gc-input mt-1 w-full" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Description</label>
                <textarea rows={3} className="gc-input mt-1 w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="text-xs text-muted">Assign To</label>
                <select className="gc-input mt-1 w-full" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">Select Employee</option>
                  {employees.map((emp) => <option key={emp.name} value={emp.user_id || emp.name}>{emp.employee_name || emp.name}</option>)}
                </select></div>
              <div><label className="text-xs text-muted">Deadline</label>
                <input type="date" className="gc-input mt-1 w-full" value={form.exp_end_date} onChange={(e) => setForm({ ...form, exp_end_date: e.target.value })} /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="gc-btn gc-btn-primary">Assign Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
