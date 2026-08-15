import { useEffect, useState } from "react";
import { User, Save, Check, Moon, Sun } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";

export default function SettingsPage() {
  const session = useDashboardSession();
  const user = session?.user || "Guest";

  const [fullName, setFullName] = useState(session?.full_name || "");
  const [email, setEmail] = useState(user === "Guest" ? "" : user);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("gc-theme") === "dark" ? "dark" : "light");

  useEffect(() => { setFullName(session?.full_name || ""); setEmail(session?.user || ""); }, [session]);

  function applyTheme(t: "dark" | "light") {
    setTheme(t);
    localStorage.setItem("gc-theme", t);
    window.dispatchEvent(new Event("gc-theme-change"));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (user === "Guest") return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await callFrappe("frappe.client.set_value", {
        doctype: "User",
        name: user,
        fieldname: "full_name",
        value: fullName,
      });
      if (password) {
        await callFrappe("frappe.client.set_value", {
          doctype: "User",
          name: user,
          fieldname: "new_password",
          value: password,
        });
        setPassword("");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Profile is not updatable. Contact Admin.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (fullName || user).substring(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Manage your profile and appearance.</p>
      </div>

      <div className="max-w-lg space-y-5">
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold"><User className="h-4 w-4" /> Profile</h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs text-muted">Full Name</label>
              <input className="gc-input mt-1 w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted">Email / Login</label>
              <input className="gc-input mt-1 w-full" value={email} disabled />
            </div>
            <div>
              <label className="text-xs text-muted">New Password</label>
              <input type="password" className="gc-input mt-1 w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

            <button type="submit" className="gc-btn gc-btn-primary w-full justify-center" disabled={saving || user === "Guest"}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
            {saved && <div className="text-center text-xs text-green-600">Profile updated.</div>}
          </form>
        </div>

        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-5">
          <h3 className="mb-4 text-[15px] font-semibold">Appearance</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => applyTheme("dark")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${theme === "dark" ? "border-indigo-500" : "border-border"}`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              type="button"
              onClick={() => applyTheme("light")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${theme === "light" ? "border-indigo-500" : "border-border"}`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
