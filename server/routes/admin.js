// =====================================================
// /api/admin (admin) - demo data tools
//   POST /sample   add 14 sample registrations
//   POST /reset    back to the default courses, no registrations
// =====================================================
import { Router } from "express";
import { readDB, writeDB, resetDB, enrolledCount, newRegistrationId, hasConflict } from "../lib/db.js";
import { makeSampleRegistrations } from "../lib/seed.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/sample", requireAdmin, (req, res) => {
  const db = readDB();
  const created = makeSampleRegistrations(db, { enrolledCount, newRegistrationId, hasConflict });
  writeDB(db);
  res.status(201).json({ message: `${created.length} sample registrations added.`, count: created.length });
});

router.post("/reset", requireAdmin, (req, res) => {
  resetDB();
  res.json({ message: "All data was reset to the defaults." });
});

export default router;
