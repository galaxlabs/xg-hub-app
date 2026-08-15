# ATM Leads Blocked — Root Cause + Fix (CSRF) + Sales-Portal Wiring

## 1. Root cause of "ATM Leads blocked" (create/update)

**Symptom:** the ATM Leads list loaded, but **create/update were blocked** (would not
save / threw errors), while the **Follow-ups page opened fine** (reads only).

**Root cause (deep inspection):**
- The Vercel proxy (`api/proxy.js`) used **cookie-based Frappe auth** by default
  (it only uses `API_KEY`/`API_SECRET` token auth when those env vars are set).
- With cookie auth, Frappe requires a **CSRF token** on write mutations
  (`frappe.client.insert`, `cclms.api.lead.create_lead/update_lead`, etc.).
- The proxy login only returns the **`sid`** cookie — it does **not** set an
  `X-Frappe-CSRF-Token` cookie, and the SPA had no way to obtain it.
- So every **write** returned a CSRF `403`, silently blocking create/update.
  **Reads** (follow-ups, lead list) worked → "follow-ups open, ATM leads blocked".

**Fix:**
- Generated / reused an API key+secret for the **Administrator** user.
- Set `API_KEY` and `API_SECRET` as **Vercel production env vars** on the
  `xg-hub-app` project.
- The proxy now uses `Authorization: token <key>:<secret>` (token auth) →
  **no CSRF required** → create/update work.

**Verified via deployed proxy (no cookie, no CSRF):**
```
create_lead -> {"ok":true,"name":"Lead-16-08-26-009001"}
update_lead -> {"ok":true,"name":"Lead-16-08-26-009001"}
```

## 2. Sales-portal wiring with Frappe cclms

- **Login:** `cclms.api.portal_auth_v3.login` (Frappe session cookie).
- **Current user / sales agent:** `cclms.api.crm_portal.get_current_sales_agent`
  (SANHA-style server-side resolution: User Permission → Sales Agent, then email,
  then owner). Returns user, full_name, roles, is_manager, salesAgentName,
  salesAgent, branch, company, employee.
- **Leads:** `cclms.api.lead.create_lead` / `update_lead` / `sync_leads` (delta).
- **Follow-ups:** `cclms.api.follow_up.*` (schedule, auto-assign, convert-to-lead).
- **XG Hub** uses this same auth in `session.tsx` → one login works for both the
  operator-facing and sales-agent flows, backed by Frappe (no Node/Prisma).

## 3. Notes
- For any future Vercel-deployed Frappe SPA: set `API_KEY` + `API_SECRET` env vars
  on the Vercel project so the proxy uses token auth and avoids CSRF on writes.
- Do not rely on the proxy cookie+CSRF path for writes.
