// =====================================================
// Learnova API - login
//   1. Users (each one has a role)
//   2. Token store (in memory)
//   3. Middleware: requireLogin, requireRole, requireAdmin
//
// This is a demo: the users are fixed in code, and tokens are
// lost when the server restarts (users then simply log in again).
// To add students later, add users with role "student" (or load
// them from the database) and protect their routes with
// requireRole("student").
// =====================================================
import crypto from "node:crypto";


// 1. Users ---------------------------------------------
const USERS = [
  { email: "admin@learnova.com", password: "admin123", name: "Mariam Nassrallah", role: "admin" },
];

// Returns the user for these credentials, or null
export function findUser(email, password) {
  const clean = String(email).trim().toLowerCase();
  return USERS.find((u) => u.email === clean && u.password === password) || null;
}


// 2. Tokens --------------------------------------------
const tokens = new Map(); // token -> { email, name, role }

export function createToken(user) {
  const token = crypto.randomUUID();
  tokens.set(token, { email: user.email, name: user.name, role: user.role });
  return token;
}

export function deleteToken(token) {
  tokens.delete(token);
}

// Reads "Authorization: Bearer <token>"
export function readToken(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}


// 3. Middleware ----------------------------------------
// Any logged-in user (req.user = { email, name, role })
export function requireLogin(req, res, next) {
  const token = readToken(req);
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ message: "Please log in first." });
  }
  req.user = tokens.get(token);
  req.token = token;
  next();
}

// Logged in AND one of the given roles (403 for other roles)
export function requireRole(...roles) {
  return (req, res, next) =>
    requireLogin(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "You don't have access to this page." });
      }
      next();
    });
}

export const requireAdmin = requireRole("admin");
