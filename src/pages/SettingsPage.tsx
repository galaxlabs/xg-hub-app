import { useEffect, useState } from "react";
import { User, Save, Check, Moon, Sun, Lock, Palette, Loader2 } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";

const THEMES = [
  { id: "dark", label: "Dark", swatch: "#111111", dark: true },
  { id: "light", label: "Light", swatch: "#ffffff", dark: false },
  { id: "lavender", label: "Lavender", swatch: "#9c6fd6", dark: true },
  { id: "pink", label: "Baby Pink", swatch: "#ec6fa3", dark: true },
  { id: "ocean", label: "Ocean Blue", swatch: "#1e88c7", dark: true },
  { id: "slate", label: "Slate", swatch: "#1e2530", dark: true },
];

export default function SettingsPage() {
  const session = useDashboardSession();
  const user = session?.user || "Guest";

  const [fullName, setFullName] = useState(session?.full_name || "");
  const [email, setEmail] = useState(user === "Guest" ? "" : user);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const [theme, setTheme] = useState(() => localStorage.getItem("gc-theme") || "dark");

  useEffect(() => { setFullName(session?.full_name || ""); setEmail(session?.user || ""); }, [session]);

  function applyTheme(t: string) {
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
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Profile is not updatable. Contact Admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (user === "Guest") return;
    if (!oldPassword) { setPwError("Enter your current password"); return; }
    if (newPassword.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPwError("New password and confirmation do not match"); return; }
    setPwSaving(true);
    try {
      await callFrappe("frappe.core.doctype.user.user.update_password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPwSaved(true);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 4000);
    } catch (err: any) {
      setPwError(err.message || "Could not change password. Check your current password.");
    } finally {
      setPwSaving(false);
    }
  }

  const initials = (fullName || user).substring(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Manage your profile, password and appearance.</p>
      </div>

      <div className="max-w-lg space-y-5">
        {/* Profile */}
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
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <button type="submit" className="gc-btn gc-btn-primary w-full justify-center" disabled={saving || user === "Guest"}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold"><Lock className="h-4 w-4" /> Change Password</h3>
          <form onSubmit={handlePassword} className="space-y-3">
            <div>
              <label className="text-xs text-muted">Current Password</label>
              <input type="password" className="gc-input mt-1 w-full" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div>
              <label className="text-xs text-muted">New Password</label>
              <input type="password" className="gc-input mt-1 w-full" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <label className="text-xs text-muted">Confirm New Password</label>
              <input type="password" className="gc-input mt-1 w-full" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
            {pwError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{pwError}</div>}
            {pwSaved && <div className="text-center text-xs text-green-600">Password changed.</div>}
            <button type="submit" className="gc-btn gc-btn-primary w-full justify-center" disabled={pwSaving || user === "Guest"}>
              {pwSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Changing...</> : <><Lock className="h-4 w-4" /> Change Password</>}
            </button>
          </form>
        </div>

        {/* Appearance */}
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold"><Palette className="h-4 w-4" /> Appearance</h3>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTheme(t.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${theme === t.id ? "border-indigo-500" : "border-border hover:border-foreground/30"}`}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: t.dark ? t.swatch : t.swatch, border: "1px solid rgba(0,0,0,0.15)" }}>
                  {t.id === "dark" ? <Moon className="h-4 w-4" style={{ color: "#ddd" }} /> : t.id === "light" ? <Sun className="h-4 w-4" /> : null}
                </div>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
