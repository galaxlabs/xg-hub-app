# Team Chat & ATM Lead State History

Covers the XG Hub **Team Chat** (`/chat`) and the **ATM Lead state history** child table.

---

## 1. ATM Lead State History

Every `workflow_state` change on `ATM Leads` is recorded automatically by `atm_leads.py → log_workflow_change()`:

- Appends a row to the **`state_history` child table** (`ATM Lead State History` doctype):
  - `from_state`, `to_state`, `change_datetime`, `change_date`, `changed_by`, `agent_name`, `days_in_state`
- Also inserts an immutable row in **Agent Stage Ledger** (`agent_stage_ledger` doctype) — used by Signs/Pipeline stage-velocity charts.
- Initial `Draft` creation is ignored; durations (`days_in_state`) are back-filled on the previous row when a transition happens.

Counting by state: use `cclms.api.reports.workflow_pivot` (pivot by company × agent) or `cclms.api.reports.multi_dim_report` (status dimension). Stage counts are date-windowed by each stage's own date field when available (e.g. `sign_date` for Signed) else the live `workflow_state`.

## 2. Team Chat — Backend (`cclms.api.chat`)

### Doctypes
- `Chat Message` — sender, receiver, message, `attachment_url`, `attachment_name`, `group_name`, `is_pinned`, `mention_users`, `linked_doctype`, `linked_name`, is_read, read_at.
- `Chat Group` (+ `Chat Group Member` child, `Chat Pinned Message` child).
- `AI Settings` (Single) — provider/api_key/model/base_url + tool toggles.

### Endpoints
| Method | Purpose |
|---|---|
| `list_contacts` | Active sales agents only (Sales Agent `enable=1`, linked user). |
| `send_message` | 1:1 (receiver) or group (group_name); optional attachment / mention / linked record. |
| `get_conversation` | History for a user or a group, ascending. |
| `mark_read` / `unread_count` | Read tracking. |
| `create_group` / `list_groups` | Group chats; creator auto-added as member. |
| `pin_message` / `unpin_message` / `pinned_messages` | Pin a message (sets `is_pinned`; mirrors into group's `Chat Pinned Message` child). |
| `attach_record` | Resolve a cclms record (lead/follow-up/campaign/task/project/document) → label for a chat link message. |
| `bot_ask` | AI assistant: searches leads/follow-ups/campaigns/documents for context, then calls the provider if configured. |

### AI bot (integration point)
- `AI Settings` (System Manager) stores: `enabled`, `provider` (`openai`/`openrouter`/`gemini`/`anthropic`), `api_key` (Password), `model`, `base_url`, and tool toggles.
- `bot_ask(query)`:
  1. Searches enabled tools for rows matching the query (business_name / campaign_name / file_name …).
  2. If `api_key` is set → calls the provider (`/chat/completions`) with the CRM context and returns an AI reply.
  3. Otherwise returns the searched context (`from:"search"`) so the UI still shows useful results + a config hint.
- To go live: create/set `AI Settings` with a provider API key. No code change needed.

## 3. Team Chat — Frontend (`ChatPage.tsx`)

- **Contacts**: active agents only (from `list_contacts`), with search.
- **Groups**: listed above agents; "New Group" modal with member checkboxes.
- **1:1 / group conversation**: 5s polling, auto mark-read, live Eastern clock elsewhere.
- **Composer**:
  - Text input; type `@` → mention autocomplete (active agents), inserts `@name`.
  - Emoji picker (inline row of emojis).
  - Paperclip → upload file via `frappe.handler.upload_file` → sent as attachment message (rendered as file card).
  - Link icon → **Attach cclms record** modal (choose type + name) → sent as a linked-record message.
- **Message bubble**: sender name (groups), file card, linked-record chip, mention highlighting (`@name`), time, **pin/unpin** toggle.
- **AI Assistant** panel: chat with `bot_ask`; shows AI reply, search context, or config hint.
- GIFs: supported by sending an image attachment (or a link message) — no dedicated picker yet.

## 4. Notes
- Contact list intentionally excludes non-active users (e.g. disabled/old accounts) and non-agent users.
- `Chat Message` and `Chat Group` are visible to all roles; write access is via the whitelisted API (rows inserted with `ignore_permissions`).
- The node xperts-crm chat (socket.io + `/api/chat-upload`) is the legacy reference; XG Hub chat is fully Frappe-backed.
