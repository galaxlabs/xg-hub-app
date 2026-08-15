import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, Trash2, File, Download } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";

interface DocRow {
  name: string;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  owner?: string;
  creation?: string;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const session = useDashboardSession();
  const user = session?.user || "Guest";
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const rows = await callFrappe<DocRow[]>("frappe.client.get_list", {
        doctype: "File",
        fields: ["name", "file_name", "file_url", "file_size", "owner", "creation"],
        filters: [["attached_to_doctype", "=", "User"], ["attached_to_name", "=", user], ["is_folder", "=", 0]],
        order_by: "creation desc",
        limit_page_length: 100,
      });
      setDocs(rows || []);
    } catch (e: any) { setError(e.message || "Failed to load documents"); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("is_private", "0");
      body.append("attached_to_doctype", "User");
      body.append("attached_to_name", user);
      const res = await fetch("/api/method/frappe.handler.upload_file", {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t.slice(0, 120) || "Upload failed");
      }
      const data = await res.json();
      if (data?.message?.file_name) {
        setDocs([{ name: data.message.name, file_name: data.message.file_name, file_url: data.message.file_url, file_size: data.message.file_size, owner: user }, ...docs]);
      }
    } catch (err: any) { setError(err.message || "Could not connect to server."); }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(name: string) {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      await callFrappe("frappe.client.delete", { doctype: "File", name });
      setDocs(docs.filter((d) => d.name !== name));
    } catch (err: any) { setError(err.message || "Delete failed."); }
  }

  const fileUrl = (d: DocRow) => {
    const u = d.file_url || "";
    return u.startsWith("/") ? `/api/frappe${u}` : u;
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="text-sm text-muted">Documents can be opened and downloaded here.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
          <button className="gc-btn gc-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Import File"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="max-w-3xl space-y-2">
        {docs.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <div>No documents uploaded yet.</div>
          </div>
        ) : (
          docs.map((d) => (
            <div key={d.name} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[var(--gc-card)] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <File className="h-5 w-5 shrink-0 text-indigo-500" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted">{formatSize(d.file_size)} · {d.creation ? new Date(d.creation).toLocaleDateString() : ""}</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <a className="gc-btn gc-btn-ghost" href={fileUrl(d)} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /> Open</a>
                <button className="gc-btn gc-btn-ghost text-red-500" onClick={() => handleDelete(d.name)} title="Delete File"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
