import { callFrappe } from "./frappe";
import type {
  OverviewResponse,
  CompanyRow,
  AgentRow,
  TrendResponse,
  RecentSignedRow,
  SignsSummary,
  VelocityRow,
  PipelineSnapshot,
  LedgerTrend,
  AttributionRow,
  ActivityLogRow,
  StateByExecRow,
  AgentPerfRow,
  ATMLeadRow,
  ProjectRow,
  TaskRow,
  GLEntryRow,
  AccountRow,
  SalarySlipRow,
  PayrollEntryRow,
  EmployeeRow,
} from "./types";

// ── Base paths ────────────────────────────────────────────────────────────
const PR  = "cclms.api.page_reporting";
const SD  = "cclms.call_centre_lead_management_system.page.signs_dashboard.signs_dashboard";
const RPT = "cclms.api.reports";

// ── Overview / Pipeline ───────────────────────────────────────────────────
export const fetchOverview = (p: Record<string, unknown> = {}) =>
  callFrappe<OverviewResponse>(`${PR}.overview`, p);

export const fetchCompanyBreakdown = (p: Record<string, unknown> = {}) =>
  callFrappe<CompanyRow[]>(`${PR}.company_breakdown`, p);

export const fetchAgentBreakdown = async (p: Record<string, unknown> = {}) => {
  const rows = await callFrappe<Record<string, any>[]>(`${PR}.agent_breakdown`, p);
  // Backend returns { agent, approved, agreement_sent, signed, converted, installed,
  // rejected, cancelled, submitted, total_deals, net_signed }. Map to the frontend's
  // AgentRow shape ({ display_name, total_* }) and drop rows with no activity.
  const out: AgentRow[] = [];
  for (const r of rows || []) {
    const total = (r.total_deals ?? r.total ?? 0) as number;
    const approved = r.approved ?? r.total_approved ?? 0;
    const signed = r.signed ?? r.total_signs ?? 0;
    const rejected = r.rejected ?? r.total_rejected ?? 0;
    const submitted = r.submitted ?? r.total_submitted ?? total;
    const converted = r.converted ?? r.total_converted ?? 0;
    const installed = r.installed ?? r.total_installed ?? 0;
    if ((total || approved || signed || rejected || submitted || converted || installed) === 0) {
      continue; // only show agents that have records/data
    }
    const agent = r.agent ?? r.display_name ?? r.agent_name ?? "Unassigned";
    const row: AgentRow = {
      agent,
      display_name: r.display_name ?? r.agent_name ?? agent,
      company: r.company ?? "",
      total_submitted: Number(submitted) || 0,
      total_approved: Number(approved) || 0,
      total_agreement_sent: Number(r.agreement_sent ?? r.total_agreement_sent ?? 0) || 0,
      total_signs: Number(signed) || 0,
      total_converted: Number(converted) || 0,
      total_installed: Number(installed) || 0,
      total_rejected: Number(rejected) || 0,
      total_cancelled: Number(r.cancelled ?? r.total_cancelled ?? 0) || 0,
      net_signed: Number(r.net_signed ?? signed ?? 0) || 0,
      sign_rate: total ? Math.round((signed / total) * 1000) / 10 : 0,
      approval_rate: total ? Math.round((approved / total) * 1000) / 10 : 0,
    };
    out.push(row);
  }
  return out;
};

export const fetchMultiTrend = (p: Record<string, unknown> = {}) =>
  callFrappe<TrendResponse>(`${PR}.multi_trend`, p);

export const fetchRecentSigned = (p: Record<string, unknown> = {}) =>
  callFrappe<RecentSignedRow[]>(`${PR}.recent_signed`, p);

// ── Signs dashboard ───────────────────────────────────────────────────────
export const fetchSignsSummary = (p: Record<string, unknown> = {}) =>
  callFrappe<SignsSummary>(`${SD}.get_signs_summary`, p);

export const fetchStageVelocity = (p: Record<string, unknown> = {}) =>
  callFrappe<VelocityRow[]>(`${SD}.get_stage_velocity`, p);

export const fetchPipelineSnapshot = (p: Record<string, unknown> = {}) =>
  callFrappe<PipelineSnapshot>(`${SD}.get_pipeline_snapshot`, p);

export const fetchLedgerTrend = (p: Record<string, unknown> = {}) =>
  callFrappe<LedgerTrend>(`${SD}.get_approval_rejection_trend`, p);

export const fetchAgentAttribution = (p: Record<string, unknown> = {}) =>
  callFrappe<AttributionRow[]>(`${SD}.get_agent_attribution`, p);

// ── Direction report ──────────────────────────────────────────────────────
// Backend returns a pivot: { categories: string[], series: {name,data[]}[], states: string[] }
// We normalise it to a flat StateByExecRow[] so the page can iterate safely.
export const fetchStateByExecutive = async (p: Record<string, unknown> = {}): Promise<StateByExecRow[]> => {
  // Map from_date/to_date → start_date/end_date for the backend
  const apiArgs: Record<string, unknown> = { ...p };
  if (p.from_date) { apiArgs.start_date = p.from_date; delete apiArgs.from_date; }
  if (p.to_date)   { apiArgs.end_date   = p.to_date;   delete apiArgs.to_date; }

  type PivotResp = { categories?: string[]; series?: { name: string; data: number[] }[]; states?: string[] };
  const res = await callFrappe<StateByExecRow[] | PivotResp>(
    `${RPT}.state_by_executive.get_state_counts_by_executive`, apiArgs
  );
  if (Array.isArray(res)) return res;

  // Transform pivot → flat rows (one row per executive)
  const pivot = res as PivotResp;
  const cats   = pivot.categories ?? [];
  const series = pivot.series     ?? [];
  return cats.map((exec, i) => {
    const row: StateByExecRow = { executive: exec, executive_name: exec };
    for (const s of series) {
      const key = s.name.toLowerCase().replace(/\s+/g, "_");
      (row as Record<string, unknown>)[key] = s.data[i] ?? 0;
    }
    return row;
  });
};

export const fetchAgentPerformance = (p: Record<string, unknown> = {}) =>
  callFrappe<AgentPerfRow[]>(`${RPT}.agent_performance.get_agent_performance`, p);

// ── Attendance (Employee Activity Log via frappe.client.get_list) ─────────
export const fetchActivityLogs = (p: {
  from_date: string;
  to_date: string;
  employee?: string;
}) =>
  callFrappe<ActivityLogRow[]>("frappe.client.get_list", {
    doctype: "Employee Activity Log",
    filters: JSON.stringify([
      ["date", "between", [p.from_date, p.to_date]],
      ...(p.employee ? [["employee", "=", p.employee]] : []),
    ]),
    fields: JSON.stringify([
      "name", "employee", "date",
      "total_active_minutes", "total_idle_minutes", "unauthorized_site_hits",
    ]),
    limit_page_length: 500,
    order_by: "date desc",
  });

export const fetchCallSummary = (p: {
  from_date: string;
  to_date: string;
  employee?: string;
}) =>
  callFrappe<{ employee: string; date: string; total_calls: number; total_talk_time_seconds: number }[]>(
    "frappe.client.get_list",
    {
      doctype: "Call Daily Summary",
      filters: JSON.stringify([
        ["date", "between", [p.from_date, p.to_date]],
        ...(p.employee ? [["employee", "=", p.employee]] : []),
      ]),
      fields: JSON.stringify([
        "employee", "date", "total_calls", "total_talk_time_seconds",
      ]),
      limit_page_length: 500,
      order_by: "date desc",
    }
  );

// ── Helpers ───────────────────────────────────────────────────────────────
export function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${d}` };
}

export function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtPct(n: number, d: number): string {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(1)}%`;
}

export type DoctypeAnalyticsSpec = {
  doctype: string;
  module: string;
  label?: string;
  fields?: string[];
  dateField?: string;
};

export type DoctypeAnalyticsRow = {
  name: string;
  modified?: string;
  owner?: string;
  [key: string]: unknown;
};

export type DoctypeAnalyticsResult = DoctypeAnalyticsSpec & {
  count: number | null;
  recent: DoctypeAnalyticsRow[];
  error?: string;
};

export async function fetchDoctypeAnalytics(
  specs: DoctypeAnalyticsSpec[],
  limit = 6
): Promise<DoctypeAnalyticsResult[]> {
  const results = await Promise.all(
    specs.map(async (spec) => {
      try {
        const count = await callFrappe<number>("frappe.client.get_count", {
          doctype: spec.doctype,
        });
        const fields = JSON.stringify(["name", "modified", "owner", ...(spec.fields ?? [])]);
        const recent = await callFrappe<DoctypeAnalyticsRow[]>("frappe.client.get_list", {
          doctype: spec.doctype,
          fields,
          limit_page_length: limit,
          order_by: `${spec.dateField ?? "modified"} desc`,
        });
        return { ...spec, count, recent };
      } catch (error) {
        return {
          ...spec,
          count: null,
          recent: [],
          error: String((error as Error).message ?? error),
        };
      }
    })
  );

  return results;
}

// ── ATM Leads CRUD ────────────────────────────────────────────────────────
const ATM_FIELDS = JSON.stringify([
  "name","business_name","owner_name","company","executive_name","branch",
  "state_code","state","city","address","zip_code","email",
  "business_phone_number","personal_cell_phone","business_type",
  "contract_length","base_rent","hours","percentage","post_date",
  "approve_date","agreement_sent_date","sign_date","convert_date",
  "install_date","remove_date","status","workflow_state","lead_owner",
  "is_duplicate","latitude","longitude","ai_core",
]);

export const fetchATMLeads = (p: {
  status?: string;
  company?: string;
  branch?: string;
  executive_name?: string;
  state_code?: string;
  is_duplicate?: 0 | 1;
  ai_score_min?: number;
  ai_score_max?: number;
  date_field?: "post_date" | "approve_date" | "sign_date" | "install_date";
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  const filters: unknown[][] = [];
  const df = p.date_field ?? "post_date";
  if (p.status)         filters.push(["workflow_state", "=", p.status]);
  if (p.company)        filters.push(["company", "=", p.company]);
  if (p.branch)         filters.push(["branch", "=", p.branch]);
  if (p.executive_name) filters.push(["executive_name", "like", `%${p.executive_name}%`]);
  if (p.state_code)     filters.push(["state_code", "=", p.state_code.toUpperCase()]);
  if (p.is_duplicate != null) filters.push(["is_duplicate", "=", p.is_duplicate]);
  if (p.ai_score_min != null) filters.push(["ai_core", ">=", p.ai_score_min]);
  if (p.ai_score_max != null) filters.push(["ai_core", "<=", p.ai_score_max]);
  if (p.from_date)      filters.push([df, ">=", p.from_date]);
  if (p.to_date)        filters.push([df, "<=", p.to_date]);
  if (p.search)         filters.push(["business_name", "like", `%${p.search}%`]);

  return callFrappe<ATMLeadRow[]>("frappe.client.get_list", {
    doctype: "ATM Leads",
    filters: JSON.stringify(filters),
    fields: ATM_FIELDS,
    limit_page_length: p.page_size ?? 50,
    limit_start: ((p.page ?? 1) - 1) * (p.page_size ?? 50),
    order_by: "post_date desc",
  });
};

export const fetchATMLead = (name: string) =>
  callFrappe<ATMLeadRow>("frappe.client.get", { doctype: "ATM Leads", name });

export const createATMLead = (data: Partial<ATMLeadRow>) =>
  callFrappe<{ name: string }>("cclms.api.lead.create_lead", {
    data: JSON.stringify({ ...data }),
  });

export const updateATMLead = (name: string, data: Partial<ATMLeadRow>) =>
  callFrappe("cclms.api.lead.update_lead", {
    name,
    data: JSON.stringify(data),
  });

export const deleteATMLead = (name: string) =>
  callFrappe("frappe.client.delete", { doctype: "ATM Leads", name });

export const countATMLeads = (p: { status?: string; company?: string } = {}) => {
  const filters: unknown[][] = [];
  if (p.status)  filters.push(["status", "=", p.status]);
  if (p.company) filters.push(["company", "=", p.company]);
  return callFrappe<number>("frappe.client.get_count", {
    doctype: "ATM Leads",
    filters: JSON.stringify(filters),
  });
};

export const fetchStateCounts = (p: {
  company?: string; branch?: string; state_code?: string;
  executive?: string; is_duplicate?: 0 | 1;
  ai_score_min?: number; ai_score_max?: number;
  date_field?: string; from_date?: string; to_date?: string;
  search?: string;
}) => callFrappe<Record<string, number>>("cclms.api.lead_stats.get_state_counts", p as Record<string, unknown>);

// ── Projects ──────────────────────────────────────────────────────────────
const PROJECT_FIELDS = JSON.stringify([
  "name","project_name","status","priority","percent_complete",
  "expected_start_date","expected_end_date","actual_start_date","actual_end_date",
  "company","department","customer","estimated_costing","total_costing_amount",
  "gross_margin","per_gross_margin","is_active",
]);

const TASK_FIELDS = JSON.stringify([
  "name","subject","project","status","priority","progress",
  "exp_start_date","exp_end_date","act_start_date","act_end_date",
  "is_milestone","is_group","color","expected_time","actual_time",
]);

export const fetchProjects = (p: { status?: string; company?: string; search?: string } = {}) => {
  const filters: unknown[][] = [];
  if (p.status)  filters.push(["status", "=", p.status]);
  if (p.company) filters.push(["company", "=", p.company]);
  if (p.search)  filters.push(["project_name", "like", `%${p.search}%`]);
  return callFrappe<ProjectRow[]>("frappe.client.get_list", {
    doctype: "Project",
    filters: JSON.stringify(filters),
    fields: PROJECT_FIELDS,
    limit_page_length: 100,
    order_by: "expected_start_date asc",
  });
};

export const fetchTasks = (p: { project?: string; status?: string } = {}) => {
  const filters: unknown[][] = [];
  if (p.project) filters.push(["project", "=", p.project]);
  if (p.status)  filters.push(["status", "=", p.status]);
  return callFrappe<TaskRow[]>("frappe.client.get_list", {
    doctype: "Task",
    filters: JSON.stringify(filters),
    fields: TASK_FIELDS,
    limit_page_length: 200,
    order_by: "exp_start_date asc",
  });
};

export const createProject = (data: Partial<ProjectRow>) =>
  callFrappe<{ name: string }>("frappe.client.insert", {
    doc: JSON.stringify({ doctype: "Project", ...data }),
  });

export const updateProject = (name: string, data: Partial<ProjectRow>) =>
  callFrappe("frappe.client.set_value", {
    doctype: "Project",
    name,
    fieldname: JSON.stringify(data),
  });

export const createTask = (data: Partial<TaskRow>) =>
  callFrappe<{ name: string }>("frappe.client.insert", {
    doc: JSON.stringify({ doctype: "Task", ...data }),
  });

export const updateTask = (name: string, data: Partial<TaskRow>) =>
  callFrappe("frappe.client.set_value", {
    doctype: "Task",
    name,
    fieldname: JSON.stringify(data),
  });

export const deleteTask = (name: string) =>
  callFrappe("frappe.client.delete", { doctype: "Task", name });

// ── GL / Financials ───────────────────────────────────────────────────────
export const fetchGLEntries = (p: {
  from_date: string;
  to_date: string;
  account?: string;
  company?: string;
  voucher_type?: string;
}) => {
  const filters: unknown[][] = [
    ["posting_date", "between", [p.from_date, p.to_date]],
    ["is_cancelled", "=", 0],
  ];
  if (p.account)      filters.push(["account", "=", p.account]);
  if (p.company)      filters.push(["company", "=", p.company]);
  if (p.voucher_type) filters.push(["voucher_type", "=", p.voucher_type]);
  return callFrappe<GLEntryRow[]>("frappe.client.get_list", {
    doctype: "GL Entry",
    filters: JSON.stringify(filters),
    fields: JSON.stringify([
      "name","account","account_type","posting_date","debit","credit",
      "voucher_type","voucher_no","party_type","party","remarks","company",
    ]),
    limit_page_length: 500,
    order_by: "posting_date desc",
  });
};

export const fetchAccounts = (p: { root_type?: string; company?: string; account_type?: string } = {}) => {
  const filters: unknown[][] = [["is_group", "=", 0]];
  if (p.root_type)    filters.push(["root_type", "=", p.root_type]);
  if (p.company)      filters.push(["company", "=", p.company]);
  if (p.account_type) filters.push(["account_type", "=", p.account_type]);
  return callFrappe<AccountRow[]>("frappe.client.get_list", {
    doctype: "Account",
    filters: JSON.stringify(filters),
    fields: JSON.stringify(["name","account_name","account_type","root_type","parent_account","company"]),
    limit_page_length: 200,
    order_by: "name asc",
  });
};

export const fetchTrialBalance = (p: { company: string; from_date: string; to_date: string }) =>
  callFrappe<{ message: unknown[] }>("erpnext.accounts.report.trial_balance.trial_balance.execute", {
    filters: JSON.stringify({
      company: p.company,
      from_date: p.from_date,
      to_date: p.to_date,
      show_zero_values: 0,
    }),
  });

// ── Payroll ───────────────────────────────────────────────────────────────
export const fetchSalarySlips = (p: {
  start_date?: string;
  end_date?: string;
  employee?: string;
  department?: string;
  company?: string;
  status?: string;
  branch?: string;
}) => {
  const filters: unknown[][] = [];
  if (p.start_date)  filters.push(["start_date", ">=", p.start_date]);
  if (p.end_date)    filters.push(["end_date", "<=", p.end_date]);
  if (p.employee)    filters.push(["employee", "=", p.employee]);
  if (p.department)  filters.push(["department", "=", p.department]);
  if (p.company)     filters.push(["company", "=", p.company]);
  if (p.status)      filters.push(["status", "=", p.status]);
  if (p.branch)      filters.push(["branch", "=", p.branch]);
  return callFrappe<SalarySlipRow[]>("frappe.client.get_list", {
    doctype: "Salary Slip",
    filters: JSON.stringify(filters),
    fields: JSON.stringify([
      "name","employee","employee_name","department","designation","branch",
      "start_date","end_date","posting_date","status","salary_structure",
      "payroll_entry","gross_pay","total_deduction","net_pay",
      "payment_days","total_working_days","company",
    ]),
    limit_page_length: 200,
    order_by: "posting_date desc",
  });
};

export const fetchPayrollEntries = (p: {
  company?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
} = {}) => {
  const filters: unknown[][] = [];
  if (p.company)    filters.push(["company", "=", p.company]);
  if (p.from_date)  filters.push(["start_date", ">=", p.from_date]);
  if (p.to_date)    filters.push(["end_date",   "<=", p.to_date]);
  if (p.status)     filters.push(["docstatus", "=", p.status === "Submitted" ? 1 : 0]);
  return callFrappe<PayrollEntryRow[]>("frappe.client.get_list", {
    doctype: "Payroll Entry",
    filters: JSON.stringify(filters),
    fields: JSON.stringify([
      "name","company","branch","department","payroll_frequency",
      "start_date","end_date","posting_date","payment_date",
      "total_salary_amount","docstatus",
    ]),
    limit_page_length: 50,
    order_by: "posting_date desc",
  });
};

export const fetchEmployees = (p: { company?: string; department?: string; branch?: string; status?: string } = {}) => {
  const filters: unknown[][] = [];
  if (p.company)    filters.push(["company", "=", p.company]);
  if (p.department) filters.push(["department", "=", p.department]);
  if (p.branch)     filters.push(["branch", "=", p.branch]);
  if (p.status)     filters.push(["status", "=", p.status]);
  else              filters.push(["status", "=", "Active"]);
  return callFrappe<EmployeeRow[]>("frappe.client.get_list", {
    doctype: "Employee",
    filters: JSON.stringify(filters),
    fields: JSON.stringify([
      "name","employee_name","department","designation","branch","company","status",
      "cell_number","user_id",
    ]),
    limit_page_length: 500,
    order_by: "employee_name asc",
  });
};

export const createPayrollEntry = (data: Partial<PayrollEntryRow>) =>
  callFrappe<{ name: string }>("frappe.client.insert", {
    doc: JSON.stringify({ doctype: "Payroll Entry", ...data }),
  });

// ── Attendance CRUD ───────────────────────────────────────────────────────
export interface AttendanceRow {
  name?: string;
  employee: string;
  employee_name?: string;
  attendance_date: string;
  status: "Present" | "Absent" | "Half Day" | "Work From Home" | "On Leave";
  company?: string;
  department?: string;
  docstatus?: number;
}

export const fetchAttendance = (p: {
  from_date: string;
  to_date: string;
  employee?: string;
  company?: string;
  department?: string;
}) => {
  const filters: unknown[][] = [
    ["attendance_date", "between", [p.from_date, p.to_date]],
  ];
  if (p.employee)   filters.push(["employee", "=", p.employee]);
  if (p.company)    filters.push(["company", "=", p.company]);
  if (p.department) filters.push(["department", "=", p.department]);
  return callFrappe<AttendanceRow[]>("frappe.client.get_list", {
    doctype: "Attendance",
    filters: JSON.stringify(filters),
    fields: JSON.stringify([
      "name","employee","employee_name","attendance_date","status","company","department","docstatus",
    ]),
    limit_page_length: 1000,
    order_by: "attendance_date desc",
  });
};

export const createAttendance = (data: Partial<AttendanceRow>) =>
  callFrappe<{ name: string }>("frappe.client.insert", {
    doc: JSON.stringify({ doctype: "Attendance", ...data }),
  });

export const updateAttendance = (name: string, data: Partial<AttendanceRow>) =>
  callFrappe<{ name: string }>("frappe.client.set_value", {
    doctype: "Attendance",
    name,
    fieldname: JSON.stringify(data),
  });

// ── ATM Leads business logic helpers ─────────────────────────────────────

export interface DedupConflict {
  type: "permanent" | "windowed";
  lead: string;
  state: string;
  company: string;
  age_days: number | null;
  remaining_days: number | null;
  window: number;
}

/** Pre-save location dedup check — mirrors atm_leads.py check_location_conflict */
export const checkLocationConflict = (p: {
  full_address?: string;
  address?: string;
  zip_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  company?: string;
  lead_name?: string;
}) =>
  callFrappe<DedupConflict | null>(
    "cclms.call_centre_lead_management_system.doctype.atm_leads.atm_leads.check_location_conflict",
    p as Record<string, unknown>
  );

export interface CompanyAvailability {
  name: string;
  operator_name: string;
  status: "source" | "committed" | "locked" | "available";
  lead: string | null;
  lead_state: string | null;
  age_days: number | null;
  remaining_days: number | null;
}

/** Load per-company availability for "Duplicate for Companies" */
export const getCompanyAvailability = (p: {
  lead_name: string;
  full_address?: string;
  address?: string;
  zip_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  source_company?: string;
}) =>
  callFrappe<CompanyAvailability[]>(
    "cclms.call_centre_lead_management_system.doctype.atm_leads.atm_leads.get_company_availability_for_location",
    p as Record<string, unknown>
  );

/** Fetch all Operator Companies for dropdowns */
export const fetchOperatorCompanies = () =>
  callFrappe<{ name: string; operator_name: string }[]>("frappe.client.get_list", {
    doctype: "Operator Companies",
    fields: JSON.stringify(["name", "operator_name"]),
    limit_page_length: 200,
    order_by: "operator_name asc",
  });

// Local-first wrapper: read from localStorage cache, then delta-refresh.
export async function fetchOperatorCompaniesCached(): Promise<{ name: string; operator_name: string }[]> {
  const { getCachedCompanies, syncCompanies } = await import("./leadCache");
  const cached: { name: string; operator_name: string }[] = getCachedCompanies<{ name: string; operator_name: string }>();
  if (cached.length) {
    // Fire-and-forget background refresh
    syncCompanies().catch(() => {});
    return cached;
  }
  const fresh = (await syncCompanies()) as { name: string; operator_name: string }[];
  return fresh.length ? fresh : cached;
}

/** Fetch ATM Lead with state_history child table */
export const fetchATMLeadFull = (name: string) =>
  callFrappe<ATMLeadRow & { state_history?: StateHistoryRow[] }>("frappe.client.get", {
    doctype: "ATM Leads",
    name,
  });

export interface StateHistoryRow {
  from_state: string;
  to_state: string;
  change_date: string;
  change_datetime?: string;
  changed_by?: string;
  agent_name?: string;
  days_in_state?: number;
}

/**
 * Apply a Frappe workflow action to an ATM Lead.
 * Calls frappe.model.workflow.apply_workflow with the full doc loaded from DB.
 */
export const applyWorkflowAction = (name: string, action: string) =>
  callFrappe<ATMLeadRow>("frappe.model.workflow.apply_workflow", {
    doc: JSON.stringify({ doctype: "ATM Leads", name }),
    action,
  });

// ── Activity Analysis ──────────────────────────────────────────────────────
const AR = "cclms.api.activity_report";

export interface ActivityLog {
  name: string;
  employee: string;
  employee_name: string;
  date: string;
  total_active_minutes: number;
  total_idle_minutes: number;
  unauthorized_site_hits: number;
  total_calls_today: number;
  total_talk_time: number;
  productivity_score: number;
  status: string;
  department?: string;
  designation?: string;
  branch?: string;
}

export interface ActivityBreakdown {
  by_event_type: { event_type: string; count: number; total_minutes: number; avg_productivity: number }[];
  by_app: { active_app: string; count: number; total_minutes: number; avg_productivity: number }[];
  by_domain: { domain: string; count: number; total_minutes: number; avg_productivity: number; unauthorized_pct: number }[];
  productivity_summary: { employee: string; days_tracked: number; total_active_minutes: number; total_idle_minutes: number; avg_productivity: number; total_unauthorized: number }[];
  total_rows: number;
}

export interface CallAnalysis {
  calls: {
    name: string; employee: string; employee_name?: string;
    call_date: string; start_time: string; end_time: string;
    status: string; direction: string; duration: number;
    customer_number: string; sentiment: string;
  }[];
  daily_summary: {
    employee: string; date: string;
    total_calls: number; answered_calls: number;
    missed_calls: number; rejected_calls: number;
    total_talk_time_seconds: number;
    average_call_seconds: number; longest_call_seconds: number;
  }[];
  direction_breakdown: { direction: string; count: number; avg_duration_seconds: number }[];
}

export const fetchActivityLogsExtended = (p: { start_date: string; end_date: string; employee?: string }) =>
  callFrappe<ActivityLog[]>(`${AR}.employee_time_breakdown`, p as Record<string, unknown>);

export const fetchActivityEntryBreakdown = (p: { start_date: string; end_date: string; employee?: string }) =>
  callFrappe<ActivityBreakdown>(`${AR}.activity_entry_breakdown`, p as Record<string, unknown>);

export const fetchCallAnalysis = (p: { start_date: string; end_date: string; employee?: string }) =>
  callFrappe<CallAnalysis>(`${AR}.call_analysis`, p as Record<string, unknown>);

// ── Theme config (backend-driven) ─────────────────────────────────────────
export interface PortalTheme {
  id: string;
  label: string;
  mode: "light" | "dark";
  primary: string;
  secondary: string;
  sidebar: string;
  sidebar_border: string;
  sidebar_primary: string;
  sidebar_text: string;
  workspace: string;
  card: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
}

export const fetchThemeConfig = () =>
  callFrappe<{ themes: PortalTheme[]; timezones: TimezoneOption[] }>(
    "cclms.api.crm_portal.get_theme_config"
  );

export const setMyTimezone = (timezone: string) =>
  callFrappe<{ timezone: string }>("cclms.api.crm_portal.set_my_timezone", { timezone });

// ── Unified dashboard stats ──────────────────────────────────────────────
export interface DashboardStats {
  followups: {
    total: number; scheduled: number; due: number; completed: number;
    missed: number; today_due: number; completion_rate: number;
  };
  hrms: { present: number; absent: number; on_leave: number; active_employees: number };
  activity: {
    active_minutes: number; idle_minutes: number; unauthorized_hits: number;
    avg_productivity: number; tracked_calls: number; active_hours: number; log_days: number;
  };
  calls: {
    total_calls: number; answered: number; missed: number;
    talk_seconds: number; talk_minutes: number; daily_target: number; met_days: number;
    days: { date: string; total_calls: number; answered: number; target: number; met: boolean }[];
  };
  sales_agent: string | null;
}

export const fetchDashboardStats = (p: { from_date: string; to_date: string }) =>
  callFrappe<DashboardStats>("cclms.api.dashboard_stats.dashboard_stats", p);

// ── Follow-up time slots ────────────────────────────────────────────────
export interface FollowUpSlot {
  label: string;
  value: string;
  booked: boolean;
  booked_by: string;
}

export interface FollowUpSlotsResponse {
  date: string;
  timezone: string;
  slot_minutes: number;
  slots: FollowUpSlot[];
  booked: { value: string; name: string; business_name: string }[];
}

export const fetchFollowUpSlots = (p: { date: string; timezone?: string }) =>
  callFrappe<FollowUpSlotsResponse>("cclms.api.follow_up.follow_up_slots", p);

// ── PIN code ────────────────────────────────────────────────────────────
export const hasPortalPin = () =>
  callFrappe<{ has_pin: boolean }>("cclms.api.crm_portal.has_pin");

export const setPortalPin = (pin: string, confirm_pin: string) =>
  callFrappe<{ has_pin: boolean }>("cclms.api.crm_portal.set_pin", { pin, confirm_pin });

export const verifyPortalPin = (pin: string) =>
  callFrappe<{ ok: boolean }>("cclms.api.crm_portal.verify_pin", { pin });

// ── Multi-dimensional report ────────────────────────────────────────────
export const REPORT_DIMENSIONS = [
  { key: "company", label: "Company" },
  { key: "agent", label: "Sales Agent" },
  { key: "state", label: "State Code" },
  { key: "state_name", label: "State Name" },
  { key: "branch", label: "Branch" },
  { key: "status", label: "Status" },
  { key: "month", label: "Month" },
];

export const REPORT_MEASURES = [
  { key: "count", label: "Total" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "agreement_sent", label: "Agreement Sent" },
  { key: "signed", label: "Signed" },
  { key: "converted", label: "Converted" },
  { key: "installed", label: "Installed" },
  { key: "rejected", label: "Rejected" },
  { key: "signed_rejected", label: "Signed Rejected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending", label: "Pending" },
];

export interface MultiDimReportResponse {
  dimensions: string[];
  measures: string[];
  rows: Record<string, any>[];
  totals: Record<string, number>;
  filters: Record<string, string | null>;
}

export const fetchMultiDimReport = (p: {
  dimensions: string[];
  measures: string[];
  start_date?: string;
  end_date?: string;
  company?: string;
  agent?: string;
  state_code?: string;
  status?: string;
}) =>
  callFrappe<MultiDimReportResponse>("cclms.api.reports.multi_dim_report.multi_dim_report", {
    dimensions: JSON.stringify(p.dimensions),
    measures: JSON.stringify(p.measures),
    start_date: p.start_date || "",
    end_date: p.end_date || "",
    company: p.company || "",
    agent: p.agent || "",
    state_code: p.state_code || "",
    status: p.status || "",
  });
