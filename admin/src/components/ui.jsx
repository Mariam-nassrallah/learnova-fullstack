// =====================================================
// Small reusable UI pieces
//   StatusBadge, Avatar, StatCard (+ useCountUp), EmptyState,
//   Loading, SearchInput, CourseIcon
// =====================================================
import { useEffect, useState } from "react";

// Pending = yellow, Approved = green, Rejected = red
// (course statuses Active / Draft / Archived use the same component)
const STATUS_ICONS = {
  Pending: "bi-hourglass-split", Approved: "bi-check-circle-fill", Rejected: "bi-x-circle-fill",
  Active: "bi-circle-fill", Draft: "bi-pencil", Archived: "bi-archive",
};
export function StatusBadge({ status }) {
  return (
    <span className={`status-badge s-${String(status).toLowerCase()}`}>
      <i className={`bi ${STATUS_ICONS[status] || "bi-circle"}`}></i> {status}
    </span>
  );
}

// Initials in a circle. The same name always gets the same color.
const AVATAR_COLORS = ["#9E6899", "#BA88AE", "#C27AA6", "#8A5A8F", "#B07AA6", "#D39BBD", "#7D5079"];
export function Avatar({ name = "?", size = 38 }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, color: "#fff", fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}

// Animates a number from 0 up to "target" (ease-out, ~0.9s)
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function StatCard({ icon, label, value, color = "violet", hint }) {
  const shown = useCountUp(value);
  return (
    <div className="panel stat-card h-100">
      <div className={`stat-icon c-${color}`}><i className={`bi ${icon}`}></i></div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{shown}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "bi-inbox", title, text, children }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`}></i>
      <h6 className="mt-3 mb-1">{title}</h6>
      {text && <p className="text-muted-c small mb-3">{text}</p>}
      {children}
    </div>
  );
}

export function Loading({ text = "Loading..." }) {
  return (
    <div className="loading">
      <span className="spinner-border spinner-border-sm"></span> {text}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search...", label = "Search" }) {
  return (
    <div className="search-input">
      <i className="bi bi-search"></i>
      <input
        type="search"
        className="form-control"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Small gradient square with the course's Bootstrap Icon
export function CourseIcon({ course, size = 40 }) {
  return (
    <span className={`course-icon ${course.gradient || "g1"}`} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      <i className={`bi ${course.icon || "bi-journal"}`}></i>
    </span>
  );
}
