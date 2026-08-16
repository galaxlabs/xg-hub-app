# XG Hub — Feature Reference

Consolidated reference for the XG Hub app (`galaxlabs/xg-hub-app`, live at `https://xg-hub-app.vercel.app`) and the cclms backend (`galaxlabs/cclms`, branch `develop`).

Related docs: `CHAT_AND_STATE_HISTORY.md`, `XG_HUB_FIXES.md`, `ATM_LEAD_CREATE_UPDATE_OPENING_HOURS.md`.

---

## 1. Auth & Session

| Feature | Where | Notes |
|---|---|---|
| Shared login | `cclms.api.crm_portal.get_current_sales_agent` | SANHA model; used by XG Hub (and sales-portal). Guest → `{user:"Guest", is_authenticated:false}`. |
| Login | `frappe.client`/`login` + `get_current_sales_agent` | Standard Frappe session; NOT operator `portal_auth_v3`. |
| Session lock | XG Hub `SessionLock` | After 15 min inactivity the dashboard locks; unlock with 8-digit PIN (no OTP) or Resume/Logout. |
| PIN (8-digit) | `cclms.api.crm_portal.set_pin / verify_pin / has_pin` | Stored hashed on **Sales Agent** (`portal_pin`, Password; `portal_pin_set_on`). Set with confirm in Settings. |
| Timezone per agent | `cclms.api.crm_portal.set_my_timezone` | Select field `portal_timezone` on **Sales Agent**; predefined US list only (Eastern/Central/Mountain/AZ/Pacific/Alaska/Hawaii). Top-bar clock uses it. |

## 2. Themes (backend-driven)

- `cclms.api.crm_portal.get_theme_config` returns **16 themes** = 8 accents (Emerald, Royal Blue, Lavender, Baby Pink, Ocean, Slate, Sunset, Crimson) × dark/light, each with `primary`, `secondary`, `sidebar`, `workspace`, `card`, `surface`, `text`, `muted`, `border`.
- XG Hub applies them as CSS variables via `src/lib/theme.ts` (`themeStyleVars` → hex→HSL for Tailwind triplets + `--gc-*`).
- **Baby Pink Light** mirrors the sales-portal look: `#fbe8ee` workspace, white cards, `#fdf1f5` sidebar, `#ec6fa3` accent.
- Persisted in `localStorage["gc-theme-key"]` = `"<accentId>:<mode>"` (e.g. `pink:light`). Header toggle flips dark/light of the current accent.

## 3. Unified Dashboard (`/`)

Tabbed dashboard with: **Command Centre · Follow-ups · HRMS · Activity · Calls · Agents · Direction · Reports · Pipeline · Analytics · Signs**.

- Stat tabs (`FollowUpStatsTab`, `HRMSStatsTab`, `ActivityStatsTab`, `CallsStatsTab`) consume `cclms.api.dashboard_stats.dashboard_stats`:
  - follow-ups (total, scheduled, due, today_due, completed, missed, completion_rate)
  - hrms (present/absent/on_leave/active_employees)
  - activity (active_hours = 9h workday, active/idle minutes, avg_productivity, unauthorized_hits, tracked_calls)
  - calls (total/answered/missed/talk_minutes + **Daily Call Target** met/missed per day)
- Pipeline, Signs, Agents, Direction, Reports are reachable only via dashboard tabs (removed from the sidebar).

## 4. Leads (ATM Leads)

- `LeadsPage` → full CRUD wired to `cclms.api.lead` (create_lead / update_lead) + `frappe.client`.
- Business Hours widget (`BusinessHours.tsx`) on the lead form persists the `opening_hours` child table (`Opening Hours` doctype) with 7-day grid, Off toggle, Apply-to-All, total hours.
- Portal data cutoff: `post_date >= PORTAL_DATA_START_DATE` (see `AGENTS.md`).

## 5. Follow-ups

- `FollowUpsPage` with: create (full prospect form incl. Business Hours), Complete, **Convert → Lead**, **Not Interested**, **Attach document**.
- **5-minute time slots**: `cclms.api.follow_up.follow_up_slots` generates 08:00–20:00 slots in the agent's timezone; booked slots are disabled. `schedule_follow_up` rejects double-booking the same slot for the same agent.
- `mark_not_interested(name, reason)`: completes the follow-up with `dial_result="Not Interested"` and moves a linked ATM Lead to `Not Interested`.
- `convert_follow_up_to_lead`: follow-up-first flow → ATM Lead (Draft→Pending).

## 6. Calendar

- Calendar shows **follow-ups only** as amber dots (created/posted leads are NOT shown). Day panel lists follow-ups with time.

## 7. Reports

- **Reports tab** (dashboard) with two modes:
  - **Multi-Dimension**: `cclms.api.reports.multi_dim_report.multi_dim_report` — pick dimensions (company/agent/state/state_name/branch/status/month) × measures (count/submitted/approved/agreement_sent/signed/converted/installed/rejected/signed_rejected/cancelled/pending), CSV export.
  - **Workflow Pivot**: `cclms.api.reports.workflow_pivot.workflow_pivot` — one table: **company × agent rows**, each workflow stage a column (Submitted → … → Signed → Rejected → Not Interested, etc.) + Total + grand totals. Stages measured by their own date field when available, else live `workflow_state`.
- Agents page data: `page_reporting.agent_breakdown` + `reports/agent_performance.get_agent_performance` (frontend normalizes to `total_*` shape and filters zero-activity agents).

## 8. Campaigns

- New cclms **`Sales Campaign`** doctype (avoids clash with erpnext `Campaign`):
  - `campaign_name`, `status` (Active/Paused/Completed/Archived), `assigned_agent` → Sales Agent, `budget`, `start_date`, `reach`, `conversion`, `description`
  - **`Sales Campaign Companies`** child table → Operator Companies
- `CampaignsPage` create modal: agent dropdown + company multi-select + reach/conversion; detail view shows agent + companies chips + metrics.

## 9. Meetings

- `MeetingsPage` → `Event` doctype (`event_category="Meeting"`), custom `meet_link` field. Upcoming/past split, Join Meet button.

## 10. Documents

- `DocumentsPage` → Frappe `File` attached to the current User (`attached_to_doctype=User`). Upload via `frappe.handler.upload_file`; open/delete. (Multipart forwarding works through the Vercel proxy.)

## 11. Tasks

- `TasksPage` → Frappe `Task` doctype (subject, description, exp_end_date, status Open/Working/Pending Review/Overdue/Completed/Cancelled, assigned_to).

## 12. Team Chat

See `CHAT_AND_STATE_HISTORY.md` for full detail. Summary:
- Contacts = **active sales agents only** (`cclms.api.chat.list_contacts`, Sales Agent `enable=1`).
- 1:1 DMs, **groups** (`Chat Group` + `Chat Group Member`), **pin/unpin** (`is_pinned`, group `Chat Pinned Message` child), **@mentions**, **emoji picker**, **file attachments**, **attach a cclms record** (lead/follow-up/campaign/task/project/document).
- **AI Assistant** panel: `cclms.api.chat.bot_ask` — searches leads/follow-ups/campaigns/documents for context, and calls the configured provider if `AI Settings.api_key` is set (integration point; not yet configured).

## 13. Misc

- `EmployeeManagement`/Employees page: read-only directory (HR module).
- Vite build disables CSS minification (`cssMinify:false`) because lightningcss 1.33 crashes on Tailwind `border-[var(--gc-border)]` arbitrary classes.
- Vercel proxy: `api/proxy.js` forwards `/api/method/:method` → `btm.digihoopoe.com`; supports multipart via raw-body read. Server routes `/api/` through nginx → node on 5001; Frappe itself is on gunicorn:8000.

## 14. Sales Agent login (XG Hub access)

- The `Sales Agent` controller (`sales_agent.py`) auto-creates a linked `User` (email) + `Employee` on save, forces the **`Sales Executive` role profile** (grants `Sales Agent` + `Sales User` roles) and stores a generated password in `agent_password` (encrypted).
- `cclms.call_centre_lead_management_system.doctype.sales_agent.sales_agent.sync_portal_users` bulk-ensures every **active** sales agent has a User (creates missing ones, reuses existing, forces the Sales Executive profile + enabled state). Returns `{created, reused, missing_email, errors}`. Only System Manager / HR Manager / Sales Manager can run it.
- To give an agent access: set `enable=1` on the Sales Agent (auto-creates/syncs the User), then generate a password via the Sales Agent desk form (`generate_new_password`) or `get_saved_password` (manager-only).
- Note: some legacy accounts have email-verification/2FA enabled, which returns a `verification` prompt on login instead of a session. Setting an 8-digit PIN (Settings → PIN Code) enables PIN unlock without OTP.
- Known data cleanup done: `Ashlin Anderson` email typo `@xperts-global.om` → `@xperts-global.com`.

## 15. HRMS (Leave)

- `cclms.api.hrms` (new):
  - `my_leaves` / `list_all_leaves` — current employee's / all leave applications
  - `leave_types` — from `Leave Type`
  - `leave_balance` — from `Leave Ledger Entry` (opening + credited − consumed per type)
  - `create_leave` — employee submits (resolves employee via Sales Agent.employee or Employee.user_id)
  - `approve_leave` — Approve / Reject / Cancel (+ optional comment)
- XG Hub **Leave** page (`/leave`, HR module): leave-balance stat cards, My/All tabs, status filter, create modal, approve/reject actions. Uses Frappe's `Leave Application` doctype.

