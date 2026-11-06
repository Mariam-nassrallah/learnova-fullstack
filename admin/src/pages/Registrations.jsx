// =====================================================
// Registrations page
//   1. Load registrations + courses
//   2. Filters kept in the URL (?status= and ?search=)
//   3. Change status (PATCH) / delete
//   4. Status pills + table + details modal
// =====================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "../components/Modal.jsx";
import { Avatar, EmptyState, Loading, SearchInput, StatusBadge } from "../components/ui.jsx";
import { REG_STATUSES } from "../constants.js";
import { formatDate, formatDateTime, money } from "../utils.js";

const SORTS = {
  newest: (a, b) => new Date(b.date) - new Date(a.date),
  oldest: (a, b) => new Date(a.date) - new Date(b.date),
  total: (a, b) => b.total - a.total,
};

export default function Registrations() {
  const { confirm, refreshPending, dataVersion } = useOutletContext();
  const showToast = useToast();
  const [params, setParams] = useSearchParams();

  const [regs, setRegs] = useState(null);
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState("");
  const [sort, setSort] = useState("newest");
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);


  // 1. Load ----------------------------------------------
  const load = useCallback(async () => {
    try {
      const [list, courseList] = await Promise.all([api("/registrations"), api("/courses")]);
      setRegs(list);
      setCourses(courseList);
    } catch (err) {
      showToast(err.message, "error");
      setRegs((r) => r || []);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load, dataVersion]);


  // 2. URL filters ---------------------------------------
  const status = REG_STATUSES.includes(params.get("status")) ? params.get("status") : "All";
  const search = params.get("search") || "";

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value && value !== "All") next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const counts = useMemo(() => {
    const c = { All: regs?.length || 0 };
    REG_STATUSES.forEach((s) => (c[s] = (regs || []).filter((r) => r.status === s).length));
    return c;
  }, [regs]);

  const visible = useMemo(() => {
    if (!regs) return [];
    const text = search.trim().toLowerCase();
    return regs
      .filter((r) =>
        (status === "All" || r.status === status) &&
        (!course || r.courseIds.includes(course)) &&
        (!text || r.name.toLowerCase().includes(text) || r.email.toLowerCase().includes(text) || r.id.toLowerCase().includes(text))
      )
      .sort(SORTS[sort]);
  }, [regs, status, course, search, sort]);


  // 3. Actions -------------------------------------------
  async function changeStatus(reg, newStatus) {
    if (reg.status === newStatus) return;
    setBusyId(reg.id);
    try {
      const updated = await api(`/registrations/${encodeURIComponent(reg.id)}/status`, { method: "PATCH", body: { status: newStatus } });
      setRegs((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      if (viewing?.id === updated.id) setViewing(updated);
      showToast(`${updated.id} is now ${newStatus}.`, newStatus === "Rejected" ? "warning" : "success");
      refreshPending();
    } catch (err) {
      showToast(err.message, "error"); // e.g. 409: no seats left
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(reg) {
    const ok = await confirm("Delete this registration?", `${reg.id} (${reg.name}) will be removed and its seats released.`, "Delete");
    if (!ok) return;
    try {
      const res = await api(`/registrations/${encodeURIComponent(reg.id)}`, { method: "DELETE" });
      setRegs((list) => list.filter((r) => r.id !== reg.id));
      setViewing(null);
      showToast(res.message, "success");
      refreshPending();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (!regs) return <Loading />;


  // 4. Page ----------------------------------------------
  return (
    <>
      <div className="panel">
        <div className="status-pills" role="tablist" aria-label="Filter by status">
          {["All", ...REG_STATUSES].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s}
              className={`status-pill p-${s.toLowerCase()} ${status === s ? "active" : ""}`} onClick={() => setParam("status", s)}>
              {s} <span className="pill-count">{counts[s]}</span>
            </button>
          ))}
        </div>

        <div className="filters">
          <SearchInput value={search} onChange={(v) => setParam("search", v)} placeholder="Search name, email or ID..." label="Search registrations" />
          <select className="form-select" aria-label="Filter by course" value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="form-select" aria-label="Sort registrations" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="total">Highest total</option>
          </select>
        </div>
        <p className="panel-sub mb-3">Showing {visible.length} of {regs.length} registrations</p>

        {visible.length === 0 ? (
          <EmptyState icon="bi-inbox" title={regs.length ? "No registrations match" : "No registrations yet"}
            text={regs.length ? "Try another status, search or course." : "Registrations made on the website will appear here."}>
            {regs.length > 0 && (
              <button type="button" className="btn btn-soft btn-sm" onClick={() => { setParams({}, { replace: true }); setCourse(""); }}>Clear filters</button>
            )}
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="table admin-table align-middle mb-0">
              <thead><tr><th>ID</th><th>Student</th><th>Course(s)</th><th>Date</th><th className="text-end">Total</th><th>Status</th><th className="text-end"></th></tr></thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td style={{ minWidth: 200 }}>
                      <div className="d-flex align-items-center gap-2">
                        <Avatar name={r.name} size={32} />
                        <div className="min-w-0">
                          <div className="fw-semibold">{r.name}</div>
                          <div className="small text-muted-c text-break">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ minWidth: 180 }}>{r.courses.map((c) => <span key={c.id} className="chip">{c.title}</span>)}</td>
                    <td className="small text-nowrap">{formatDate(r.date)}</td>
                    <td className="text-end fw-semibold">{money(r.total)}</td>
                    <td>
                      <select className={`form-select form-select-sm status-select s-${r.status.toLowerCase()}`}
                        aria-label={`Status of ${r.id}`} value={r.status} disabled={busyId === r.id}
                        onChange={(e) => changeStatus(r, e.target.value)}>
                        {REG_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-end text-nowrap">
                      <button type="button" className="icon-btn sm" title="View" aria-label={`View ${r.id}`} onClick={() => setViewing(r)}><i className="bi bi-eye"></i></button>
                      <button type="button" className="icon-btn sm danger" title="Delete" aria-label={`Delete ${r.id}`} onClick={() => handleDelete(r)}><i className="bi bi-trash3"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details modal */}
      <Modal show={!!viewing} onClose={() => setViewing(null)} labelId="regTitle"
        title={viewing && <>Registration <code className="fs-6">{viewing.id}</code></>}
        footer={viewing && <>
          <button type="button" className="btn btn-danger-soft me-auto" onClick={() => handleDelete(viewing)}><i className="bi bi-trash3"></i> Delete</button>
          {viewing.status !== "Rejected" && (
            <button type="button" className="btn btn-soft" disabled={busyId === viewing.id} onClick={() => changeStatus(viewing, "Rejected")}>
              <i className="bi bi-x-circle"></i> Reject
            </button>
          )}
          {viewing.status !== "Approved" && (
            <button type="button" className="btn btn-success-grad" disabled={busyId === viewing.id} onClick={() => changeStatus(viewing, "Approved")}>
              <i className="bi bi-check-circle"></i> Approve
            </button>
          )}
        </>}>
        {viewing && (
          <>
            <div className="d-flex align-items-center gap-3 mb-3">
              <Avatar name={viewing.name} size={46} />
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold">{viewing.name}</div>
                <div className="small text-muted-c text-break">{viewing.email} · {viewing.phone}</div>
              </div>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="info-box mb-3">
              <h6>Details</h6>
              <div className="d-flex justify-content-between"><span className="text-muted-c">Date</span><span>{formatDateTime(viewing.date)}</span></div>
              <div className="d-flex justify-content-between"><span className="text-muted-c">Occupation</span><span>{viewing.occupation || "Not given"}</span></div>
              <div className="d-flex justify-content-between"><span className="text-muted-c">Payment</span><span>{viewing.payment}</span></div>
            </div>
            <div className="info-box">
              <h6>Courses</h6>
              {viewing.courses.map((c) => <div key={c.id}><i className="bi bi-journal-code"></i> {c.title}</div>)}
              <hr />
              <div className="d-flex justify-content-between"><span className="text-muted-c">Subtotal</span><span>{money(viewing.subtotal)}</span></div>
              {viewing.discount > 0 && (
                <div className="d-flex justify-content-between text-success-c"><span>Discount ({viewing.promo})</span><span>-{money(viewing.discount)}</span></div>
              )}
              <div className="d-flex justify-content-between fs-5 fw-bold mt-1"><span>Total</span><span>{money(viewing.total)}</span></div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
