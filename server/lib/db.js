// =====================================================
// Learnova API - JSON file storage
//   1. Read / write / reset data/db.json
//   2. Seat helpers
//   3. Small helpers (titles, IDs, conflicts)
// =====================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_COURSES } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const freshData = () => ({
  courses: structuredClone(DEFAULT_COURSES),
  registrations: [],
});


// 1. Read / write / reset ------------------------------
// The file is created automatically with the default courses.
export function readDB() {
  if (!fs.existsSync(DB_FILE)) return resetDB();
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      courses: Array.isArray(data.courses) ? data.courses : [],
      registrations: Array.isArray(data.registrations) ? data.registrations : [],
    };
  } catch (err) {
    // A broken file would stop the whole API, so keep a copy and start fresh
    fs.copyFileSync(DB_FILE, DB_FILE + ".broken");
    console.error("db.json could not be read, a copy was saved as db.json.broken");
    return resetDB();
  }
}

// Writes to a temporary file first, then renames it, so a crash
// in the middle of writing can't leave a half-written db.json
export function writeDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function resetDB() {
  const db = freshData();
  writeDB(db);
  return db;
}


// 2. Seat helpers --------------------------------------
// A seat is taken by every registration that is not Rejected.
// ignoreRegId lets us leave one registration out (used when changing its status).
export function enrolledCount(db, courseId, ignoreRegId = null) {
  return db.registrations.filter((r) =>
    r.id !== ignoreRegId && r.status !== "Rejected" && r.courseIds.includes(courseId)
  ).length;
}

// Course + how many seats are used / left
export function withSeats(course, db) {
  const enrolled = enrolledCount(db, course.id);
  return { ...course, enrolled, seatsLeft: Math.max(course.seats - enrolled, 0) };
}


// 3. Small helpers -------------------------------------
export function courseTitle(id, db) {
  const course = db.courses.find((c) => c.id === id);
  return course ? course.title : "Deleted course";
}

// Registration + the titles of its courses, ready to send to the browser
export function withCourseTitles(reg, db) {
  return { ...reg, courses: reg.courseIds.map((id) => ({ id, title: courseTitle(id, db) })) };
}

// "LRN-1234", never reusing an existing ID
export function newRegistrationId(db) {
  let id;
  do {
    id = "LRN-" + Math.floor(1000 + Math.random() * 9000);
  } while (db.registrations.some((r) => r.id === id));
  return id;
}

// True if two of the courses meet on the same day at the same time
export function hasConflict(courses) {
  return findConflicts(courses).length > 0;
}

export function findConflicts(courses) {
  const pairs = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i];
      const b = courses[j];
      if (a.time === b.time && a.days.some((d) => b.days.includes(d))) pairs.push([a, b]);
    }
  }
  return pairs;
}
