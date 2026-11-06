// =====================================================
// Small helpers used across the admin
//   1. Formatting (money, dates, schedule)
//   2. Dates (days ago)
//   3. CSV export
// =====================================================

// 1. Formatting ----------------------------------------
export const money = (n) => "$" + Number(n || 0).toFixed(2);

// "4 Nov 2026"
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// "4 Nov 2026, 14:05"
export const formatDateTime = (iso) =>
  `${formatDate(iso)}, ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

// "Tue & Thu · 18:00"
export const schedule = (course) => `${course.days.join(" & ")} · ${course.time}`;


// 2. Dates ---------------------------------------------
export const daysAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;


// 3. CSV export ----------------------------------------
// Quotes every cell, and stops spreadsheet apps from running cells
// that start with = + - @ as formulas.
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCSV(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  // "﻿" makes Excel read accents and Arabic names correctly
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
