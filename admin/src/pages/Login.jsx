// =====================================================
// Login page
// Generic wording so students can use it later; for now only
// the admin role exists and goes to the dashboard.
//   1. Already logged in? -> dashboard
//   2. Validation (email format, password 6+ characters)
//   3. Submit -> POST /api/auth/login
// =====================================================
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const DEMO = { email: "admin@learnova.com", password: "admin123" };

function validate({ email, password }) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) errors.email = "Please enter a valid email.";
  if (password.length < 6) errors.password = "Password must be at least 6 characters.";
  return errors;
}

export default function Login() {
  const { token, role, login } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Already logged in
  if (token && role === "admin") return <Navigate to="/dashboard" replace />;

  // 2. Re-check while typing once the form was submitted
  function update(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);
    setServerError("");
    if (submitted) setErrors(validate(next));
  }

  // 3. Submit
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      showToast("Welcome back!", "success");
      const back = location.state?.from?.pathname;
      navigate(back && back !== "/login" ? back + (location.state.from.search || "") : "/dashboard", { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = (field) => `form-control ${submitted ? (errors[field] ? "is-invalid" : "is-valid") : ""}`;

  return (
    // The login page always uses the dark theme (the dashboard has the light/dark switch)
    <div className="login-page" data-theme="dark" data-bs-theme="dark">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <div className="login-card panel">
        <div className="text-center mb-4">
          <span className="logo-mark big"><i className="bi bi-stars"></i></span>
          <div className="login-brand mt-2">Learnova</div>
          <h1 className="h3 mt-2 mb-1">Welcome <span className="grad-text">back</span></h1>
          <p className="text-muted-c small mb-0">Sign in to your account</p>
        </div>

        {serverError && (
          <div className="alert alert-danger-soft d-flex gap-2 align-items-center" role="alert">
            <i className="bi bi-exclamation-octagon"></i> {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" className={fieldClass("email")} autoComplete="username"
              placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
            <div className="invalid-feedback">{errors.email}</div>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-group has-validation">
              <input id="password" type={showPassword ? "text" : "password"} className={fieldClass("password")}
                autoComplete="current-password" placeholder="••••••••" value={form.password}
                onChange={(e) => update("password", e.target.value)} />
              <button type="button" className="btn btn-soft" onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
              <div className="invalid-feedback">{errors.password}</div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary-grad w-100" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm"></span> Signing in...</> : <>Sign in <i className="bi bi-arrow-right"></i></>}
          </button>
        </form>

        <div className="demo-box mt-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <b className="small"><i className="bi bi-key"></i> Demo account</b>
            <button type="button" className="btn btn-link btn-sm p-0" onClick={() => { setForm(DEMO); setErrors({}); setServerError(""); }}>
              Use it
            </button>
          </div>
          <div className="small text-muted-c">Email: <code>{DEMO.email}</code><br />Password: <code>{DEMO.password}</code></div>
        </div>

        <a href="/home.html" className="d-block text-center small mt-3 text-muted-c"><i className="bi bi-arrow-left"></i> Back to website</a>
      </div>
    </div>
  );
}
