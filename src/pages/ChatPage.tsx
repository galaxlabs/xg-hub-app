import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, Send, Search, Users, RefreshCw, Paperclip, FileText, Loader2,
  Smile, Image as ImageIcon, Pin, PinOff, Plus, Bot, Link2, X,
} from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";
import {
  listChatContacts, sendChatMessage, getChatConversation, createChatGroup,
  listChatGroups, pinChatMessage, unpinChatMessage, attachCclmsRecord, botAsk,
} from "../lib/api";
import type { ChatContact, ChatGroupInfo, ChatMessageFull } from "../lib/api";

const EMOJIS = ["😀","😄","😂","🤣","😊","😍","🤔","😎","🥳","😢","😡","👍","👎","🙏","👏","💪","🔥","❤️","🎉","✅","❌","📞","📧","💰","📍","📈","📉"];

const ATTACHABLE = [
  { doctype: "ATM Leads", label: "ATM Lead", field: "business_name" },
  { doctype: "Follow-up Schedule", label: "Follow-up", field: "business_name" },
  { doctype: "Sales Campaign", label: "Campaign", field: "campaign_name" },
  { doctype: "Task", label: "Task", field: "subject" },
  { doctype: "Project", label: "Project", field: "project_name" },
  { doctype: "File", label: "Document", field: "file_name" },
];

function MentionHighlight({ text }: { text: string }) {
  const parts = text.split(/(@\w[\w.-]*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        /^@\w/.test(p)
          ? <span key={i} className="rounded bg-amber-200/40 px-0.5 font-medium text-amber-700 dark:text-amber-300">@{p.slice(1)}</span>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

export default function ChatPage() {
  const session = useDashboardSession();
  const me = session?.user || "Guest";
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [groups, setGroups] = useState<ChatGroupInfo[]>([]);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageFull[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [groupModal, setGroupModal] = useState(false);
  const [attachModal, setAttachModal] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [botInput, setBotInput] = useState("");
  const [botLog, setBotLog] = useState<{ role: "user" | "bot"; text: string; kind?: string }[]>([]);
  const [botBusy, setBotBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(async () => {
    try { setContacts(await listChatContacts() || []); } catch {}
  }, []);
  const loadGroups = useCallback(async () => {
    try { setGroups(await listChatGroups() || []); } catch {}
  }, []);
  const loadMessages = useCallback(async (user?: string | null, group?: string | null) => {
    try {
      const rows = await getChatConversation({ other_user: user || undefined, group_name: group || undefined });
      setMessages(rows || []);
      await callFrappe("cclms.api.chat.mark_read", { other_user: user || "", group_name: group || "" }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => { void loadContacts(); void loadGroups(); }, [loadContacts, loadGroups]);

  useEffect(() => {
    if (!activeUser && !activeGroup) return;
    void loadMessages(activeUser, activeGroup);
    const t = setInterval(() => void loadMessages(activeUser, activeGroup), 5000);
    return () => clearInterval(t);
  }, [activeUser, activeGroup, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const mentionable = useMemo(() => contacts.filter((c) => c.name !== me), [contacts, me]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || (!activeUser && !activeGroup)) return;
    const mentions = Array.from(text.matchAll(/@(\w[\w.-]*)/g)).map((m) => m[1]).join(",");
    try {
      await sendChatMessage({
        receiver: activeUser || undefined,
        group_name: activeGroup || undefined,
        message: text,
        mention_users: mentions,
      });
      setInput("");
      await loadMessages(activeUser, activeGroup);
    } catch {}
  }

  async function uploadAndSend(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || (!activeUser && !activeGroup)) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("is_private", "0");
      body.append("attached_to_doctype", "Chat Message");
      body.append("attached_to_name", "Chat");
      const res = await fetch("/api/method/frappe.handler.upload_file", { method: "POST", credentials: "include", body });
      const data = await res.json();
      if (data?.message?.file_url) {
        await sendChatMessage({
          receiver: activeUser || undefined,
          group_name: activeGroup || undefined,
          message: `📎 ${data.message.file_name}`,
          attachment_url: data.message.file_url,
          attachment_name: data.message.file_name,
        });
        await loadMessages(activeUser, activeGroup);
      }
    } catch {}
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function togglePin(m: ChatMessageFull) {
    try { m.is_pinned ? await unpinChatMessage(m.name) : await pinChatMessage(m.name); await loadMessages(activeUser, activeGroup); } catch {}
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("groupName") as HTMLInputElement).value.trim();
    const checked = Array.from(form.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked")).map((c) => c.value);
    if (!name) return;
    try {
      await createChatGroup({ group_name: name, members: checked });
      setGroupModal(false);
      await loadGroups();
    } catch {}
  }

  async function attachRecord(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const doctype = (form.elements.namedItem("attDoctype") as HTMLSelectElement).value;
    const name = (form.elements.namedItem("attName") as HTMLInputElement).value.trim();
    if (!name) return;
    try {
      const rec = await attachCclmsRecord({ doctype, name });
      await sendChatMessage({
        receiver: activeUser || undefined,
        group_name: activeGroup || undefined,
        message: `📎 ${rec.label} (${rec.doctype})`,
        linked_doctype: rec.doctype,
        linked_name: rec.name,
      });
      setAttachModal(false);
      await loadMessages(activeUser, activeGroup);
    } catch {}
  }

  async function askBot() {
    const q = botInput.trim();
    if (!q || botBusy) return;
    setBotBusy(true);
    setBotLog((log) => [...log, { role: "user", text: q }]);
    setBotInput("");
    try {
      const res = await botAsk({ query: q });
      if (res.reply) {
        setBotLog((log) => [...log, { role: "bot", text: res.reply as string, kind: "ai" }]);
      } else {
        const ctx = (res.context || []).map((c) => `• ${c.kind}: ${c.text}`).join("\n") || "No matching records found.";
        setBotLog((log) => [...log, { role: "bot", text: ctx, kind: "search" }]);
        if (res.error) setBotLog((log) => [...log, { role: "bot", text: `⚠️ ${res.error}`, kind: "error" }]);
      }
    } catch (err: any) {
      setBotLog((log) => [...log, { role: "bot", text: `⚠️ ${err.message || "Bot error"}`, kind: "error" }]);
    } finally { setBotBusy(false); }
  }

  const onInputChange = (v: string) => {
    setInput(v);
    const atIdx = v.lastIndexOf("@");
    if (atIdx >= 0 && v.slice(atIdx + 1).match(/^[\w.-]*$/)) {
      setMentionQuery(v.slice(atIdx + 1));
      setMentionOpen(true);
    } else setMentionOpen(false);
  };

  const insertMention = (name: string) => {
    const atIdx = input.lastIndexOf("@");
    setInput(input.slice(0, atIdx) + `@${name} `);
    setMentionOpen(false);
  };

  const filteredMentions = mentionable.filter((c) => (c.full_name || c.name).toLowerCase().includes(mentionQuery.toLowerCase()));

  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.full_name} ${c.name}`.toLowerCase().includes(q);
  });
  const activeContact = contacts.find((c) => c.name === activeUser);
  const activeGroupInfo = groups.find((g) => g.group_name === activeGroup);
  const initials = (name?: string) => (name || "?").substring(0, 2).toUpperCase();
  const fileHref = (url: string) => (url.startsWith("/") ? `/api/frappe${url}` : url);

  const openUser = (u: string) => { setActiveUser(u); setActiveGroup(null); setShowEmoji(false); setMentionOpen(false); };
  const openGroup = (g: string) => { setActiveGroup(g); setActiveUser(null); setShowEmoji(false); setMentionOpen(false); };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5 text-indigo-500" /> Team Chat</h1>
          <p className="text-sm text-muted">Chat with active sales agents, groups, and the assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="gc-btn gc-btn-ghost" onClick={() => setBotOpen((o) => !o)} title="AI Assistant"><Bot className="h-4 w-4" /> Assistant</button>
          <button className="gc-btn gc-btn-primary" onClick={() => setGroupModal(true)} title="Create group"><Plus className="h-4 w-4" /> New Group</button>
          <button className="gc-btn gc-btn-ghost" onClick={() => { void loadContacts(); void loadGroups(); }} title="Refresh"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[450px]">
        {/* Left: contacts + groups */}
        <div className="flex flex-col rounded-lg border border-border bg-[var(--gc-card)]">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input className="gc-input w-full pl-9" placeholder="Search agents…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.length > 0 && (
              <div className="border-b border-border px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase text-muted">Groups</div>
                {groups.map((g) => (
                  <button key={g.name} onClick={() => openGroup(g.group_name)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${activeGroup === g.group_name ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-muted/50"}`}>
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span className="truncate font-medium">{g.group_name}</span>
                    <span className="ml-auto text-[10px] text-muted">{g.group_member_count ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="px-3 py-2">
              <div className="mb-1 text-[10px] font-semibold uppercase text-muted">Active Agents ({filtered.length})</div>
              {filtered.length === 0 ? <div className="py-4 text-center text-sm text-muted">No active agents.</div> :
                filtered.map((c) => (
                  <button key={c.name} onClick={() => openUser(c.name)} className={`flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-colors ${activeUser === c.name ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-muted/50"}`}>
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{initials(c.full_name || c.name)}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.full_name || c.name}</div>
                      <div className="truncate text-xs text-muted">{c.name}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Right: conversation / bot */}
        <div className="flex flex-col rounded-lg border border-border bg-[var(--gc-card)]">
          {botOpen ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-violet-500" /> AI Assistant</div>
                <button className="gc-btn gc-btn-ghost h-7 w-7 p-0" onClick={() => setBotOpen(false)}><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                {botLog.length === 0 && <div className="py-8 text-center text-xs text-muted">Ask me about leads, follow-ups, campaigns, or documents.</div>}
                {botLog.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${m.role === "user" ? "bg-indigo-500 text-white" : m.kind === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10" : "bg-muted"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {botBusy && <div className="text-xs text-muted">Thinking…</div>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); void askBot(); }} className="flex items-center gap-2 border-t border-border p-3">
                <input className="gc-input flex-1" placeholder="Ask the assistant…" value={botInput} onChange={(e) => setBotInput(e.target.value)} />
                <button type="submit" className="gc-btn gc-btn-primary" disabled={!botInput.trim() || botBusy}><Send className="h-4 w-4" /></button>
              </form>
            </div>
          ) : !activeUser && !activeGroup ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted">
              <Users className="h-10 w-10 opacity-20" />
              <div>Select an active agent or group to start chatting</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {activeGroup ? <Users className="h-4 w-4" /> : initials(activeContact?.full_name || activeUser || "")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{activeGroup ? activeGroupInfo?.group_name || activeGroup : activeContact?.full_name || activeUser}</div>
                    <div className="text-xs text-muted">{activeGroup ? "Group chat" : activeUser}</div>
                  </div>
                </div>
                <button className="gc-btn gc-btn-ghost h-7 w-7 p-0" onClick={() => setAttachModal(true)} title="Attach cclms record"><Link2 className="h-4 w-4" /></button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4" onMouseEnter={() => void loadMessages(activeUser, activeGroup)}>
                {messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted">No messages yet. Say hello!</div>
                ) : messages.map((m) => {
                  const mine = m.sender === me;
                  return (
                    <div key={m.name} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-indigo-500 text-white" : "bg-muted"}`}>
                        {!mine && activeGroup && <div className="mb-0.5 text-[10px] font-semibold text-primary">{contacts.find((c) => c.name === m.sender)?.full_name || m.sender}</div>}
                        {m.attachment_url && (
                          <a href={fileHref(m.attachment_url)} target="_blank" rel="noopener noreferrer" className={`mb-1.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium underline ${mine ? "bg-white/15 text-white" : "bg-[var(--gc-card)] text-primary"}`}>
                            <FileText className="h-4 w-4" /> {m.attachment_name || "Attachment"}
                          </a>
                        )}
                        {m.linked_doctype && (
                          <div className={`mb-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${mine ? "bg-white/15 text-white" : "bg-[var(--gc-card)] text-primary"}`}>
                            <Link2 className="h-3.5 w-3.5" /> {m.linked_doctype}: {m.linked_name}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words"><MentionHighlight text={m.message} /></div>
                        <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${mine ? "text-indigo-100" : "text-muted"}`}>
                          <span>{m.creation ? new Date(m.creation).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          <button onClick={() => void togglePin(m)} title={m.is_pinned ? "Unpin" : "Pin"}>
                            {m.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3 opacity-60" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="relative flex items-center gap-2 border-t border-border p-3">
                {mentionOpen && filteredMentions.length > 0 && (
                  <div className="absolute bottom-full left-0 z-20 mb-1 max-h-40 w-56 overflow-y-auto rounded-lg border border-border bg-[var(--gc-card)] shadow-xl">
                    {filteredMentions.slice(0, 8).map((c) => (
                      <button key={c.name} type="button" onClick={() => insertMention(c.name)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600">{initials(c.full_name || c.name)}</span>
                        <span>{c.full_name || c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" onChange={uploadAndSend} />
                <button type="button" className="gc-btn gc-btn-ghost h-9 w-9 p-0" onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach file">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </button>
                <button type="button" className="gc-btn gc-btn-ghost h-9 w-9 p-0" onClick={() => setShowEmoji((s) => !s)} title="Emoji"><Smile className="h-4 w-4" /></button>
                {showEmoji && (
                  <div className="absolute bottom-full left-12 z-20 mb-1 flex w-56 flex-wrap gap-1 rounded-lg border border-border bg-[var(--gc-card)] p-2 shadow-xl">
                    {EMOJIS.map((em) => <button key={em} type="button" className="rounded p-1 text-lg hover:bg-muted/50" onClick={() => { setInput((v) => v + em); }}>{em}</button>)}
                  </div>
                )}
                <input className="gc-input flex-1" placeholder="Type a message… @ to mention" value={input} onChange={(e) => onInputChange(e.target.value)} />
                <button type="submit" className="gc-btn gc-btn-primary" disabled={!input.trim()}><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Create group modal */}
      {groupModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={() => setGroupModal(false)}>
          <form onSubmit={createGroup} className="w-full max-w-md rounded-lg border border-border bg-[var(--gc-card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 flex items-center justify-between text-base font-semibold">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-500" /> New Group</span>
              <X className="h-4 w-4 cursor-pointer" onClick={() => setGroupModal(false)} />
            </h2>
            <div className="space-y-3">
              <div><label className="text-xs text-muted">Group Name *</label>
                <input name="groupName" className="gc-input mt-1 w-full" required placeholder="e.g. Sales Team North" /></div>
              <div><label className="text-xs text-muted">Members</label>
                <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {mentionable.map((c) => (
                    <label key={c.name} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
                      <input type="checkbox" value={c.name} />
                      <span>{c.full_name || c.name}</span>
                      <span className="ml-auto text-xs text-muted">{c.name}</span>
                    </label>
                  ))}
                </div></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setGroupModal(false)}>Cancel</button>
              <button type="submit" className="gc-btn gc-btn-primary">Create Group</button>
            </div>
          </form>
        </div>
      )}

      {/* Attach cclms record modal */}
      {attachModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={() => setAttachModal(false)}>
          <form onSubmit={attachRecord} className="w-full max-w-sm rounded-lg border border-border bg-[var(--gc-card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 flex items-center justify-between text-base font-semibold">
              <span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-indigo-500" /> Attach Record</span>
              <X className="h-4 w-4 cursor-pointer" onClick={() => setAttachModal(false)} />
            </h2>
            <div className="space-y-3">
              <div><label className="text-xs text-muted">Record Type</label>
                <select name="attDoctype" className="gc-input mt-1 w-full">
                  {ATTACHABLE.filter((a) => a.doctype).map((a) => <option key={a.doctype} value={a.doctype}>{a.label}</option>)}
                </select></div>
              <div><label className="text-xs text-muted">Record Name</label>
                <input name="attName" className="gc-input mt-1 w-full" required placeholder="e.g. Lead-13-04-26-006153" /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="gc-btn gc-btn-ghost" onClick={() => setAttachModal(false)}>Cancel</button>
              <button type="submit" className="gc-btn gc-btn-primary">Attach</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
