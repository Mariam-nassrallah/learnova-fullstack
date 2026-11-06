// =====================================================
// Students page
//   1. Load students (+ courses for the filter)
//   2. Stat cards
//   3. Search + filters (course, date, occupation)
//   4. CSV export of the filtered list
//   5. Table + details modal
// =====================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import { Avatar, EmptyState, Loading, SearchInput, StatCard, StatusBadge } from "../components/ui.jsx";
import { daysAgo, downloadCSV, formatDate, money } from "../utils.js";

const EMPTY_FILTERS = { search: "", course: "", date: "", occupation: "" };

export default function Students() {
  const { dataVersion } = useOutletContext();
  const showToast = useToast();
  const [students, setStudents] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(null);


  // 1. Load ----------------------------------------------
  const load = useCallback(async () => {
    try {
      const [list, courseList] = await Promise.all([api("/students"), api("/courses")]);
      setStudents(list);
      setCourses(courseList);
    } catch (err) {
      showToast(err.message, "error");
      setStudents((s) => s || []);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load, dataVersion]);


  // 3. Filters -------------------------------------------
  const occupations = useMemo(
    () => [...new Set((students || []).map((s) => s.occupation).filter(Boolean))].sort(),
    [students]
  );

  const visible = useMemo(() => {
    if (!students) return [];
    const text = filters.search.trim().toLowerCase();
    const digits = text.replace(/\D/g, "");
    return students.filter((s) =>
      (!text || s.name.toLowerCase().includes(text) || s.email.includes(text) ||
        (digits.length > 0 && s.phone.replace(/\D/g, "").includes(digits))) &&
      (!filters.course || s.courseIds.includes(filters.course)) &&
      (!filters.date || daysAgo(s.lastDate) <= Number(filters.date)) &&
      (!filters.occupation || s.occupation === filters.occupation)
    );
  }, [students, filters]);

  const setFilter = (field, value) => setFilters((f) => ({ ...f, [field]: value }));


  // 4. CSV export ----------------------------------------
  function exportCSV() {
    if (visible.length === 0) {
      showToast("There are no students to export.", "warning");
      return;
    }
    downloadCSV(
      `learnova-students-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Occupation", "Courses", "Registrations", "First registered", "Last registered", "Total paid"],
      visible.map((s) => [
        s.name, s.email, s.phone, s.occupation, s.courses.map((c) => c.title).join("; "),
        s.registrations.length, formatDate(s.firstDate), formatDate(s.lastDate), s.spent.toFixed(2),
      ])
    );
    showToast(`Exported ${visible.length} student${visible.length === 1 ? "" : "s"} to CSV.`, "success");
  }

  if (!students) return <Loading />;

  // 2. Stats ---------------------------------------------
  const newThisWeek = students.filter((s) => daysAgo(s.firstDate) <= 7).length;
  const multiCourse = students.filter((s) => s.courseIds.length >= 2).length;


  // 5. Table + modal -------------------------------------
  return (
    <>
      <div className="row g-3 g-xl-4 mb-4">
        <div className="col-sm-4"><StatCard icon="bi-people" label="Students" value={students.length} color="violet" /></div>
        <div className="col-sm-4"><StatCard icon="bi-person-plus" label="New this week" value={newThisWeek} color="cyan" /></div>
        <div className="col-sm-4"><StatCard icon="bi-collection" label="In 2+ courses" value={multiCourse} color="pink" /></div>
      </div>

      <div className="panel">
        <div className="panel-head flex-wrap">
          <div>
            <h2 className="panel-title">Students</h2>
            <p className="panel-sub">Showing {visible.length} of {students.length} students</p>
          </div>
          <button type="button" className="btn btn-soft" onClick={exportCSV}><i className="bi bi-download"></i> Export CSV</button>
        </div>

        <div className="filters">
          <SearchInput value={filters.search} onChange={(v) => setFilter("search", v)} placeholder="Search name, email or phone..." label="Search students" />
          <select className="form-select" aria-label="Filter by course" value={filters.course} onChange={(e) => setFilter("course", e.target.value)}>
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="form-select" aria-label="Filter by registration date" value={filters.date} onChange={(e) => setFilter("date", e.target.value)}>
            <option value="">Any date</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <select className="form-select" aria-label="Filter by occupation" value={filters.occupation} onChange={(e) => setFilter("occupation", e.target.value)}>
            <option value="">All occupations</option>
            {occupations.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {visible.length === 0 ? (
          students.length === 0 ? (
            <EmptyState icon="bi-people" title="No students yet" text="Students appear here once they register on the website.">
              <a href="/registration.html" className="btn btn-primary-grad btn-sm"><i className="bi bi-box-arrow-up-right"></i> Open the registration form</a>
            </EmptyState>
          ) : (
            <EmptyState icon="bi-search" title="No students match your filters" text="Try another search or clear the filters.">
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
            </EmptyState>
          )
        ) : (
          <div className="table-responsive">
            <table className="table admin-table align-middle mb-0">
              <thead><tr><th>Student</th><th>Phone</th><th>Course(s)</th><th>Last registration</th><th className="text-end"></th></tr></thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.email}>
                    <td style={{ minWidth: 220 }}>
                      <div className="d-flex align-items-center gap-3">
                        <Avatar name={s.name} />
                        <div className="min-w-0">
                          <div className="fw-semibold">{s.name}</div>
                          <div className="small text-muted-c text-break">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-nowrap small mono">{s.phone}</td>
                    <td style={{ minWidth: 200 }}>{s.courses.map((c) => <span key={c.id} className="chip">{c.title}</span>)}</td>
                    <td className="text-nowrap small">{formatDate(s.lastDate)}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-soft btn-sm" onClick={() => setSelected(s)}><i className="bi bi-eye"></i> View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details modal */}
      <Modal show={!!selected} onClose={() => setSelected(null)} size="modal-lg" labelId="studentTitle"
        title={selected && <span className="d-flex align-items-center gap-2"><Avatar name={selected.name} size={34} /> {selected.name}</span>}
        footer={selected && <>
          <button type="button" className="btn btn-soft" onClick={() => setSelected(null)}>Close</button>
          <Link to={`/registrations?search=${encodeURIComponent(selected.email)}`} className="btn btn-primary-grad">
            <i className="bi bi-card-checklist"></i> Manage registrations
          </Link>
        </>}>
        {selected && (
          <>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="info-box">
                  <h6>Contact</h6>
                  <div><i className="bi bi-envelope"></i> <span className="text-break">{selected.email}</span></div>
                  <div><i className="bi bi-telephone"></i> {selected.phone}</div>
                  <div><i className="bi bi-briefcase"></i> {selected.occupation || "Not given"}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="info-box">
                  <h6>Summary</h6>
                  <div className="d-flex justify-content-between"><span className="text-muted-c">First registered</span><span>{formatDate(selected.firstDate)}</span></div>
                  <div className="d-flex justify-content-between"><span className="text-muted-c">Registrations</span><span>{selected.registrations.length}</span></div>
                  <div className="d-flex justify-content-between"><span className="text-muted-c">Total paid (approved)</span><b>{money(selected.spent)}</b></div>
                </div>
              </div>
            </div>
            <h6 className="section-label">Registration history</h6>
            <div className="table-responsive">
              <table className="table admin-table align-middle mb-0">
                <thead><tr><th>ID</th><th>Course(s)</th><th>Date</th><th className="text-end">Total</th><th>Status</th></tr></thead>
                <tbody>
                  {selected.registrations.map((r) => (
                    <tr key={r.id}>
                      <td><code>{r.id}</code></td>
                      <td className="small">{r.courses.map((c) => c.title).join(", ")}</td>
                      <td className="small text-nowrap">{formatDate(r.date)}</td>
                      <td className="text-end">{money(r.total)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
