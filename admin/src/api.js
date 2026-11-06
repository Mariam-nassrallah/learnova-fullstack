// =====================================================
// API helper
// Every request to the Express server goes through api():
//   - adds "Authorization: Bearer <token>" when logged in
//   - throws an Error with the server's message (+ field errors)
//   - on 401 (token missing or expired) goes back to the login page
// =====================================================
const TOKEN_KEY = "learnova-admin-token";
const NAME_KEY = "learnova-admin-name";
const ROLE_KEY = "learnova-admin-role";

// 1. Session (sessionStorage = cleared when the browser tab closes)
export const session = {
  get token() { return sessionStorage.getItem(TOKEN_KEY); },
  get name() { return sessionStorage.getItem(NAME_KEY) || "Admin"; },
  get role() { return sessionStorage.getItem(ROLE_KEY); },
  save({ token, name, role }) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(NAME_KEY, name);
    sessionStorage.setItem(ROLE_KEY, role);
  },
  clear() {
    [TOKEN_KEY, NAME_KEY, ROLE_KEY].forEach((key) => sessionStorage.removeItem(key));
  },
};

// 2. fetch wrapper
export async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Is it running (npm start)?");
  }

  const data = await res.json().catch(() => ({}));

  // Logged out (or the server restarted): back to the login page
  if (res.status === 401 && path !== "/auth/login") {
    session.clear();
    window.location.href = import.meta.env.BASE_URL + "login";
  }

  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status}).`);
    error.status = res.status;
    error.errors = data.errors || {};
    throw error;
  }
  return data;
}
