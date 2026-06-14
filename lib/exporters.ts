// Lightweight client-side exporters — no external dependencies.
// CSV: real comma-separated file.
// Excel: an HTML <table> served with an .xls extension; Excel opens it natively.
// PDF: opens a styled print window and triggers the browser's "Save as PDF".

type Row = Record<string, any>;

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: any): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportCsv(rows: Row[], columns: { key: string; label: string }[], filename = "export.csv") {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsv(r[c.key])).join(",")).join("\n");
  downloadBlob(`${header}\n${body}`, filename, "text/csv;charset=utf-8;");
}

export function exportExcel(rows: Row[], columns: { key: string; label: string }[], filename = "export.xls") {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head>
<body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  downloadBlob(html, filename, "application/vnd.ms-excel;charset=utf-8;");
}

/** Opens a print window with a styled table; the user saves it as PDF. */
export function exportPdf(
  title: string,
  rows: Row[],
  columns: { key: string; label: string }[],
) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  printHtml(`<h1>${escapeHtml(title)}</h1>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
}

/** Generic PDF/print of arbitrary HTML body, wrapped in a clean A4 layout. */
export function printHtml(bodyHtml: string, title = "HR Pro Suite") {
  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    * { font-family: 'Sarabun', 'Segoe UI', Arial, sans-serif; }
    body { padding: 32px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    thead th { background: #f3f4f6; }
    tbody tr:nth-child(even) { background: #fafafa; }
    @media print { body { padding: 0; } }
  </style></head><body>
  ${bodyHtml}
  <div class="meta">สร้างเมื่อ ${new Date().toLocaleString("th-TH")} • HR Pro Suite</div>
  <script>window.onload = () => { window.print(); }</script>
  </body></html>`);
  win.document.close();
}
