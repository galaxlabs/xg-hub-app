import type { PortalTheme } from "./api";

/** Convert a #rrggbb hex color to a Tailwind-style HSL triplet "H S% L%". */
export function hexToHslTriplet(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      default: hh = (r - g) / d + 4;
    }
    hh *= 60;
  }
  return `${Math.round(hh)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Build a CSSProperties object of design-token vars from a backend theme. */
export function themeStyleVars(theme: PortalTheme): Record<string, string> {
  const primary = theme.primary;
  const secondary = theme.secondary;
  return {
    // Tailwind HSL triplet vars (utilities: bg-card, text-muted, border-border, text-primary …)
    "--bg": hexToHslTriplet(theme.workspace),
    "--surface": hexToHslTriplet(theme.surface),
    "--card": hexToHslTriplet(theme.card),
    "--text": hexToHslTriplet(theme.text),
    "--muted": hexToHslTriplet(theme.muted),
    "--primary": hexToHslTriplet(primary),
    "--accent": hexToHslTriplet(secondary),
    "--border": hexToHslTriplet(theme.border),
    "--border-strong": hexToHslTriplet(theme.border),
    "--primary-fore": hexToHslTriplet(theme.sidebar_text),

    // Legacy gc-* vars (used via bg-[var(--gc-*)] / text-[var(--gc-*)]).
    "--gc-bg": theme.workspace,
    "--gc-surface": theme.surface,
    "--gc-card": theme.card,
    "--gc-text": theme.text,
    "--gc-muted": theme.muted,
    "--gc-border": theme.border,
    "--gc-sidebar": theme.sidebar,
    "--gc-sidebar-border": theme.sidebar_border,
    "--gc-sidebar-primary": theme.sidebar_primary,
    "--gc-sidebar-primary-text": theme.sidebar_text,
    "--gc-primary-strong": primary,
    "--gc-secondary": secondary,
  };
}
