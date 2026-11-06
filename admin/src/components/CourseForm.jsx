// =====================================================
// CourseForm: the Add / Edit course modal
//   1. Empty form or pre-filled form (edit)
//   2. Validation (same rules as server/lib/validate.js)
//   3. Save -> POST /api/courses or PUT /api/courses/:id
// Errors show under each field; server errors also show in an alert.
// =====================================================
import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import { CATEGORIES, COURSE_STATUSES, DAYS, LEVELS } from "../constants.js";

// 1. Form values ---------------------------------------
const EMPTY = {
  title: "", category: "", level: "", instructor: "", duration: "", price: "",
  seats: "", days: [], time: "", status: "Active",
};

const toForm = (course) => (course ? {
  title: course.title, category: course.category, level: course.level, instructor: course.instructor,
  duration: String(course.duration), price: String(course.price), seats: String(course.seats),
  days: [...course.days], time: course.time, status: course.status,
} : EMPTY);


// 2. Validation ----------------------------------------
export function validateCourse(form, courses, editing) {
  const errors = {};
  const title = form.title.trim();
  const isNum = (v) => v !== "" && !Number.isNaN(Number(v));

  if (title.length < 3) errors.title = "Course name must be at least 3 characters.";
  else if (title.length > 80) errors.title = "Course name must be 80 characters or fewer.";
  else if (courses.some((c) => c.id !== editing?.id && c.title.toLowerCase() === title.toLowerCase())) {
    errors.title = "A course with this name already exists.";
  }
  if (!form.category) errors.category = "Please choose a category.";
  if (!form.level) errors.level = "Please choose a level.";
  if (!form.status) errors.status = "Please choose a status.";

  const instructor = form.instructor.trim();
  if (instructor.length < 3) errors.instructor = "Instructor name must be at least 3 characters.";

  const duration = Number(form.duration);
  if (!isNum(form.duration) || duration < 1 || duration > 300) errors.duration = "Duration must be between 1 and 300 hours.";

  if (!isNum(form.price) || Number(form.price) < 0) errors.price = "Price must be 0 or more.";

  const seats = Number(form.seats);
  if (!isNum(form.seats) || !Number.isInteger(seats) || seats < 0 || seats > 500) {
    errors.seats = "Seats must be a whole number from 0 to 500.";
  } else if (editing && seats < editing.enrolled) {
    errors.seats = `${editing.enrolled} students are already enrolled, so seats can't be lower than ${editing.enrolled}.`;
  }

  if (form.days.length === 0) errors.days = "Choose at least one day.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) errors.time = "Choose a start time.";
  return errors;
}


export default function CourseForm({ show, course, courses, onClose, onSaved }) {
  const showToast = useToast();
  const editing = course || null;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [alert, setAlert] = useState("");
  const [saving, setSaving] = useState(false);

  // Fresh form every time the modal opens
  useEffect(() => {
    if (!show) return;
    setForm(toForm(course));
    setErrors({});
    setSubmitted(false);
    setAlert("");
  }, [show, course]);

  // Re-validate while typing, but only after the first submit
  function update(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (submitted) setErrors(validateCourse(next, courses, editing));
  }

  function toggleDay(day) {
    const days = form.days.includes(day) ? form.days.filter((d) => d !== day) : [...form.days, day];
    update("days", DAYS.filter((d) => days.includes(d))); // keep Mon..Sun order
  }


  // 3. Save ----------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    const found = validateCourse(form, courses, editing);
    setErrors(found);
    if (Object.keys(found).length) {
      setAlert(`Please fix ${Object.keys(found).length} field${Object.keys(found).length === 1 ? "" : "s"} below.`);
      showToast("The course form has errors.", "error");
      return;
    }

    setSaving(true);
    setAlert("");
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        instructor: form.instructor.trim(),
        duration: Number(form.duration),
        price: Number(form.price),
        seats: Number(form.seats),
      };
      const saved = editing
        ? await api(`/courses/${encodeURIComponent(editing.id)}`, { method: "PUT", body })
        : await api("/courses", { method: "POST", body });
      onSaved(saved, editing ? "updated" : "added");
    } catch (err) {
      // Server-side errors (e.g. a duplicate name added in another tab)
      setErrors(err.errors || {});
      setAlert(err.message);
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const cls = (field, base = "form-control") => `${base} ${submitted ? (errors[field] ? "is-invalid" : "is-valid") : ""}`;
  const Feedback = ({ field }) => <div className="invalid-feedback">{errors[field]}</div>;

  return (
    <Modal show={show} onClose={onClose} size="modal-lg" labelId="courseFormTitle"
      title={editing ? <>Edit <span className="grad-text">{editing.title}</span></> : "Add a new course"}
      footer={<>
        <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
        <button type="submit" form="courseForm" className="btn btn-primary-grad" disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm"></span> Saving...</> : <><i className="bi bi-check2"></i> {editing ? "Save changes" : "Add course"}</>}
        </button>
      </>}>
      {alert && (
        <div className="alert alert-danger-soft d-flex gap-2 align-items-center" role="alert">
          <i className="bi bi-exclamation-octagon"></i> {alert}
        </div>
      )}

      <form id="courseForm" onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-md-8">
            <label htmlFor="cf-title" className="form-label">Course name</label>
            <input id="cf-title" className={cls("title")} value={form.title} placeholder="e.g. Vue.js Fundamentals"
              onChange={(e) => update("title", e.target.value)} />
            <Feedback field="title" />
          </div>
          <div className="col-md-4">
            <label htmlFor="cf-status" className="form-label">Status</label>
            <select id="cf-status" className={cls("status", "form-select")} value={form.status} onChange={(e) => update("status", e.target.value)}>
              {COURSE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Feedback field="status" />
          </div>

          <div className="col-md-4">
            <label htmlFor="cf-category" className="form-label">Category</label>
            <select id="cf-category" className={cls("category", "form-select")} value={form.category} onChange={(e) => update("category", e.target.value)}>
              <option value="">Choose...</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Feedback field="category" />
          </div>
          <div className="col-md-4">
            <label htmlFor="cf-level" className="form-label">Level</label>
            <select id="cf-level" className={cls("level", "form-select")} value={form.level} onChange={(e) => update("level", e.target.value)}>
              <option value="">Choose...</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <Feedback field="level" />
          </div>
          <div className="col-md-4">
            <label htmlFor="cf-instructor" className="form-label">Instructor</label>
            <input id="cf-instructor" className={cls("instructor")} value={form.instructor} placeholder="e.g. Sara Haddad"
              onChange={(e) => update("instructor", e.target.value)} />
            <Feedback field="instructor" />
          </div>

          <div className="col-4">
            <label htmlFor="cf-duration" className="form-label">Duration (hours)</label>
            <input id="cf-duration" type="number" min="1" max="300" className={cls("duration")} value={form.duration}
              onChange={(e) => update("duration", e.target.value)} />
            <Feedback field="duration" />
          </div>
          <div className="col-4">
            <label htmlFor="cf-price" className="form-label">Price ($)</label>
            <input id="cf-price" type="number" min="0" step="0.01" className={cls("price")} value={form.price}
              onChange={(e) => update("price", e.target.value)} />
            <Feedback field="price" />
          </div>
          <div className="col-4">
            <label htmlFor="cf-seats" className="form-label">Seats</label>
            <input id="cf-seats" type="number" min="0" max="500" step="1" className={cls("seats")} value={form.seats}
              onChange={(e) => update("seats", e.target.value)} />
            <Feedback field="seats" />
            {editing && editing.enrolled > 0 && !errors.seats && <div className="form-text">{editing.enrolled} already enrolled</div>}
          </div>

          <div className="col-md-8">
            <span className="form-label d-block" id="cf-days-label">Days</span>
            <div className={`day-chips ${submitted && errors.days ? "is-invalid" : ""}`} role="group" aria-labelledby="cf-days-label">
              {DAYS.map((day) => (
                <button type="button" key={day} className={`day-chip ${form.days.includes(day) ? "active" : ""}`}
                  aria-pressed={form.days.includes(day)} onClick={() => toggleDay(day)}>
                  {day}
                </button>
              ))}
            </div>
            {submitted && errors.days && <div className="invalid-feedback d-block">{errors.days}</div>}
          </div>
          <div className="col-md-4">
            <label htmlFor="cf-time" className="form-label">Start time</label>
            <input id="cf-time" type="time" className={cls("time")} value={form.time} onChange={(e) => update("time", e.target.value)} />
            <Feedback field="time" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
