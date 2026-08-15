import { useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface OpeningHourRow {
  weekday?: string;
  opening_time?: string;
  closing_time?: string;
  is_off?: boolean;
  total_hours?: number;
}

const DEFAULT_HOURS: OpeningHourRow[] = DAYS.map((day) => ({
  weekday: day,
  opening_time: "08:00",
  closing_time: "20:00",
  is_off: false,
  total_hours: 12,
}));

function calcTotal(open?: string, close?: string, off?: boolean): number | string {
  if (off) return "Off";
  if (!open || !close) return "-";
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  let minutes = ch * 60 + cm - (oh * 60 + om);
  if (minutes < 0) minutes += 24 * 60;
  return (minutes / 60).toFixed(2);
}

export default function BusinessHours({
  value,
  onChange,
  disabled,
}: {
  value?: OpeningHourRow[];
  onChange: (rows: OpeningHourRow[]) => void;
  disabled?: boolean;
}) {
  const hours: OpeningHourRow[] = value && value.length === 7 ? value : DEFAULT_HOURS;
  const [masterOpen, setMasterOpen] = useState("08:00");
  const [masterClose, setMasterClose] = useState("20:00");

  const applyToAllDays = () => {
    onChange(hours.map((h) => ({ ...h, opening_time: masterOpen, closing_time: masterClose, is_off: false, total_hours: Number(calcTotal(masterOpen, masterClose, false)) })));
  };

  const updateDay = (index: number, field: keyof OpeningHourRow, newValue: unknown) => {
    const updated = hours.map((h, i) => {
      if (i !== index) return h;
      const next = { ...h, [field]: newValue } as OpeningHourRow;
      next.total_hours = Number(calcTotal(next.opening_time, next.closing_time, next.is_off));
      return next;
    });
    onChange(updated);
  };

  const toggleOff = (index: number) => {
    const updated = hours.map((h, i) => {
      if (i !== index) return h;
      const next = { ...h, is_off: !h.is_off } as OpeningHourRow;
      next.total_hours = Number(calcTotal(next.opening_time, next.closing_time, next.is_off));
      return next;
    });
    onChange(updated);
  };

  return (
    <div style={{ padding: "12px", background: "rgba(0,0,0,0.02)", border: "1px solid hsl(var(--border))", borderRadius: "8px", marginTop: "10px" }}>
      <h3 style={{ fontSize: "13px", margin: "0 0 10px 0", color: "hsl(var(--primary))" }}>Business Hours</h3>

      {!disabled && (
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginBottom: "14px", padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "6px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "hsl(var(--muted))" }}>Set All: Opening</label>
            <input type="time" className="gc-input" value={masterOpen} onChange={(e) => setMasterOpen(e.target.value)} style={{ margin: 0 }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "hsl(var(--muted))" }}>Set All: Closing</label>
            <input type="time" className="gc-input" value={masterClose} onChange={(e) => setMasterClose(e.target.value)} style={{ margin: 0 }} />
          </div>
          <button type="button" className="gc-btn gc-btn-primary" onClick={applyToAllDays} style={{ height: "34px" }}>
            Apply to All Days
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.7fr 0.6fr", gap: "8px", fontSize: "11px", color: "hsl(var(--muted))", fontWeight: 600 }}>
          <div>Weekday</div><div>Opening Time</div><div>Closing Time</div><div>Total Hours</div><div>Off</div>
        </div>
        {hours.map((h, index) => (
          <div key={h.weekday} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.7fr 0.6fr", gap: "8px", alignItems: "center" }}>
            <div style={{ fontSize: "13px" }}>{h.weekday}</div>
            {h.is_off ? (
              <div className="gc-input" style={{ margin: 0, display: "flex", alignItems: "center", color: "hsl(var(--muted))" }}>—</div>
            ) : (
              <input type="time" className="gc-input" value={h.opening_time || ""} disabled={disabled} onChange={(e) => updateDay(index, "opening_time", e.target.value)} style={{ margin: 0 }} />
            )}
            {h.is_off ? (
              <div className="gc-input" style={{ margin: 0, display: "flex", alignItems: "center", color: "hsl(var(--muted))" }}>—</div>
            ) : (
              <input type="time" className="gc-input" value={h.closing_time || ""} disabled={disabled} onChange={(e) => updateDay(index, "closing_time", e.target.value)} style={{ margin: 0 }} />
            )}
            <div style={{ fontSize: "13px", color: "hsl(var(--muted))" }}>{h.total_hours ?? calcTotal(h.opening_time, h.closing_time, h.is_off)}</div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleOff(index)}
              className="gc-btn"
              style={{ padding: "6px", fontSize: "11px", background: h.is_off ? "hsl(var(--primary))" : "transparent", color: h.is_off ? "#fff" : "inherit" }}
            >
              Off
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
