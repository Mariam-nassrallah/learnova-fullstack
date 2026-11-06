// =====================================================
// Courses page
//   1. Load courses (+ registrations, to know which can be deleted)
//   2. Search + filters
//   3. Add / edit (CourseForm modal)
//   4. Delete (blocked if the course has registrations)
//   5. Table
// =====================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import CourseForm from "../components/CourseForm.jsx";
import { CourseIcon, EmptyState, Loading, SearchInput, StatusBadge } from "../components/ui.jsx";
import { CATEGORIES, COURSE_STATUSES, LEVELS } from "../constants.js";
import { money, schedule } from "../utils.js";

export default function Courses() {
  const { confirm, dataVersion } = useOutletContext();
  const showToast = useToast();

  const [courses, setCourses] = useState(null);
  const [regCounts, setRegCounts] = useState({}); // courseId -> number of registrations (any status)
  const [filters, setFilters] = useState({ search: "", category: "", level: "", status: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);


  // 1. Load ----------------------------------------------
  const load = useCallback(async () => {
    try {
      const [courseList, regs] = await Promise.all([api("/courses"), api("/registrations")]);
      const counts = {};
      regs.forEach((r) => r.courseIds.forEach((id) => (counts[id] = (counts[id] || 0) + 1)));
      setCourses(courseList);
      setRegCounts(counts);
    } catch (err) {
      showToast(err.message, "error");
      setCourses((c) => c || []);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load, dataVersion]);


  // 2. Search + filters ---------------------------------
  const visible = useMemo(() => {
    if (!courses) return [];
    const text = filters.search.trim().toLowerCase();
    return courses.filter((c) =>
      (!text || c.title.toLowerCase().includes(text) || c.instructor.toLowerCase().includes(text)) &&
      (!filters.category || c.category === filters.category) &&
      (!filters.level || c.level === filters.level) &&
      (!filters.status || c.status === filters.status)
    );
  }, [courses, filters]);

  const setFilter = (field, value) => setFilters((f) => ({ ...f, [field]: value }));
  const hasFilters = Object.values(filters).some(Boolean);


  // 3. Add / edit ---------------------------------------
  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(course) { setEditing(course); setFormOpen(true); }
  function handleSaved(course, action) {
    setFormOpen(false);
    showToast(`${course.title} was ${action}.`, "success");
    load();
  }


  // 4. Delete -------------------------------------------
  async function handleDelete(course) {
    const used = regCounts[course.id] || 0;
    if (used > 0) {
      showToast(`${course.title} has ${used} registration${used === 1 ? "" : "s"}. Set its status to Archived instead.`, "error");
      return;
    }
    const ok = await confirm("Delete this course?", `"${course.title}" will be removed permanently.`, "Delete course");
    if (!ok) return;
    try {
      const res = await api(`/courses/${encodeURIComponent(course.id)}`, { method: "DELETE" });
      showToast(res.message, "success");
      load();
    } catch (err) {
      showToast(err.message, "error"); // e.g. someone registered meanwhile (409)
      load();
    }
  }

  if (!courses) return <Loading />;


  // 5. Table --------------------------------------------
  return (
    <div className="panel">
      <div className="panel-head flex-wrap">
        <div>
          <h2 className="panel-title">All courses</h2>
          <p className="panel-sub">Showing {visible.length} of {courses.length} courses</p>
        </div>
        <button type="button" className="btn btn-primary-grad" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add course</button>
      </div>

      <div className="filters">
        <SearchInput value={filters.search} onChange={(v) => setFilter("search", v)} placeholder="Search name or instructor..." label="Search courses" />
        <select className="form-select" aria-label="Filter by category" value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="form-select" aria-label="Filter by level" value={filters.level} onChange={(e) => setFilter("level", e.target.value)}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select className="form-select" aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {COURSE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="bi-journal-x" title={courses.length ? "No courses match your filters" : "No courses yet"}
          text={courses.length ? "Try another search or clear the filters." : "Add your first course to get started."}>
          {hasFilters
            ? <button type="button" className="btn btn-soft btn-sm" onClick={() => setFilters({ search: "", category: "", level: "", status: "" })}>Clear filters</button>
            : <button type="button" className="btn btn-primary-grad btn-sm" onClick={openAdd}><i className="bi bi-plus-lg"></i> Add course</button>}
        </EmptyState>
      ) : (
        <div className="table-responsive">
          <table className="table admin-table align-middle mb-0">
            <thead>
              <tr>
                <th>Course</th><th>Category</th><th>Level</th><th>Duration</th>
                <th className="text-end">Price</th><th>Enrolled</th><th>Status</th><th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const percent = c.seats ? Math.min(100, Math.round((c.enrolled / c.seats) * 100)) : 100;
                return (
                  <tr key={c.id}>
                    <td style={{ minWidth: 260 }}>
                      <div className="d-flex align-items-center gap-3">
                        <CourseIcon course={c} />
                        <div className="min-w-0">
                          <div className="fw-semibold">{c.title}</div>
                          <div className="small text-muted-c">{c.instructor} · {schedule(c)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="cat-badge">{c.category}</span></td>
                    <td className="small">{c.level}</td>
                    <td className="small text-nowrap">{c.duration} h</td>
                    <td className="text-end fw-semibold">{money(c.price)}</td>
                    <td style={{ minWidth: 110 }}>
                      <div className="small"><b>{c.enrolled}</b><span className="text-muted-c"> / {c.seats}</span></div>
                      <div className={`progress-thin mt-1 ${percent >= 100 ? "full" : ""}`}><div style={{ width: `${percent}%` }}></div></div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-end text-nowrap">
                      <button type="button" className="icon-btn sm" title="Edit" aria-label={`Edit ${c.title}`} onClick={() => openEdit(c)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button type="button" className="icon-btn sm danger" title="Delete" aria-label={`Delete ${c.title}`} onClick={() => handleDelete(c)}>
                        <i className="bi bi-trash3"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CourseForm show={formOpen} course={editing} courses={courses} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
