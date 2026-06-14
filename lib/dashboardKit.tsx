// Minimal, dependency-free dashboard building blocks shared across the
// self-service / HR modules (leave, overtime, benefits, loans, expenses, …).
//
// Everything here is presentational (no hooks, no state) so it can be imported
// straight into "use client" pages without extra ceremony. The visual language
// matches the rest of the app: cardDark surfaces, gray-800 borders, rounded-2xl.

import type { ReactNode } from "react";

/** Format a number-ish value as Thai Baht (฿1,234). Non-numeric → ฿0. */
export function formatBaht(v: unknown): string {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return `฿${(Number.isFinite(n) ? n : 0).toLocaleString()}`;
}

/** Compact KPI card: tinted icon chip + label + value. */
export function Kpi({
  icon, tint, label, value, sub,
}: {
  icon: ReactNode;
  tint: string; // e.g. "bg-blue-500/10 text-blue-500"
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
      <div className={`p-3 rounded-xl shrink-0 ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-textMuted text-xs uppercase font-semibold truncate">{label}</p>
        <p className="text-2xl font-bold text-white truncate">{value}</p>
        {sub && <p className="text-[11px] text-textMuted truncate">{sub}</p>}
      </div>
    </div>
  );
}

export type Segment = { label: string; value: number; hex: string };

/** Pure-CSS donut (conic-gradient) with a centred total. */
export function Donut({ segments, total, centerLabel }: { segments: Segment[]; total: number; centerLabel?: string }) {
  let acc = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    if (total <= 0 || seg.value <= 0) continue;
    const start = (acc / total) * 100;
    acc += seg.value;
    const end = (acc / total) * 100;
    stops.push(`${seg.hex} ${start}% ${end}%`);
  }
  const background = stops.length ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#1f2937 0 100%)";
  return (
    <div className="relative w-28 h-28 shrink-0">
      <div className="w-full h-full rounded-full" style={{ background }} />
      <div className="absolute inset-[14px] rounded-full bg-cardDark flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white leading-none">{total.toLocaleString()}</span>
        {centerLabel && <span className="text-[10px] text-textMuted mt-0.5">{centerLabel}</span>}
      </div>
    </div>
  );
}

/**
 * A full distribution card: donut on the left, a labelled progress-bar
 * breakdown on the right. `valueFormat` controls how the per-row figure reads
 * (count by default, or e.g. formatBaht for money).
 */
export function DonutPanel({
  title, subtitle, segments, centerLabel, className = "", valueFormat,
}: {
  title: string;
  subtitle?: string;
  segments: Segment[];
  centerLabel?: string;
  className?: string;
  valueFormat?: (v: number) => string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const fmt = valueFormat ?? ((v: number) => v.toLocaleString());
  return (
    <div className={`bg-cardDark border border-gray-800 rounded-2xl p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      {subtitle && <p className="text-textMuted text-xs mb-5">{subtitle}</p>}
      <div className="flex items-center gap-6">
        <Donut segments={segments} total={total} centerLabel={centerLabel} />
        <div className="space-y-3 flex-1 min-w-0">
          {segments.length === 0 ? (
            <p className="text-textMuted text-xs italic">ยังไม่มีข้อมูล</p>
          ) : (
            segments.map((seg) => {
              const pct = total ? Math.round((seg.value / total) * 100) : 0;
              return (
                <div key={seg.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 text-textMuted truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.hex }} />
                      {seg.label}
                    </span>
                    <span className="text-white font-semibold shrink-0">{fmt(seg.value)} <span className="text-textMuted font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: seg.hex }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/** Standard status pill used by request-style records. */
const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-brandGreen/10 text-brandGreen",
  Active: "bg-brandGreen/10 text-brandGreen",
  Pending: "bg-brandOrange/10 text-brandOrange",
  Rejected: "bg-brandRed/10 text-brandRed",
  Inactive: "bg-gray-700/50 text-gray-400",
  Closed: "bg-gray-700/50 text-gray-400",
};

export function StatusPill({ status }: { status?: string }) {
  const cls = STATUS_STYLE[status ?? ""] ?? "bg-gray-700/50 text-gray-400";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${cls}`}>
      {status?.toUpperCase() || "UNKNOWN"}
    </span>
  );
}

// Shared status palette for donuts.
export const STATUS_HEX = {
  Approved: "#10b981",
  Active: "#10b981",
  Pending: "#f59e0b",
  Rejected: "#ef4444",
  Inactive: "#6b7280",
} as const;
