// =====================================================
// Learnova API - server-side validation
// Each function returns an object like { title: "message" }.
// An empty object means the data is valid.
//   1. Course
//   2. Registration
// =====================================================
import { CATEGORIES, LEVELS, COURSE_STATUSES, DAYS, PAYMENTS } from "./seed.js";

const text = (v) => (typeof v === "string" ? v.trim() : "");
const isNumber = (v) => v !== "" && v !== null && !Number.isNaN(Number(v));


// 1. Course --------------------------------------------
// currentId is set when editing, so the course doesn't clash with itself
export function validateCourse(body, db, currentId = null) {
  const errors = {};
  const title = text(body.title);

  if (title.length < 3) errors.title = "Course name must be at least 3 characters.";
  else if (title.length > 80) errors.title = "Course name must be 80 characters or fewer.";
  else if (db.courses.some((c) => c.id !== currentId && c.title.toLowerCase() === title.toLowerCase())) {
    errors.title = "A course with this name already exists.";
  }

  if (!CATEGORIES.includes(body.category)) errors.category = "Please choose a category.";
  if (!LEVELS.includes(body.level)) errors.level = "Please choose a level.";
  if (!COURSE_STATUSES.includes(body.status)) errors.status = "Please choose a status.";

  const instructor = text(body.instructor);
  if (instructor.length < 3) errors.instructor = "Instructor name must be at least 3 characters.";
  else if (instructor.length > 60) errors.instructor = "Instructor name must be 60 characters or fewer.";

  const duration = Number(body.duration);
  if (!isNumber(body.duration) || duration < 1 || duration > 300) {
    errors.duration = "Duration must be between 1 and 300 hours.";
  }

  const price = Number(body.price);
  if (!isNumber(body.price) || price < 0 || price > 10000) errors.price = "Price must be 0 or more.";

  const seats = Number(body.seats);
  if (!isNumber(body.seats) || !Number.isInteger(seats) || seats < 0 || seats > 500) {
    errors.seats = "Seats must be a whole number from 0 to 500.";
  }

  const days = Array.isArray(body.days) ? body.days : [];
  if (days.length === 0 || !days.every((d) => DAYS.includes(d))) errors.days = "Choose at least one day.";

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text(body.time))) errors.time = "Choose a start time (HH:MM).";

  return errors;
}

// Clean course object built only from the allowed fields
export function cleanCourse(body) {
  return {
    title: text(body.title),
    category: body.category,
    level: body.level,
    instructor: text(body.instructor),
    duration: Number(body.duration),
    price: Math.round(Number(body.price) * 100) / 100,
    seats: Number(body.seats),
    days: DAYS.filter((d) => body.days.includes(d)), // keep Mon..Sun order, no duplicates
    time: text(body.time),
    status: body.status,
  };
}


// 2. Registration --------------------------------------
// Lebanese numbers: 7 or 8 digits after +961 (we accept "+961 71 234 567" too)
export function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("961") && digits.length > 8) digits = digits.slice(3);
  return digits;
}

export function validateRegistration(body) {
  const errors = {};

  const name = text(body.name);
  if (name.length < 3) errors.name = "Full name must be at least 3 characters.";
  else if (name.length > 60) errors.name = "Full name must be 60 characters or fewer.";

  const email = text(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || email.length > 100) {
    errors.email = "Please enter a valid email address.";
  }

  if (!/^\d{7,8}$/.test(normalizePhone(body.phone))) {
    errors.phone = "Enter a Lebanese number with 7 or 8 digits.";
  }

  if (text(body.occupation).length > 40) errors.occupation = "Occupation is too long.";

  if (!Array.isArray(body.courseIds) || body.courseIds.length === 0) {
    errors.courseIds = "Choose at least one course.";
  } else if (body.courseIds.length > 10 || !body.courseIds.every((id) => typeof id === "string")) {
    errors.courseIds = "Invalid course list.";
  }

  if (!PAYMENTS.includes(body.payment)) errors.payment = "Please choose a payment method.";

  return errors;
}
