# Learnova

A course website with online registration, a Node.js + Express API, and a React admin dashboard for managing courses, students and registrations.

- **Website:** plain HTML, CSS, Bootstrap 5 and JavaScript
- **API:** Node.js + Express, with data saved in a JSON file
- **Admin:** React 18 + Vite + React Router

## How to run

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm run setup   # installs the server and admin, then builds the admin (first time only)
npm start       # starts the server
```

Then open:

| What | Address |
|---|---|
| Website | http://localhost:3000/ |
| Registration form | http://localhost:3000/registration.html |
| Admin dashboard | http://localhost:3000/admin/ |
| API (example) | http://localhost:3000/api/courses?status=Active |

**Demo admin login:** `admin@learnova.com` / `admin123` (or click the person icon in the website navbar)

To use another port: `PORT=4000 npm start` (macOS/Linux) or `set PORT=4000 && npm start` (Windows cmd).

### Working on the admin

```bash
npm start            # terminal 1: API on port 3000
npm run dev:admin    # terminal 2: admin with live reload on http://localhost:5173/admin/
```

Vite forwards every `/api` request to the server on port 3000. After changing the admin, run `npm run build` so `npm start` serves the new version.

## How it fits together

1. A visitor registers on `registration.html`. The page sends the chosen courses to `POST /api/registrations`.
2. The server checks everything again: the courses must be Active with free seats and no time clash. It also calculates the price and promo discount itself. The registration is saved as **Pending**.
3. The admin sees it on the dashboard, the Students page and the Registrations page, and can **approve** or **reject** it.
4. Back on the website, "My registrations" shows the new status. Only Pending registrations can be cancelled.

Seats: every registration that is not Rejected takes a seat, so rejecting one frees its seats.

## Folder structure

```
learnova/
├── website/                 the public website (static files)
│   ├── home.html            redirects to index.html (the home page)
│   ├── index.html, courses.html, course-details.html, about.html, contact.html
│   ├── registration.html    course registration
│   ├── css/                 style.css, registration.css
│   └── js/                  main.js, courses.js, registration.js (talks to the API)
├── server/                  Node.js + Express API
│   ├── server.js            routes, static files, admin SPA, errors
│   ├── lib/db.js            read/write data/db.json + seat helpers
│   ├── lib/seed.js          default courses, fixed lists, sample data
│   ├── lib/validate.js      server-side validation
│   ├── middleware/auth.js   users (with a role), tokens, requireLogin/requireRole/requireAdmin
│   ├── routes/              auth, courses, registrations, students, stats, admin
│   └── data/db.json         created automatically (not in git)
├── admin/                   React admin (Vite)
│   └── src/
│       ├── api.js           fetch helper (token, errors, 401 -> login)
│       ├── context/         AuthContext, ToastContext
│       ├── components/      Layout, Modal, CourseForm, ui (badges, avatar, cards...)
│       ├── pages/           Login, Dashboard, Courses, Students, Registrations
│       └── styles/admin.css
├── package.json             root scripts
└── README.md
```

## API endpoints

Errors always look like `{ "message": "...", "errors": { "field": "message" } }`.
Admin endpoints need the header `Authorization: Bearer <token>` from the login.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` → `{ token, name, email, role }` (400 invalid, 401 if wrong) |
| POST | `/api/auth/logout` | logged in | removes the token |
| GET | `/api/courses?status=Active` | public | courses with `enrolled` and `seatsLeft` (status is optional) |
| POST | `/api/courses` | admin | add a course (400 with field errors if invalid) |
| PUT | `/api/courses/:id` | admin | edit; seats can't go below `enrolled`; icon/gradient follow a category change |
| DELETE | `/api/courses/:id` | admin | 409 if the course has registrations ("Set its status to Archived instead") |
| POST | `/api/registrations` | public | register; checks Active, seats and time conflicts (409); calculates the total; saves as Pending |
| GET | `/api/registrations/promo/:code` | public | `{ code, percent }` or 404 |
| GET | `/api/registrations/mine?ids=LRN-1,LRN-2` | public | the registrations made from this browser |
| DELETE | `/api/registrations/:id/cancel` | public | cancel; only while Pending (409 otherwise) |
| GET | `/api/registrations` | admin | all registrations, newest first, with course titles |
| PATCH | `/api/registrations/:id/status` | admin | `{ status }` Pending / Approved / Rejected; leaving Rejected needs a free seat (409) |
| DELETE | `/api/registrations/:id` | admin | delete a registration |
| GET | `/api/students` | admin | one student per email, built from registrations |
| GET | `/api/stats` | admin | dashboard numbers, last 7 days, status counts, popular courses, recent registrations |
| POST | `/api/admin/sample` | admin | add 14 sample registrations |
| POST | `/api/admin/reset` | admin | back to the default courses, no registrations |

Status codes: `200` OK, `201` created, `400` invalid data, `401` not logged in, `403` wrong role, `404` not found, `409` conflict (full course, time clash, can't delete or cancel).

## Demo data

- 8 Active courses plus 1 Draft (Machine Learning Basics, hidden on the website)
- React from Zero and Python Programming meet at the same time, so they can't be booked together
- Cybersecurity Essentials is full (0 seats)
- Promo codes: `LEARN10` (10% off) and `STUDENT20` (20% off)
- Admin menu → **Load sample data** adds 14 registrations from 8 fictional students

## Good to know

This is a learning project, not a production system:

- There is one demo admin account, and the password is in the code. Login tokens are kept in memory, so restarting the server logs the admin out.
- "My registrations" on the website finds registrations by their ID (saved in the browser). Anyone who knows an ID can see that registration's name and email, or cancel it while it is Pending.
- Data is stored in `server/data/db.json`. Delete that file (or use **Reset all data**) to start again.
