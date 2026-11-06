// =====================================================
// /api/stats (admin) - everything the dashboard needs in one call
// =====================================================
import { Router } from "express";
import { readDB, enrolledCount, withCourseTitles } from "../lib/db.js";
import { REG_STATUSES } from "../lib/seed.js";
import { requireAdmin } from "../middleware/auth.js";
import { buildStudents } from "./students.js";

const router = Router();

// "2026-11-04" in the server's local time
const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

router.get("/", requireAdmin, (req, res) => {
  const db = readDB();
  const regs = db.registrations;

  // Count per status: { Pending: 3, Approved: 8, Rejected: 1 }
  const statusCounts = Object.fromEntries(REG_STATUSES.map((s) => [s, regs.filter((r) => r.status === s).length]));

  // Registrations per day for the last 7 days (oldest -> today)
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = dayKey(day);
    last7.push({
      date: key,
      label: day.toLocaleDateString("en-GB", { weekday: "short" }),
      count: regs.filter((r) => dayKey(r.date) === key).length,
    });
  }

  // Top 5 courses by seats taken
  const popular = db.courses
    .map((c) => ({ id: c.id, title: c.title, icon: c.icon, gradient: c.gradient, seats: c.seats, enrolled: enrolledCount(db, c.id) }))
    .filter((c) => c.enrolled > 0)
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 5);

  const recent = [...regs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
    .map((r) => withCourseTitles(r, db));

  const revenue = regs.filter((r) => r.status === "Approved").reduce((sum, r) => sum + r.total, 0);

  res.json({
    totalCourses: db.courses.length,
    activeCourses: db.courses.filter((c) => c.status === "Active").length,
    totalStudents: buildStudents(db).length,
    totalRegistrations: regs.length,
    revenue: Math.round(revenue * 100) / 100,
    statusCounts,
    last7,
    popular,
    recent,
  });
});

export default router;
