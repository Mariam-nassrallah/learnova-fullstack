// =====================================================
// /api/auth - log in and log out
// =====================================================
import { Router } from "express";
import { createToken, deleteToken, findUser, requireLogin } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/login  { email, password } -> { token, name, email, role }
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const errors = {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) errors.email = "Please enter a valid email.";
  if (typeof password !== "string" || password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (Object.keys(errors).length) return res.status(400).json({ message: "Please fix the highlighted fields.", errors });

  const user = findUser(email, password);
  if (!user) return res.status(401).json({ message: "Wrong email or password." });

  res.json({ token: createToken(user), name: user.name, email: user.email, role: user.role });
});

// POST /api/auth/logout (any logged-in user)
router.post("/logout", requireLogin, (req, res) => {
  deleteToken(req.token);
  res.json({ message: "Logged out." });
});

export default router;
