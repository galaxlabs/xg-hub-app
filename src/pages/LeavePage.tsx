import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchMyLeaves, fetchAllLeaves, fetchLeaveTypes, fetchLeaveBalance, createLeave, approveLeave,
  type LeaveRow, type LeaveTypeOption, type LeaveBalanceRow,
} from "../lib/api";
import {
  Card, CardHeader, StatCard, DataTable, LoadingBlock, EmptyBlock, FilterRow, DateInput, Modal, FormField,
} from "../components/ui/index";

const STATUS_COLORS: Record<string, string> = {
  Open: "gc-badge-yellow", "Draft": "gc-badge-gray", "Approved": "gc-badge-green",
  Rejected: "gc-badge-red", "Cancelled": "gc-badge-gray", "On Hold": "gc-badge-sky",
};

function statusBadge(s?: string) {
  const c = STATUS_COLORS[s || ""] || "gc-badge-gray";
  return <span className={c}>{s || "—"}</span>;
}

export default function LeavePage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFrom] = useState(today.slice(0, 8) + "01");
  const [toDate, setTo] = useState(today);
  const [statusFilter, setStatus] = useState("");
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ leave_type: "", from_date: today, to_date: today, description: "" });
  const [formError, setFormError] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my_leaves"] });
    qc.invalidateQueries({ queryKey: ["all_leaves"] });
    qc.invalidateQueries({ queryKey: ["leave_balance"] });
  };

  const mine = useQuery({ queryKey: ["my_leaves", statusFilter, fromDate, toDate], queryFn: () => fetchMyLeaves({ status: statusFilter || undefined, from_date: fromDate, to_date: toDate }) });
  const all = useQuery({ queryKey: ["all_leaves", statusFilter, fromDate, toDate], queryFn: () => fetchAllLeaves({ status: statusFilter || undefined, from_date: fromDate, to_date: toDate }) });
  const types = useQuery({ queryKey: ["leave_types"], queryFn: () => fetchLeaveTypes() });
  const balance = useQuery({ queryKey: ["leave_balance"], queryFn: () => fetchLeaveBalance() });

  const createMut = useMutation({
    mutationFn: () => createLeave(form),
    onSuccess: () => { setOpenModal(false); setForm({ leave_type: "", from_date: today, to_date: today, description: "" }); invalidate(); },
    onError: (e: any) => setFormError(e.message || "Create failed"),
  });

  const approveMut = useMutation({
    mutationFn: (p: { name: string; status: string }) => approveLeave(p.name, p.status),
    onSuccess: () => invalidate(),
  });

  const rows = tab === "mine" ? (mine.data || []) : (all.data || []);
  const loading = tab === "mine" ? mine.isLoading : all.isLoading;

  const cols = [
    { key: "employee_name", label: "Employee", render: (r: LeaveRow) => <span className="font-medium">{r.employee_name || r.employee}</span> },
    { key: "leave_type", label: "Type", width: "140px" },
    { key: "from_date", label: "From", width: "100px" },
    { key: "to_date", label: "To", width: "100px" },
    { key: "total_leave_days", label: "Days", align: "right" as const, width: "60px" },
    { key: "status", label: "Status", render: (r: LeaveRow) => statusBadge(r.status), width: "110px" },
    { key: "description", label: "Description", render: (r: LeaveRow) => <span className="text-muted">{r.description || "—"}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <FilterRow onRefresh={() => invalidate()}>
        <DateInput label="From" value={fromDate} onChange={setFrom} />
        <DateInput label="To" value={toDate} onChange={setTo} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Status</span>
          <select className="gc-select" value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button className="gc-btn gc-btn-primary" onClick={() => setOpenModal(true)}>+ New Leave</button>
      </FilterRow>

      {/* Leave balances */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {balance.isLoading ? <div className="col-span-2 xl:col-span-6"><LoadingBlock /></div> :
          (balance.data || []).map((b: LeaveBalanceRow) => (
            <StatCard key={b.leave_type} label={b.leave_type} value={b.balance} color={b.balance <= 0 ? "#ef4444" : "#16a34a"} sub="balance days" />
          ))}
        {(balance.data || []).length === 0 && !balance.isLoading && <div className="col-span-2 xl:col-span-6 text-sm text-muted py-4">No leave balance ledger entries found.</div>}
      </div>

      <Card>
        <CardHeader
          title={tab === "mine" ? "My Leave Applications" : "All Leave Applications"}
          subtitle={`${fromDate} → ${toDate}`}
          action={
            <div className="flex gap-1 rounded-lg border border-border bg-[var(--gc-surface)] p-1">
              <button onClick={() => setTab("mine")} className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "mine" ? "bg-[var(--gc-card)] text-primary shadow-sm" : "text-muted"}`}>My Leaves</button>
              <button onClick={() => setTab("all")} className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "all" ? "bg-[var(--gc-card)] text-primary shadow-sm" : "text-muted"}`}>All Leaves</button>
            </div>
          }
        />
        <div className="px-4 pb-4">
          {loading ? <LoadingBlock /> : rows.length === 0 ? <EmptyBlock /> : (
            <DataTable<LeaveRow>
              cols={[
                ...cols,
                {
                  key: "actions", label: "", width: "150px",
                  render: (r: LeaveRow) => (
                    <div className="flex gap-1">
                      {(r.status === "Open" || r.status === "Draft") && (
                        <>
                          <button className="gc-btn gc-btn-sm" style={{ color: "#16a34a" }} onClick={() => approveMut.mutate({ name: r.name, status: "Approved" })}>Approve</button>
                          <button className="gc-btn gc-btn-sm" style={{ color: "#ef4444" }} onClick={() => approveMut.mutate({ name: r.name, status: "Rejected" })}>Reject</button>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={rows}
              keyField="name"
            />
          )}
        </div>
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="New Leave Application" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <button className="gc-btn gc-btn-ghost" onClick={() => setOpenModal(false)}>Cancel</button>
            <button className="gc-btn gc-btn-primary" onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.leave_type || !form.from_date || !form.to_date}>
              {createMut.isPending ? "Submitting…" : "Submit"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 p-1">
          {formError && <div className="gc-badge-red text-xs px-2 py-1">{formError}</div>}
          <FormField label="Leave Type" required>
            <select className="gc-input" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              <option value="">Select type</option>
              {(types.data || []).map((t: LeaveTypeOption) => <option key={t.name} value={t.name}>{t.name}{t.is_lwp ? " (LWP)" : ""}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From" required><input type="date" className="gc-input" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} /></FormField>
            <FormField label="To" required><input type="date" className="gc-input" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} /></FormField>
          </div>
          <FormField label="Description"><textarea rows={2} className="gc-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
