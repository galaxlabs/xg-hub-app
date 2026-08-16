import { useEffect, useState } from "react";
import { User, Save, Check, Moon, Sun, Lock, Palette, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { callFrappe } from "../lib/frappe";
import { useDashboardSession } from "../lib/session";
import { fetchThemeConfig, hasPortalPin, setPortalPin } from "../lib/api";
import type { PortalTheme, TimezoneOption } from "../lib/api";
import { themeStyleVars } from "../lib/theme";

function getThemeKey() {
  const stored = localStorage.getItem("gc-theme-key");
  if (stored) return stored;
  const t = localStorage.getItem("gc-theme");
  const m = localStorage.getItem("gc-mode");
  if (t && t !== "dark" && t !== "light") return `${t}:${m === "light" ? "light" : "dark"}`;
  return `default:${m === "light" ? "light" : "dark"}`;
}

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

  const [pinHas, setPinHas] = useState(false);
  const [pinLoading, setPinLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    hasPortalPin()
      .then((r) => setPinHas(!!r.has_pin))
      .catch(() => {})
      .finally(() => setPinLoading(false));
  }, []);

  const [themeKey, setThemeKey] = useState(getThemeKey);
  const [themes, setThemes] = useState<PortalTheme[]>([]);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);

  useEffect(() => { setFullName(session?.full_name || ""); setEmail(session?.user || ""); }, [session]);

  useEffect(() => {
    fetchThemeConfig()
      .then((cfg) => { setThemes(cfg.themes || []); setTimezones(cfg.timezones || []); })
      .catch(() => {});
  }, []);

  const [accentId, mode] = themeKey.split(":") as [string, string];
  const darkMode = mode !== "light";

  function applyTheme(id: string, m: string) {
    setThemeKey(`${id}:${m}`);
    localStorage.setItem("gc-theme-key", `${id}:${m}`);
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

  async function handlePin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    if (user === "Guest") return;
    if (!/^\d{8}$/.test(pin)) { setPinError("PIN must be exactly 8 digits."); return; }
    if (pin !== confirmPin) { setPinError("PIN and confirmation do not match."); return; }
    setPinSaving(true);
    try {
      await setPortalPin(pin, confirmPin);
      setPinHas(true);
      setPinSaved(true);
      setPin(""); setConfirmPin("");
      setTimeout(() => setPinSaved(false), 4000);
    } catch (err: any) {
      setPinError(err.message || "Could not set PIN.");
    } finally {
      setPinSaving(false);
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

        {/* PIN code */}
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-5">
          <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold"><KeyRound className="h-4 w-4" /> PIN Code</h3>
          <p className="mb-4 text-xs text-muted">
            Set an 8-digit PIN to unlock the session lock screen instead of receiving an OTP.
          </p>
          {pinLoading ? (
            <p className="py-3 text-center text-xs text-muted">Checking…</p>
          ) : (
            <form onSubmit={handlePin} className="space-y-3">
              <div>
                <label className="text-xs text-muted">New PIN (8 digits)</label>
                <input
                  inputMode="numeric" pattern="\d{8}" maxLength={8} autoComplete="new-password"
                  className="gc-input mt-1 w-full tracking-widest" value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Confirm PIN</label>
                <input
                  inputMode="numeric" pattern="\d{8}" maxLength={8} autoComplete="new-password"
                  className="gc-input mt-1 w-full tracking-widest" value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••••"
                />
              </div>
              {pinError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{pinError}</div>}
              {pinSaved && <div className="text-center text-xs text-green-600">PIN saved — use it to unlock the session.</div>}
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                {pinHas ? "PIN is set. You can change it below." : "No PIN set yet — create one to enable PIN unlock."}
              </div>
              <button type="submit" className="gc-btn gc-btn-primary w-full justify-center" disabled={pinSaving || user === "Guest"}>
                {pinSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><KeyRound className="h-4 w-4" /> {pinHas ? "Change PIN" : "Set PIN"}</>}
              </button>
            </form>
          )}
        </div>

        {/* Appearance */}
        <div className="rounded-lg border border-border bg-[var(--gc-card)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold"><Palette className="h-4 w-4" /> Appearance</h3>

          {/* Mode: dark / light */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => applyTheme(accentId, "dark")}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${darkMode ? "border-indigo-500" : "border-border hover:border-foreground/30"}`}
            >
              <Moon className="h-4 w-4" /> Dark Mode
            </button>
            <button
              type="button"
              onClick={() => applyTheme(accentId, "light")}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${!darkMode ? "border-indigo-500" : "border-border hover:border-foreground/30"}`}
            >
              <Sun className="h-4 w-4" /> Light Mode
            </button>
          </div>

          {/* Backend-driven accent variants */}
          {themes.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted">Loading themes…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {themes
                .filter((t) => t.mode === (darkMode ? "dark" : "light"))
                .map((t) => {
                  const vars = themeStyleVars(t);
                  const active = accentId === t.id;
                  return (
                    <button
                      key={`${t.id}-${t.mode}`}
                      type="button"
                      onClick={() => applyTheme(t.id, t.mode)}
                      className={`overflow-hidden rounded-lg border text-left transition-colors ${active ? "border-indigo-500" : "border-border hover:border-foreground/30"}`}
                    >
                      {/* mini preview using the theme's actual colors */}
                      <div className="flex h-16" style={{ background: t.workspace }}>
                        <div className="w-1/3" style={{ background: t.sidebar }}>
                          <div className="m-2 h-3 w-3 rounded-sm" style={{ background: t.sidebar_primary }} />
                        </div>
                        <div className="flex-1 p-2">
                          <div className="mb-1 h-2 w-2/3 rounded-sm" style={{ background: t.primary }} />
                          <div className="mb-1 h-2 w-1/2 rounded-sm" style={{ background: t.secondary }} />
                          <div className="h-2 w-3/4 rounded-sm" style={{ background: t.border }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-xs font-medium">{t.label}</span>
                        <span className="flex gap-1">
                          <span className="h-3 w-3 rounded-full" style={{ background: t.primary, border: "1px solid rgba(0,0,0,0.15)" }} title={`Primary ${t.primary}`} />
                          <span className="h-3 w-3 rounded-full" style={{ background: t.secondary, border: "1px solid rgba(0,0,0,0.15)" }} title={`Secondary ${t.secondary}`} />
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
