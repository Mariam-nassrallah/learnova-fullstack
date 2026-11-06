// =====================================================
// Layout: the frame around every admin page
//   1. Page titles
//   2. Pending count (polls /api/stats every 15 s)
//   3. Confirm dialog (Promise-based)
//   4. Menu actions (sample data, reset, logout)
//   5. Sidebar + top navbar + footer
// Pages get { confirm, refreshPending, pending, dataVersion, loadSample }
// through useOutletContext().
// =====================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import Modal from "./Modal.jsx";
import { Avatar } from "./ui.jsx";
import ThemeToggle from "./ThemeToggle.jsx";


// 1. Page titles ---------------------------------------
const PAGES = {
  "/dashboard": { title: "Dashboard", subtitle: "Overview of courses, students and registrations" },
  "/courses": { title: "Courses", subtitle: "Add, edit and organise your courses" },
  "/students": { title: "Students", subtitle: "Everyone who has registered on the website" },
  "/registrations": { title: "Registrations", subtitle: "Review, approve or reject registrations" },
};

const NAV = [
  { to: "/dashboard", icon: "bi-grid-1x2", label: "Dashboard" },
  { to: "/courses", icon: "bi-journal-code", label: "Courses" },
  { to: "/students", icon: "bi-people", label: "Students" },
  { to: "/registrations", icon: "bi-card-checklist", label: "Registrations", badge: true },
];

export default function Layout() {
  const { name, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const page = PAGES[location.pathname] || PAGES["/dashboard"];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // +1 = pages reload their data
  const menuRef = useRef(null);

  // Close the mobile sidebar + profile menu when the page changes
  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close the profile menu on an outside click or Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Esc also closes the mobile sidebar
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);


  // 2. Pending count -----------------------------------
  const [pending, setPending] = useState(0);
  const refreshPending = useCallback(async () => {
    try {
      const stats = await api("/stats");
      setPending(stats.statusCounts.Pending);
    } catch {
      /* the next poll will try again */
    }
  }, []);

  useEffect(() => {
    refreshPending();
    const timer = setInterval(refreshPending, 15000); // new registrations from the website
    return () => clearInterval(timer);
  }, [refreshPending]);


  // 3. Confirm dialog ----------------------------------
  // const ok = await confirm("Delete course?", "This can't be undone.", "Delete");
  const [dialog, setDialog] = useState(null);
  const confirm = useCallback((title, message, button = "Confirm") =>
    new Promise((resolve) => setDialog({ title, message, button, resolve })), []);

  function closeDialog(answer) {
    dialog?.resolve(answer);
    setDialog(null);
  }


  // 4. Menu actions ------------------------------------
  const loadSample = useCallback(async () => {
    try {
      const res = await api("/admin/sample", { method: "POST" });
      showToast(res.message, "success");
      setDataVersion((v) => v + 1);
      refreshPending();
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [showToast, refreshPending]);

  async function resetAll() {
    setMenuOpen(false);
    const ok = await confirm(
      "Reset all data?",
      "Every registration is deleted and the courses go back to the defaults. This can't be undone.",
      "Reset everything"
    );
    if (!ok) return;
    try {
      const res = await api("/admin/reset", { method: "POST" });
      showToast(res.message, "warning");
      setDataVersion((v) => v + 1);
      refreshPending();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    const ok = await confirm("Log out?", "You will need to log in again to manage Learnova.", "Log out");
    if (!ok) return;
    await logout();
    showToast("You have been logged out.", "info");
    navigate("/login", { replace: true });
  }


  // 5. Layout ------------------------------------------
  return (
    <div className="admin-shell">
      {/* Sidebar: fixed on desktop, slides in on mobile */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Admin navigation">
        <div className="sidebar-head">
          <Link to="/dashboard" className="brand">
            <span className="logo-mark"><i className="bi bi-stars"></i></span>
            Learnova <span className="admin-tag">ADMIN</span>
          </Link>
          <button type="button" className="btn-close d-lg-none" aria-label="Close menu" onClick={() => setSidebarOpen(false)}></button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Manage</div>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
              <i className={`bi ${item.icon}`}></i>
              <span className="flex-grow-1">{item.label}</span>
              {item.badge && pending > 0 && <span className="badge pending-badge">{pending}</span>}
            </NavLink>
          ))}

          <div className="nav-label mt-3">Website</div>
          <a href="/home.html" className="side-link"><i className="bi bi-globe2"></i> View website</a>
          <a href="/registration.html" className="side-link"><i className="bi bi-pencil-square"></i> Registration form</a>
        </nav>

        <div className="sidebar-foot">
          <div className="tip-card">
            <i className="bi bi-lightbulb"></i>
            <div>
              <b>Tip</b>
              <p className="mb-0">Registrations made on the website appear here automatically as <em>Pending</em>.</p>
            </div>
          </div>
          <button type="button" className="side-link logout" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i> Logout
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop d-lg-none" onClick={() => setSidebarOpen(false)}></div>}

      <div className="admin-main">
        {/* Top navbar */}
        <header className="topbar">
          <button type="button" className="icon-btn d-lg-none" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <i className="bi bi-list"></i>
          </button>
          <div className="flex-grow-1 min-w-0">
            <h1 className="page-title">{page.title}</h1>
            <p className="page-subtitle d-none d-sm-block">{page.subtitle}</p>
          </div>

          <ThemeToggle />

          <Link to="/registrations?status=Pending" className="icon-btn position-relative" aria-label={`${pending} pending registrations`} title="Pending registrations">
            <i className="bi bi-bell"></i>
            {pending > 0 && <span className="bell-badge">{pending}</span>}
          </Link>

          <div className="profile" ref={menuRef}>
            <button type="button" className="profile-btn" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              <Avatar name={name} size={36} />
              <span className="d-none d-md-block text-start">
                <b>{name}</b>
                <small>Administrator</small>
              </span>
              <i className="bi bi-chevron-down d-none d-md-block"></i>
            </button>
            {menuOpen && (
              <div className="profile-menu" role="menu">
                <div className="px-3 py-2 d-md-none"><b>{name}</b><br /><small className="text-muted-c">Administrator</small></div>
                <a href="/home.html" className="menu-item" role="menuitem"><i className="bi bi-globe2"></i> View website</a>
                <button type="button" className="menu-item" role="menuitem" onClick={toggleTheme}>
                  <i className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon-stars"}`}></i> {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
                <button type="button" className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); loadSample(); }}>
                  <i className="bi bi-database-add"></i> Load sample data
                </button>
                <button type="button" className="menu-item" role="menuitem" onClick={resetAll}>
                  <i className="bi bi-arrow-counterclockwise"></i> Reset all data
                </button>
                <hr />
                <button type="button" className="menu-item text-danger-c" role="menuitem" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="admin-content">
          <Outlet context={{ confirm, refreshPending, pending, dataVersion, loadSample }} />
        </main>

        <footer className="admin-footer">
          <span>&copy; 2026 Learnova Admin</span>
          <span>Built by Mariam Nassrallah</span>
        </footer>
      </div>

      {/* Shared confirm dialog */}
      <Modal show={!!dialog} onClose={() => closeDialog(false)} title={dialog?.title} labelId="confirmTitle"
        footer={<>
          <button type="button" className="btn btn-soft" onClick={() => closeDialog(false)}>Cancel</button>
          <button type="button" className="btn btn-danger-soft" onClick={() => closeDialog(true)}>{dialog?.button}</button>
        </>}>
        <p className="mb-0 text-muted-c">{dialog?.message}</p>
      </Modal>
    </div>
  );
}
