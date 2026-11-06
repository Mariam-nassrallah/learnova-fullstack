// =====================================================
// /api/registrations
//   Public (website)
//   1. POST   /                 register
//   2. GET    /promo/:code      check a promo code
//   3. GET    /mine?ids=...     registrations made from this browser
//   4. DELETE /:id/cancel       cancel (Pending only)
//   Admin
//   5. GET    /                 all registrations
//   6. PATCH  /:id/status       approve / reject / back to pending
//   7. DELETE /:id              delete
// =====================================================
import { Router } from "express";
import { readDB, writeDB, enrolledCount, newRegistrationId, withCourseTitles, findConflicts } from "../lib/db.js";
import { validateRegistration, normalizePhone } from "../lib/validate.js";
import { PROMO_CODES, REG_STATUSES } from "../lib/seed.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
const newestFirst = (a, b) => new Date(b.date) - new Date(a.date);


// 1. Register ------------------------------------------
router.post("/", (req, res) => {
  const db = readDB();
  const body = req.body || {};
  const errors = validateRegistration(body);

  // Promo code is optional, but if sent it must exist
  const promoCode = typeof body.promo === "string" ? body.promo.trim().toUpperCase() : "";
  if (promoCode && !PROMO_CODES[promoCode]) errors.promo = `"${promoCode}" is not a valid promo code.`;

  if (Object.keys(errors).length) {
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }

  // Every course must exist, be Active and have a free seat
  const ids = [...new Set(body.courseIds)];
  const courses = [];
  for (const id of ids) {
    const course = db.courses.find((c) => c.id === id);
    if (!course || course.status !== "Active") {
      return res.status(400).json({ message: "One of the selected courses is no longer available.", errors: { courseIds: "Unavailable course." } });
    }
    if (enrolledCount(db, id) >= course.seats) {
      return res.status(409).json({ message: `${course.title} is full. Please remove it.`, errors: { courseIds: "Course full." } });
    }
    courses.push(course);
  }

  // No two courses at the same day + time
  const conflicts = findConflicts(courses);
  if (conflicts.length) {
    const [a, b] = conflicts[0];
    return res.status(409).json({
      message: `${a.title} and ${b.title} meet at the same time. Remove one of them.`,
      errors: { courseIds: "Schedule conflict." },
    });
  }

  // The server calculates the price, never trusting the browser
  const subtotal = courses.reduce((sum, c) => sum + c.price, 0);
  const percent = promoCode ? PROMO_CODES[promoCode] : 0;
  const discount = Math.round(subtotal * percent) / 100;

  const registration = {
    id: newRegistrationId(db),
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: "+961 " + normalizePhone(body.phone),
    occupation: typeof body.occupation === "string" ? body.occupation.trim() : "",
    courseIds: ids,
    payment: body.payment,
    promo: promoCode || null,
    subtotal,
    discount,
    total: Math.round((subtotal - discount) * 100) / 100,
    date: new Date().toISOString(),
    status: "Pending",
  };
  db.registrations.push(registration);
  writeDB(db);
  res.status(201).json(withCourseTitles(registration, db));
});


// 2. Promo code ----------------------------------------
router.get("/promo/:code", (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  if (!PROMO_CODES[code]) return res.status(404).json({ message: `"${code}" is not a valid promo code.` });
  res.json({ code, percent: PROMO_CODES[code] });
});


// 3. This browser's registrations ----------------------
// The website keeps the IDs it created in localStorage and sends them here.
router.get("/mine", (req, res) => {
  const db = readDB();
  const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  const list = db.registrations.filter((r) => ids.includes(r.id)).sort(newestFirst);
  res.json(list.map((r) => withCourseTitles(r, db)));
});


// 4. Cancel (Pending only) -----------------------------
router.delete("/:id/cancel", (req, res) => {
  const db = readDB();
  const reg = db.registrations.find((r) => r.id === req.params.id);
  if (!reg) return res.status(404).json({ message: "Registration not found." });
  if (reg.status !== "Pending") {
    return res.status(409).json({ message: `This registration is ${reg.status} and can no longer be cancelled.` });
  }
  db.registrations = db.registrations.filter((r) => r.id !== reg.id);
  writeDB(db);
  res.json({ message: `Registration ${reg.id} cancelled.`, seatsReleased: reg.courseIds.length });
});


// 5. All registrations (admin) -------------------------
router.get("/", requireAdmin, (req, res) => {
  const db = readDB();
  res.json([...db.registrations].sort(newestFirst).map((r) => withCourseTitles(r, db)));
});


// 6. Change status (admin) -----------------------------
router.patch("/:id/status", requireAdmin, (req, res) => {
  const db = readDB();
  const reg = db.registrations.find((r) => r.id === req.params.id);
  if (!reg) return res.status(404).json({ message: "Registration not found." });

  const { status } = req.body || {};
  if (!REG_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${REG_STATUSES.join(", ")}.`, errors: { status: "Invalid status." } });
  }

  // A Rejected registration doesn't hold a seat, so moving it back needs a free one
  if (reg.status === "Rejected" && status !== "Rejected") {
    for (const id of reg.courseIds) {
      const course = db.courses.find((c) => c.id === id);
      if (course && enrolledCount(db, id, reg.id) >= course.seats) {
        return res.status(409).json({ message: `${course.title} has no seats left.` });
      }
    }
  }

  reg.status = status;
  writeDB(db);
  res.json(withCourseTitles(reg, db));
});


// 7. Delete (admin) ------------------------------------
router.delete("/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const reg = db.registrations.find((r) => r.id === req.params.id);
  if (!reg) return res.status(404).json({ message: "Registration not found." });
  db.registrations = db.registrations.filter((r) => r.id !== reg.id);
  writeDB(db);
  res.json({ message: `Registration ${reg.id} deleted.` });
});

export default router;
