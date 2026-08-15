# XG Hub — Dashboard Fixes & Notes

**Source of truth: ATM Leads** (not Operator Deal). All dashboard endpoints now fall
back to ATM Leads when the Operator Deal doctype is empty/unused.

---

## 1. Dashboard "not appearing properly" — root cause

The XG Hub Dashboard (`OverviewPage`) fed all its widgets from `cclms.api.page_reporting.*`
endpoints, which were written against the **Operator Deal** doctype. That doctype is
**empty** (your leads live in **ATM Leads**), so every widget returned nothing.

### Fixed endpoints (ATM Leads fallback added)

| Endpoint | What it feeds | Fallback now |
|---|---|---|
| `overview` | KPI cards + pipeline status snapshot | Counts ATM Leads by milestone date columns (creation, approve_date, sign_date, install_date, …) + workflow_state snapshot |
| `company_breakdown` | Company table | Groups ATM Leads by `company` |
| `agent_breakdown` | Agent performance | Groups ATM Leads by `executive_name` (Sales Agent) |
| `multi_trend` | 12-Month Milestone Trend + Milestone Comparison Bar View | Monthly counts by milestone date columns, continuous 13-month range |
| `recent_signed` | Recent Signed Deals (Latest 15 signed leads) | Latest signed ATM Leads (by `sign_date`) |

### Date model (same as operator portal)
- **post_date = "born date"** (creation)
- **Status updates happen on their own date columns after post_date**:
  - Approved → `approve_date`
  - Agreement Sent → `agreement_sent_date`
  - Signed → `sign_date`
  - Converted → `convert_date`
  - Installed → `install_date`
  - Rejected → `custom_signedrejected_date`
  - Cancelled → `remove_date`

---

## 2. Verified results (live)

- **Overview KPI**: submitted 473, approved 6, signed 3, installed 1 + **17-status snapshot**
- **Company breakdown**: 18 companies (e.g. Bitcoin Depot 978 signed / 6,460 rejected)
- **Agent breakdown**: 12 sales agents
- **12-Month Milestone Trend**: 13 months (2025-08 → 2026-08), 6 series
  (Approved 935, Agreement Sent 568, Signed 546, Installed 423)
- **Recent Signed Deals**: 15 rows (e.g. Citgo / Athena / George Smith / VA / 2026-08-12)

All verified through the deployed Vercel proxy on `xg-hub-app.vercel.app`.

---

## 3. Other XG Hub fixes (this session)

1. **Header**: removed "Galaxy Labs / ERP" breadcrumb — now shows only the page title.
2. **ATM Leads list**: whole row is now clickable (opens detail); Edit button works
   (`DataTable` got `onRowClick`).
3. **Follow-ups**: added "+ New Follow-up" button + modal; backend
   `schedule_follow_up` now supports a **standalone prospect** (no lead) and
   auto-assigns to the caller's Sales Agent.
4. **Local-first caching**: `src/lib/leadCache.ts` stores leads/follow-ups/companies in
   localStorage; `cclms.api.lead.sync_leads(since)` returns only **new/updated rows**
   (delta) + `synced_at`, so the app avoids thousands of full-data calls.
5. **Logout**: fixed guest detection (null user treated as guest) + session query
   invalidation → routes to login screen.
6. **Auth**: SANHA-style `get_current_sales_agent` (user, roles, salesAgentName,
   branch, company, employee).
7. **Sales-agent create/edit**: `cclms.api.lead.create_lead` / `update_lead`
   (permission-scoped, auto-assign agent).
8. **Layout**: added missing `tailwind.config.cjs` + `postcss.config.cjs` (CSS wasn't
   building → "UI messed up").

---

## 4. Files changed (backend)

- `cclms/api/page_reporting.py` — all dashboard endpoints + ATM Leads fallbacks
- `cclms/api/lead.py` — `create_lead`, `update_lead`, `sync_leads` (delta)
- `cclms/api/crm_portal.py` — SANHA-style auth
- `cclms/api/follow_up.py` — prospect follow-up create + auto-assign
- `cclms/api/auth.py` — `whoami`
- `cclms/.../atm_leads/atm_leads.py` — address fallback, company required
- `cclms/.../smart_attendance/api/auto_attendance.py` — new (fixed hook)

## 5. Files changed (frontend)

- `src/lib/leadCache.ts` — new (localStorage + delta sync)
- `src/lib/api.ts` — `createATMLead`/`updateATMLead`/`fetchOperatorCompaniesCached`
- `src/lib/frappe.ts` — `logoutFrappe` + CSRF fix
- `src/lib/session.tsx` — guest detection + `get_current_sales_agent`
- `src/components/ui/index.tsx` — `DataTable` `onRowClick`, modal scroll
- `src/pages/OverviewPage.tsx` — (dashboard consumes fixed endpoints)
- `src/pages/LeadsPage.tsx` — row click, cached companies, delta sync
- `src/pages/FollowUpsPage.tsx` — create follow-up modal + cache

---

## 6. Repos / deploys

- **XG Hub frontend**: `galaxlabs/xg-hub-app` → https://xg-hub-app.vercel.app
- **Backend**: `galaxlabs/cclms` (develop)
- **Original xg-system** (restored): https://xg-system.vercel.app
