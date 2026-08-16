import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Search, Users, RefreshCw } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";

interface Contact { name: string; full_name?: string; user_image?: string | null; }
interface MessageRow { name: string; sender: string; receiver: string; message: string; is_read?: number; creation?: string; }

export default function ChatPage() {
  const session = useDashboardSession();
  const me = session?.user || "Guest";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(async () => {
    try {
      const rows = await callFrappe<Contact[]>("cclms.api.chat.list_contacts");
      setContacts(rows || []);
    } catch {}
  }, []);

  const loadMessages = useCallback(async (other: string) => {
    try {
      const rows = await callFrappe<MessageRow[]>("cclms.api.chat.get_conversation", { other_user: other });
      setMessages(rows || []);
      await callFrappe("cclms.api.chat.mark_read", { other_user: other }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => { void loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (!active) return;
    void loadMessages(active);
    const t = setInterval(() => void loadMessages(active), 5000);
    return () => clearInterval(t);
  }, [active, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !active) return;
    try {
      await callFrappe("cclms.api.chat.send_message", { receiver: active, message: text });
      setInput("");
      await loadMessages(active);
    } catch {}
  }

  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.full_name} ${c.name}`.toLowerCase().includes(q);
  });
  const activeContact = contacts.find((c) => c.name === active);
  const initials = (name?: string) => (name || "?").substring(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5 text-indigo-500" /> Team Chat</h1>
          <p className="text-sm text-muted">Message your colleagues</p>
        </div>
        <button className="gc-btn gc-btn-ghost" onClick={() => void loadContacts()} title="Refresh contacts"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        {/* Contact list */}
        <div className="flex flex-col rounded-lg border border-border bg-[var(--gc-card)]">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
              <input className="gc-input w-full pl-9" placeholder="Search people…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">No contacts.</div>
            ) : filtered.map((c) => (
              <button
                key={c.name}
                onClick={() => setActive(c.name)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active === c.name ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-muted/50"}`}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                  {c.user_image ? <img src={c.user_image} className="h-9 w-9 rounded-full object-cover" alt="" /> : initials(c.full_name || c.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.full_name || c.name}</div>
                  <div className="truncate text-xs text-muted">{c.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex flex-col rounded-lg border border-border bg-[var(--gc-card)]">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted">
              <Users className="h-10 w-10 opacity-20" />
              <div>Select a person to start chatting</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{initials(activeContact?.full_name || active)}</div>
                <div>
                  <div className="text-sm font-semibold">{activeContact?.full_name || active}</div>
                  <div className="text-xs text-muted">{active}</div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4" onMouseEnter={() => void loadMessages(active)}>
                {loading ? (
                  <div className="py-10 text-center text-sm text-muted">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted">No messages yet. Say hello!</div>
                ) : messages.map((m) => {
                  const mine = m.sender === me;
                  return (
                    <div key={m.name} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-indigo-500 text-white" : "bg-muted"}`}>
                        <div className="whitespace-pre-wrap break-words">{m.message}</div>
                        <div className={`mt-1 text-[10px] ${mine ? "text-indigo-100" : "text-muted"}`}>
                          {m.creation ? new Date(m.creation).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
                <input
                  className="gc-input flex-1"
                  placeholder="Type a message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="gc-btn gc-btn-primary" disabled={!input.trim()}><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
