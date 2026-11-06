// =====================================================
// /api/courses
//   1. GET    /          list (public), ?status=Active
//   2. POST   /          add (admin)
//   3. PUT    /:id       edit (admin)
//   4. DELETE /:id       delete (admin)
// =====================================================
import { Router } from "express";
import { readDB, writeDB, withSeats, enrolledCount } from "../lib/db.js";
import { validateCourse, cleanCourse } from "../lib/validate.js";
import { CATEGORY_STYLE, COURSE_STATUSES } from "../lib/seed.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// "Node.js & Express" -> "node-js-express" (plus -2, -3... if taken)
function makeCourseId(title, db) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
  let id = base;
  for (let n = 2; db.courses.some((c) => c.id === id); n++) id = `${base}-${n}`;
  return id;
}


// 1. List ----------------------------------------------
router.get("/", (req, res) => {
  const db = readDB();
  const { status } = req.query;
  if (status && !COURSE_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${COURSE_STATUSES.join(", ")}.` });
  }
  const list = status ? db.courses.filter((c) => c.status === status) : db.courses;
  res.json(list.map((c) => withSeats(c, db)));
});


// 2. Add -----------------------------------------------
router.post("/", requireAdmin, (req, res) => {
  const db = readDB();
  const body = req.body || {};
  const errors = validateCourse(body, db);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Please fix the highlighted fields.", errors });
  }

  const data = cleanCourse(body);
  const course = { id: makeCourseId(data.title, db), ...data, ...CATEGORY_STYLE[data.category] };
  db.courses.push(course);
  writeDB(db);
  res.status(201).json(withSeats(course, db));
});


// 3. Edit ----------------------------------------------
router.put("/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const index = db.courses.findIndex((c) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Course not found." });

  const old = db.courses[index];
  const body = req.body || {};
  const errors = validateCourse(body, db, old.id);

  // Seats can't go below the students already enrolled
  const enrolled = enrolledCount(db, old.id);
  if (!errors.seats && Number(body.seats) < enrolled) {
    errors.seats = `${enrolled} student${enrolled === 1 ? " is" : "s are"} already enrolled, so seats can't be lower than ${enrolled}.`;
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Please fix the highlighted fields.", errors });
  }

  const data = cleanCourse(body);
  // Icon + gradient only change when the category changes
  const style = data.category !== old.category ? CATEGORY_STYLE[data.category] : { icon: old.icon, gradient: old.gradient };
  db.courses[index] = { ...old, ...data, ...style, id: old.id };
  writeDB(db);
  res.json(withSeats(db.courses[index], db));
});


// 4. Delete --------------------------------------------
router.delete("/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const course = db.courses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found." });

  const used = db.registrations.filter((r) => r.courseIds.includes(course.id)).length;
  if (used > 0) {
    return res.status(409).json({
      message: `${course.title} has ${used} registration${used === 1 ? "" : "s"}. Set its status to Archived instead.`,
    });
  }
  db.courses = db.courses.filter((c) => c.id !== course.id);
  writeDB(db);
  res.json({ message: `${course.title} was deleted.` });
});

export default router;
