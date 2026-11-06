// =====================================================
// Learnova API - default data and fixed lists
//   1. Fixed lists (categories, levels, statuses...)
//   2. Default courses
//   3. Sample registrations (demo data for the admin)
// =====================================================


// 1. Fixed lists ---------------------------------------
// Default icon + gradient for each category (used for new courses)
export const CATEGORY_STYLE = {
  Web: { icon: "bi-code-slash", gradient: "g1" },
  Mobile: { icon: "bi-phone", gradient: "g4" },
  Data: { icon: "bi-database", gradient: "g7" },
  Design: { icon: "bi-palette", gradient: "g6" },
  Security: { icon: "bi-shield-lock", gradient: "g8" },
};
export const CATEGORIES = Object.keys(CATEGORY_STYLE);
export const LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const COURSE_STATUSES = ["Active", "Draft", "Archived"];
export const REG_STATUSES = ["Pending", "Approved", "Rejected"];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const PAYMENTS = ["Card", "Whish", "OMT", "Cash"];
export const PROMO_CODES = { LEARN10: 10, STUDENT20: 20 }; // code -> % off


// 2. Default courses -----------------------------------
// React and Python meet at the same day + time, so they conflict.
// Cybersecurity is full (0 seats). Machine Learning is a Draft.
export const DEFAULT_COURSES = [
  {
    id: "web-dev", title: "Web Development Bootcamp", category: "Web", icon: "bi-code-slash", gradient: "g1",
    level: "Beginner", duration: 40, price: 49, seats: 20, instructor: "Sara Haddad",
    days: ["Mon", "Wed"], time: "17:00", status: "Active",
  },
  {
    id: "react", title: "React from Zero", category: "Web", icon: "bi-filetype-jsx", gradient: "g2",
    level: "Intermediate", duration: 24, price: 39, seats: 5, instructor: "Omar Khalil",
    days: ["Tue", "Thu"], time: "18:00", status: "Active",
  },
  {
    id: "node", title: "Node.js & Express APIs", category: "Web", icon: "bi-hdd-network", gradient: "g3",
    level: "Intermediate", duration: 20, price: 39, seats: 12, instructor: "Omar Khalil",
    days: ["Sat"], time: "10:00", status: "Active",
  },
  {
    id: "flutter", title: "Flutter Mobile Apps", category: "Mobile", icon: "bi-phone", gradient: "g4",
    level: "Beginner", duration: 30, price: 45, seats: 3, instructor: "Lina Saab",
    days: ["Mon", "Wed"], time: "19:00", status: "Active",
  },
  {
    id: "python", title: "Python Programming", category: "Data", icon: "bi-filetype-py", gradient: "g5",
    level: "Beginner", duration: 18, price: 29, seats: 15, instructor: "Karim Nader",
    days: ["Tue", "Thu"], time: "18:00", status: "Active",
  },
  {
    id: "uiux", title: "UI/UX Design Basics", category: "Design", icon: "bi-palette", gradient: "g6",
    level: "Beginner", duration: 15, price: 29, seats: 10, instructor: "Lina Saab",
    days: ["Fri"], time: "16:00", status: "Active",
  },
  {
    id: "sql", title: "Databases & SQL", category: "Data", icon: "bi-database", gradient: "g7",
    level: "Beginner", duration: 16, price: 29, seats: 8, instructor: "Karim Nader",
    days: ["Sat"], time: "13:00", status: "Active",
  },
  {
    id: "security", title: "Cybersecurity Essentials", category: "Security", icon: "bi-shield-lock", gradient: "g8",
    level: "Intermediate", duration: 22, price: 45, seats: 0, instructor: "Sara Haddad",
    days: ["Sun"], time: "11:00", status: "Active",
  },
  {
    id: "ml-basics", title: "Machine Learning Basics", category: "Data", icon: "bi-cpu", gradient: "g2",
    level: "Advanced", duration: 28, price: 59, seats: 12, instructor: "Karim Nader",
    days: ["Sun"], time: "14:00", status: "Draft",
  },
];


// 3. Sample registrations ------------------------------
const SAMPLE_STUDENTS = [
  { name: "Rana Khoury", email: "rana.khoury@example.com", phone: "71234567", occupation: "University student" },
  { name: "Ali Mansour", email: "ali.mansour@example.com", phone: "3456789", occupation: "Employed" },
  { name: "Jana Saad", email: "jana.saad@example.com", phone: "76543210", occupation: "University student" },
  { name: "Hadi Fares", email: "hadi.fares@example.com", phone: "70112233", occupation: "Freelancer" },
  { name: "Maya Haddad", email: "maya.haddad@example.com", phone: "81445566", occupation: "School student" },
  { name: "Karim Aoun", email: "karim.aoun@example.com", phone: "78990011", occupation: "Employed" },
  { name: "Lea Nassar", email: "lea.nassar@example.com", phone: "3221144", occupation: "University student" },
  { name: "Omar Daher", email: "omar.daher@example.com", phone: "71667788", occupation: "Other" },
];
const SAMPLE_STATUSES = ["Approved", "Pending", "Approved", "Rejected", "Pending", "Approved", "Approved"];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Builds 14 registrations. "helpers" comes from db.js so the sample data
// respects seats, conflicts and unique IDs, just like real registrations.
export function makeSampleRegistrations(db, helpers) {
  const { enrolledCount, newRegistrationId, hasConflict } = helpers;
  const created = [];

  for (let i = 0; i < 14; i++) {
    const student = SAMPLE_STUDENTS[i % SAMPLE_STUDENTS.length];
    const status = SAMPLE_STATUSES[i % SAMPLE_STATUSES.length];

    // 1 or 2 Active courses with a free seat and no time clash
    const wanted = Math.random() < 0.35 ? 2 : 1;
    const chosen = [];
    const options = db.courses
      .filter((c) => c.status === "Active")
      .sort(() => Math.random() - 0.5);
    for (const course of options) {
      if (chosen.length === wanted) break;
      const hasSeat = status === "Rejected" || enrolledCount(db, course.id) < course.seats;
      if (hasSeat && !hasConflict([...chosen, course])) chosen.push(course);
    }
    if (chosen.length === 0) continue; // every course is full

    // A date in the last 14 days
    const date = new Date(Date.now() - Math.random() * 14 * 86400000);
    const subtotal = chosen.reduce((sum, c) => sum + c.price, 0);
    const promo = i % 4 === 0 ? "LEARN10" : null;
    const discount = promo ? Math.round(subtotal * PROMO_CODES[promo]) / 100 : 0;

    const registration = {
      id: newRegistrationId(db),
      name: student.name,
      email: student.email,
      phone: "+961 " + student.phone,
      occupation: student.occupation,
      courseIds: chosen.map((c) => c.id),
      payment: pick(PAYMENTS),
      promo,
      subtotal,
      discount,
      total: subtotal - discount,
      date: date.toISOString(),
      status,
    };
    db.registrations.push(registration); // push now so the next seat check sees it
    created.push(registration);
  }
  return created;
}
