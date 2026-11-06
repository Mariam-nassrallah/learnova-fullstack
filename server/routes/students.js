// =====================================================
// /api/students (admin)
// There is no separate students table: one student = one email,
// built from all the registrations that use that email.
// =====================================================
import { Router } from "express";
import { readDB, courseTitle } from "../lib/db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

export function buildStudents(db) {
  const byEmail = new Map();
  const oldestFirst = [...db.registrations].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const reg of oldestFirst) {
    const key = reg.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, { email: key, registrations: [], courseIds: [], spent: 0, firstDate: reg.date });
    }
    const student = byEmail.get(key);
    // Newer registrations overwrite the contact details (latest wins)
    student.name = reg.name;
    student.phone = reg.phone;
    student.occupation = reg.occupation || "";
    student.lastDate = reg.date;
    student.registrations.push({
      id: reg.id, date: reg.date, status: reg.status, total: reg.total, payment: reg.payment,
      courses: reg.courseIds.map((id) => ({ id, title: courseTitle(id, db) })),
    });
    for (const id of reg.courseIds) if (!student.courseIds.includes(id)) student.courseIds.push(id);
    if (reg.status === "Approved") student.spent += reg.total;
  }

  return [...byEmail.values()]
    .map((s) => ({
      ...s,
      spent: Math.round(s.spent * 100) / 100,
      registrations: s.registrations.reverse(), // newest first
      courses: s.courseIds.map((id) => ({ id, title: courseTitle(id, db) })),
    }))
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
}

router.get("/", requireAdmin, (req, res) => {
  res.json(buildStudents(readDB()));
});

export default router;
