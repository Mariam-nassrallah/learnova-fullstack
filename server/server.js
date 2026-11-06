// =====================================================
// Learnova API server
//   1. Setup + request logger
//   2. API routes
//   3. Website (static files)
//   4. React admin (built files + SPA fallback)
//   5. Errors
//   6. Start
// =====================================================
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import registrationRoutes from "./routes/registrations.js";
import studentRoutes from "./routes/students.js";
import statsRoutes from "./routes/stats.js";
import adminRoutes from "./routes/admin.js";
import { readDB } from "./lib/db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_DIR = path.join(here, "..", "website");
const ADMIN_DIR = path.join(here, "..", "admin", "dist");
const PORT = process.env.PORT || 3000;

const app = express();


// 1. Setup + request logger ----------------------------
app.use(express.json({ limit: "100kb" }));

// Logs API calls like: POST /api/registrations 201 (12 ms)
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start} ms)`);
  });
  next();
});


// 2. API routes ----------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/admin", adminRoutes);

// Unknown API address -> JSON 404 (not an HTML page)
app.use("/api", (req, res) => {
  res.status(404).json({ message: `No API endpoint for ${req.method} ${req.originalUrl}.` });
});


// 3. Website -------------------------------------------
app.get("/", (req, res) => res.redirect("/home.html"));
app.use(express.static(WEBSITE_DIR, { index: false }));


// 4. React admin ---------------------------------------
app.use("/admin", express.static(ADMIN_DIR));

// React Router handles /admin/dashboard, /admin/courses... so every
// /admin/* address gets the same index.html
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  const indexFile = path.join(ADMIN_DIR, "index.html");
  if (!fs.existsSync(indexFile)) {
    return res.status(503).send("The admin has not been built yet. Run <code>npm run setup</code> in the project folder.");
  }
  res.sendFile(indexFile);
});


// 5. Errors --------------------------------------------
app.use((req, res) => res.status(404).send("Page not found."));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "The request body is not valid JSON." });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});


// 6. Start ---------------------------------------------
readDB(); // creates data/db.json with the default courses on the first run
app.listen(PORT, () => {
  console.log(`Learnova is running:
  Website  http://localhost:${PORT}/
  Admin    http://localhost:${PORT}/admin/
  API      http://localhost:${PORT}/api/courses`);
});
