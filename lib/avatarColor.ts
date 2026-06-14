// Deterministic gradient picker for employee avatars/cards.
// The same employeeId always maps to the same gradient, so a person keeps
// their colour across the table, cards and dashboard.

import type { CSSProperties } from "react";

// Hex stop pairs (instead of Tailwind classes) so gradients render via inline
// styles — independent of Tailwind's gradient-utility class generation.
const GRADIENTS: [string, string][] = [
  ["#8B5CF6", "#6D28D9"],
  ["#3B82F6", "#4338CA"],
  ["#10B981", "#0F766E"],
  ["#F97316", "#D97706"],
  ["#F43F5E", "#BE185D"],
  ["#06B6D4", "#0369A1"],
  ["#D946EF", "#9333EA"],
  ["#84CC16", "#15803D"],
  ["#EF4444", "#BE123C"],
  ["#6366F1", "#1D4ED8"],
  ["#EAB308", "#EA580C"],
  ["#14B8A6", "#0E7490"],
];

/** Stable string hash (djb2). */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Picks a deterministic hex stop pair for an employee id/key. */
export function gradientForId(id: string | number | undefined | null): [string, string] {
  const key = String(id ?? "?");
  return GRADIENTS[hashString(key) % GRADIENTS.length];
}

/** Inline-style gradient (135°) for an employee id/key. */
export function gradientStyle(id: string | number | undefined | null): CSSProperties {
  const [a, b] = gradientForId(id);
  return { backgroundImage: `linear-gradient(135deg, ${a}, ${b})` };
}

/** Up-to-2-character initials for an avatar bubble. */
export function initials(name: string | undefined | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
