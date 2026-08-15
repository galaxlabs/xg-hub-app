# ATM Lead Create/Update — Shield Fix + Opening Hours Design

Notes recorded for XG Hub (sales CRM portal) work.

---

## 1. "Transparent shield" blocking ATM Lead create/update

**Symptom:** clicking "+ New Lead" or "Edit" opened a form that appeared dimmed/blocked
("transparent shield"), making it hard to interact.

**Root cause:** the modal overlay used `background: rgba(0,0,0,0.55)` and `z-index: 50`,
and the modal panel had no explicit stacking/opaque guarantee. The dark translucent backdrop
read as a "shield" over the form, and the panel could render under it depending on stacking.

**Fix (`src/styles.css`):**
- `.gc-modal-overlay` → `z-index: 60`, `background: rgba(0,0,0,0.45)` (lighter backdrop)
- `.gc-modal-panel` → `position: relative; z-index: 61; background: hsl(var(--card))`
  (explicit opaque background, always above the overlay)

**Verified:** create + update work through the deployed proxy
(`cclms.api.lead.create_lead` / `update_lead` return `ok:true`).

---

## 2. Opening Hours child table — reference design applied

Reference source: `xperts-crm/frontend` `BusinessHours.jsx` (sales CRM portal). It uses a
7-day grid (Mon–Sun) with per-day open/close time inputs, an **"Off" toggle** per day, an
**"Apply to All Days"** master control, and **auto-computed total hours**.

### ATM Leads backend (`opening_hours` child table)
Added an **`is_off`** Check field (default 0) to `opening_hours` so each weekday can be
marked off (closed). Existing fields: `weekday`, `opening_time`, `closing_time`, `total_hours`.

### XG Hub frontend — new `BusinessHours.tsx` component
Mirrors the reference design:
- 7-day grid, per-day `time` inputs
- per-day **Off** toggle (blanks the times, shows "—", sets total to 0)
- **Apply to All Days** (sets open/close to all days from two master time inputs)
- **Total Hours** auto-computed per day (handles overnight, e.g. 22:00–02:00 → 4h)

Integrated into the **LeadForm** (Deal Info section, after the "Hours" text field).

### Lead API (`cclms.api.lead.create_lead` / `update_lead`)
- Accept `opening_hours` (array of `{weekday, opening_time, closing_time, is_off}`)
- `_set_opening_hours()`: sorts by weekday, appends child rows, computes `total_hours`,
  sets `is_off` (overnight-aware, off days → 0)

**Verified end-to-end** (create as sales agent):
```
Monday 08:00–18:00 → total 10h, off=0
Tuesday 09:00–17:00 → total 0h, off=1   ← off day
Sunday 10:00–20:00 → total 10h, off=0
```

---

## 3. Files changed

| Repo | File | Change |
|---|---|---|
| xg-hub-app | `src/styles.css` | Modal overlay/panel z-index + opaque bg (shield fix) |
| xg-hub-app | `src/components/BusinessHours.tsx` | New opening-hours editor (reference design) |
| xg-hub-app | `src/pages/LeadsPage.tsx` | Import + integrate BusinessHours into LeadForm |
| cclms | `.../doctype/opening_hours/opening_hours.json` | Added `is_off` field |
| cclms | `cclms/api/lead.py` | create_lead/update_lead opening_hours child-table handling + `_set_opening_hours` / `_hours_total` |

---

## 4. Deployed & verified
- XG Hub: https://xg-hub-app.vercel.app
- GitHub: `galaxlabs/xg-hub-app` (master), `galaxlabs/cclms` (develop)
- Create/update with opening hours verified via `cclms.api.lead.*`
