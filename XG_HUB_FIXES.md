# XG Hub — Consolidation & Fixes Log

This document records everything created, fixed, and implemented across the XG Hub /
xg-system / cclms / sales-portal / hrms consolidation work.

---

## 1. What XG Hub Is

A **single all-in-one web app** combining three Frappe-wired frontends, all backed by the
cclms Frappe site (`btm.digihoopoe.com`). No Node/Prisma/Express backend — every module
talks directly to Frappe via a Vercel serverless proxy.

| Repo | URL | Purpose |
|---|---|---|
| `galaxlabs/xg-hub-app` | https://xg-hub-app.vercel.app | **The all-in-one app** (primary) |
| `galaxlabs/xg-system` | https://xg-system.vercel.app | Restored original analytics/CRM |
| `galaxlabs/xg-hub` | (consolidated modules repo on E:) | Multi-module test repo |
| `galaxlabs/cclms` (develop) | — | Frappe backend (source of truth) |

**Live deploys (retained for client demo):**
- sales-portal → https://sales-portal-alpha.vercel.app
- hrms-portal → https://hrms-portal-weld.vercel.app

---

## 2. XG Hub App — What Was Built

1. **Copy of xg-system, rebranded "XG Hub"** — index title + all "XG System" → "XG Hub".
2. **Sales-portal module added** — new `Follow-ups` page (`/followups`, Sales role):
   - lists the logged-in sales agent's auto-assigned follow-ups (`cclms.api.follow_up.my_follow_ups`)
   - **Complete** action
   - **Convert → Lead** (calls `convert_follow_up_to_lead`)
3. **Command Center + Analytics merged** into a single "Dashboard" (removed the separate
   Analytics nav item + route). Kept the best of both (stat cards + pipeline + trend +
   company + agent breakdown).
4. **Sidebar subtitle "ERP · CRM · CCLMS" removed** (nav links cleaned to label-only).

---

## 3. Bugs Fixed

### 3.1 Layout "messed up / fucked up"
- **Cause:** when the XG Hub copy was created, `tailwind.config.cjs` and `postcss.config.cjs`
  were not copied → Tailwind's `@tailwind` directives produced an empty/partial stylesheet →
  all utility classes (flex, fixed, grid, padding, sidebar) broke.
- **Fix:** added both config files from the original xg-system. CSS went from ~0 KB → **35 KB**.
- **Verified:** deployed CSS = 35,379 bytes, layout renders correctly.

### 3.2 ATM Leads create/edit blocked
- **Create** worked at API level but the modal felt "blurred/locked":
  - Removed `backdrop-filter: blur(4px)` from the modal overlay.
  - Added `overflow-y: auto` to the modal panel so the long form scrolls.
- **Edit** failed with `Function cclms.api.lead.update_lead is not whitelisted`:
  - **Root cause:** a misplaced `@frappe.whitelist()` decorator was applied to `_coerce_data`
    instead of `update_lead` (a patch bug), so `update_lead` was never registered in Frappe's
    whitelist → every HTTP edit returned PermissionError.
  - **Fix:** moved the decorator directly above `update_lead`.
- **CSRF:** `callFrappe` was sending `"Guest"` as the CSRF token (wrong cookie name). Fixed to
  read the real `X-Frappe-CSRF-Token` cookie, or omit when absent.

### 3.3 Logout didn't route to login screen
- **Cause (two parts):**
  1. Backend guest response returned `user: None` (null); frontend `isGuestSession` only
     checked `session.user === "Guest"` → null ≠ "Guest" → app stayed "authenticated" and
     kept showing the dashboard with a guest user.
  2. `handleLogout` didn't invalidate the session query.
- **Fix:**
  - Backend `get_current_sales_agent` guest → `user: "Guest"`, `is_authenticated: false`.
  - Frontend `isGuestSession` → `!session || !session.user || session.user === "Guest"`.
  - `handleLogout` → `logoutFrappe()` → `qc.invalidateQueries(["dashboard-session"])` → reload.
- **Verified:** guest session via proxy returns `user: Guest, is_authenticated: false` →
  login screen shows after logout.

### 3.4 "No sales agents wired" (Agents page empty)
- **Cause:** `page_reporting.agent_breakdown` queried the **Operator Deal** doctype (empty),
  so it returned 0 rows.
- **Fix:** added an **ATM Leads-by-Sales-Agent fallback** (`_agent_breakdown_from_atm_leads`).
- **Also fixed:** `reports.agent_performance.get_agent_performance` returned a dict
  `{"state", "rows"}` but the frontend expects an array → now returns an array.
- **Verified:** `agent_breakdown` → **12 sales agents**; `agent_performance` → **67 rows**.

### 3.5 smart_attendance broken (Employee Checkin failed)
- **Cause:** hooks.py pointed to `smart_attendance.api.auto_attendance.create_realtime_attendance`
  which didn't exist (and `api` was a single module, not a package) → every Employee Checkin
  insert failed with `No module named 'smart_attendance.api.auto_attendance'`.
- **Fix:** converted `api.py` → package `api/` (`__init__.py`) + added `api/auto_attendance.py`
  (realtime event + mirror into `Face Attendance`; never raises).
- **Verified:** Employee Checkin insert succeeds.

### 3.6 Old xg-system issues
- **get current user:** server `cclms/api/auth.py` was missing `whoami` (frontend calls it).
  Deployed the local version that has it.
- **create lead:** `validate_lead_state` required a split `address`, but the frontend sends
  `full_address` → added fallback (`full_address` → `address`).
- **Restored old xg-system** on Vercel (redeployed the original `galaxlabs/xg-system` code).

---

## 4. Auth Model (SANHA reference)

Applied the pattern from `E:\Projects\Sanha\FRAPPE_SPA_AUTH_TEMPLATE.md` to cclms:

- **`cclms.api.crm_portal.get_current_sales_agent()`** (aliases `get_current_user`, `get_me`):
  - server-side resolution: `User Permission → Sales Agent`, then email, then owner fallback
  - returns safe profile: `user`, `full_name`, `roles`, `is_manager`, `salesAgentName`,
    `salesAgent`, `branch`, `company`, `employee`
  - guest → `user: "Guest"`, `is_authenticated: false`
- **Verified:** `marksmith.dhinc@gmail.com` → Sales Agent **Mark Manish**, branch Karachi,
  employee HR-EMP-00005.

---

## 5. Sales-Agent Lead Create/Edit (new cclms API)

- **`cclms.api.lead.create_lead(data)`** — sales-agent-safe create:
  - auto-assigns `executive_name` / `lead_owner` / branch from the caller's Sales Agent
  - `full_address` → `address` fallback; company required
- **`cclms.api.lead.update_lead(name, data)`** — sales agents can edit **only their own** leads
  (by executive_name / owner / lead_owner); others denied.
- **Verified:** own lead editable; another agent's lead denied; create auto-assigns agent.

---

## 6. Other Implemented Features (this session)

- **Follow-up automation** (`cclms/api/follow_up.py` + `Follow-up Schedule` doctype):
  schedule, round-robin auto-assign by branch, due list, next dial task, mark dialed, complete,
  convert-to-lead.
- **Tracker agent auto-dial**: `_poll_follow_up_dial` (busy-wait, business-hours + timezone).
- **Idle / 9h active-time model**: client `GetLastInputInfo`, backend `total_active_minutes` /
  `total_idle_minutes`, net productive time.
- **Per-company dynamic contracts** + esign integration (auto-fill KPF from lead, sign-back).
- **Productivity dashboard** by department/app/rating.
- **HRMS face attendance** bridge to Frappe `smart_attendance` (enroll_face / verify_face).

---

## 7. Files & Where

| Path | Purpose |
|---|---|
| `E:\Projects\xg-hub-app\` | XG Hub app source (git: galaxlabs/xg-hub-app) |
| `E:\Projects\btm-project\cclms\` | cclms Frappe app (git: galaxlabs/cclms, develop) |
| `E:\Projects\xg-hub\` | Consolidated multi-module repo |
| `C:\...\Temp\opencode\xg-old\` | Original xg-system working copy |
| `C:\...\Temp\opencode\xg-frontend\` | xperts-crm/frontend reference copy |

Backend files changed:
- `cclms/api/crm_portal.py` (SANHA auth)
- `cclms/api/lead.py` (create_lead / update_lead)
- `cclms/api/auth.py` (whoami)
- `cclms/api/page_reporting.py` (agent_breakdown fallback)
- `cclms/api/reports/agent_performance.py` (array return)
- `cclms/api/follow_up.py`, `desktop_tracker.py`, `agreement_signing.py`
- `cclms/.../atm_leads/atm_leads.py` (address fallback, company reqd)
- `smart_attendance/.../api/auto_attendance.py` (new)

---

## 8. Remaining / Next

- Set **passwords for sales agents** (needed for sales-agent login testing).
- Optionally collapse sales-portal / hrms-portal into XG Hub and archive separate deploys.
- Add operator-portal stats to XG Hub dashboard (reference source) when requested.
