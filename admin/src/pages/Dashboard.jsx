// =====================================================
// Dashboard
//   1. Load /api/stats
//   2. Stat cards (count-up)
//   3. Bar chart: registrations in the last 7 days (CSS bars)
//   4. Donut: registration status (CSS conic-gradient)
//   5. Recent registrations + popular courses
// No chart library: everything is HTML + CSS.
// =====================================================
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import { Avatar, CourseIcon, EmptyState, Loading, StatCard, StatusBadge } from "../components/ui.jsx";
import { formatDate, money } from "../utils.js";

// Same meaning as the status badges (amber / green / red); the CSS variables
// give each theme its own shade
const STATUS_COLORS = { Pending: "var(--chart-pending)", Approved: "var(--chart-approved)", Rejected: "var(--chart-rejected)" };

export default function Dashboard() {
  const { dataVersion, loadSample } = useOutletContext();
  const showToast = useToast();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  // 1. Load ---------------------------------------------
  useEffect(() => {
    api("/stats")
      .then((data) => { setStats(data); setError(""); })
      .catch((err) => { setError(err.message); showToast(err.message, "error"); });
  }, [dataVersion, showToast]);

  if (error && !stats) return <div className="panel"><EmptyState icon="bi-wifi-off" title="Couldn't load the dashboard" text={error} /></div>;
  if (!stats) return <Loading />;

  const empty = stats.totalRegistrations === 0;
  const weekTotal = stats.last7.reduce((sum, d) => sum + d.count, 0);
  const maxDay = Math.max(1, ...stats.last7.map((d) => d.count));

  // 4. Donut: each status gets a slice of the circle
  let angle = 0;
  const slices = Object.entries(stats.statusCounts).map(([status, count]) => {
    const start = angle;
    angle += empty ? 0 : (count / stats.totalRegistrations) * 360;
    return `${STATUS_COLORS[status]} ${start}deg ${angle}deg`;
  });
  const donutStyle = { background: empty ? "var(--track)" : `conic-gradient(${slices.join(", ")})` };

  return (
    <>
      {/* "No data yet" banner */}
      {empty && (
        <div className="info-banner mb-4">
          <i className="bi bi-info-circle"></i>
          <div className="flex-grow-1">
            <b>No registrations yet.</b> Register on the website, or load some sample data to explore the dashboard.
          </div>
          <button type="button" className="btn btn-primary-grad btn-sm" onClick={loadSample}>
            <i className="bi bi-database-add"></i> Load sample data
          </button>
        </div>
      )}

      {/* 2. Stat cards */}
      <div className="row g-3 g-xl-4 mb-4">
        <div className="col-6 col-xl-3"><StatCard icon="bi-journal-code" label="Total Courses" value={stats.totalCourses} color="violet" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-people" label="Total Students" value={stats.totalStudents} color="cyan" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-card-checklist" label="Total Registrations" value={stats.totalRegistrations} color="pink" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-lightning-charge" label="Active Courses" value={stats.activeCourses} color="green" /></div>
      </div>

      <div className="row g-3 g-xl-4 mb-4">
        {/* 3. Bar chart */}
        <div className="col-lg-7 col-xl-8">
          <div className="panel h-100">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Registrations, last 7 days</h2>
                <p className="panel-sub">{weekTotal} registration{weekTotal === 1 ? "" : "s"} this week</p>
              </div>
              <div className="text-end">
                <div className="panel-sub">Approved revenue</div>
                <div className="revenue">{money(stats.revenue)}</div>
              </div>
            </div>
            <div className="bar-chart" role="img" aria-label={`Registrations per day: ${stats.last7.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
              {stats.last7.map((day, i) => (
                <div className="bar-col" key={day.date}>
                  <span className="bar-value">{day.count}</span>
                  <div className="bar-track">
                    <div className="bar" style={{ height: `${(day.count / maxDay) * 100}%`, animationDelay: `${i * 70}ms` }}></div>
                  </div>
                  <span className="bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Donut */}
        <div className="col-lg-5 col-xl-4">
          <div className="panel h-100">
            <h2 className="panel-title">Registration status</h2>
            <p className="panel-sub">Click a status to see those registrations</p>
            <div className="donut-wrap">
              <div className="donut" style={donutStyle}>
                <div className="donut-hole"><b>{stats.totalRegistrations}</b><span>total</span></div>
              </div>
            </div>
            <div className="legend">
              {Object.entries(stats.statusCounts).map(([status, count]) => (
                <Link key={status} to={`/registrations?status=${status}`} className="legend-row">
                  <span className="legend-dot" style={{ background: STATUS_COLORS[status] }}></span>
                  <span className="flex-grow-1">{status}</span>
                  <b>{count}</b>
                  <span className="text-muted-c small ms-2">{empty ? 0 : Math.round((count / stats.totalRegistrations) * 100)}%</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 g-xl-4">
        {/* 5a. Recent registrations */}
        <div className="col-xl-8">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Recent registrations</h2>
              <Link to="/registrations" className="btn btn-soft btn-sm">View all <i className="bi bi-arrow-right"></i></Link>
            </div>
            {stats.recent.length === 0 ? (
              <EmptyState icon="bi-inbox" title="No registrations yet" text="New registrations from the website will show up here." />
            ) : (
              <div className="table-responsive">
                <table className="table admin-table align-middle mb-0">
                  <thead><tr><th>ID</th><th>Student</th><th>Course(s)</th><th>Date</th><th className="text-end">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {stats.recent.map((r) => (
                      <tr key={r.id}>
                        <td><code>{r.id}</code></td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Avatar name={r.name} size={32} />
                            <span className="text-nowrap">{r.name}</span>
                          </div>
                        </td>
                        <td className="small">{r.courses.map((c) => c.title).join(", ")}</td>
                        <td className="text-nowrap small">{formatDate(r.date)}</td>
                        <td className="text-end fw-semibold">{money(r.total)}</td>
                        <td><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 5b. Popular courses */}
        <div className="col-xl-4">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Popular courses</h2>
              <Link to="/courses" className="btn btn-soft btn-sm">Courses</Link>
            </div>
            {stats.popular.length === 0 ? (
              <EmptyState icon="bi-bar-chart" title="No enrolments yet" />
            ) : stats.popular.map((c) => {
              const percent = c.seats ? Math.min(100, Math.round((c.enrolled / c.seats) * 100)) : 100;
              return (
                <div className="popular-row" key={c.id}>
                  <CourseIcon course={c} size={38} />
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex justify-content-between gap-2">
                      <span className="text-truncate fw-medium">{c.title}</span>
                      <span className="small text-muted-c text-nowrap">{c.enrolled}/{c.seats}</span>
                    </div>
                    <div className="progress-thin mt-2"><div style={{ width: `${percent}%` }}></div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
