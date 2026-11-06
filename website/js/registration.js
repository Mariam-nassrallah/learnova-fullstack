// =====================================================
// Learnova - course registration (registration.html)
// Plain JavaScript. Courses, seats, prices and registrations
// come from the Learnova API (server/).
//
//   0. Helpers, API & saved state
//   1. Toasts
//   2. Countdown
//   3. Catalog (search, filters, sort, cards)
//   4. Cart & conflicts
//   5. Multi-step form (stepper + validation)
//   6. Promo & review
//   7. Submit
//   8. My registrations table
//   9. Confetti
//  10. Start-up
// =====================================================


// =====================================================
// 0. Helpers, API & saved state
// =====================================================
const $ = (id) => document.getElementById(id);

// Turn special characters into HTML entities so user input
// can never be read as HTML when we put it on the page.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

// 70.2 -> "$70.20"
function money(amount) {
  return "$" + Number(amount).toFixed(2);
}

// localStorage can be blocked (private mode), so every read/write is wrapped
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    /* storage unavailable: the page still works for this visit */
  }
}

// Calls the Learnova API. Throws an Error with the server's message if it fails.
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch("/api" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch (err) {
    throw new Error("Can't reach the Learnova server. Is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong.");
    error.status = res.status;
    error.errors = data.errors || {};
    throw error;
  }
  return data;
}

const CART_KEY = "learnova-cart";
const MY_KEY = "learnova-my-registrations"; // IDs of registrations made in this browser

// Registration closes at midnight (local time) on this date
const DEADLINE = new Date("2026-12-01T00:00:00");

let COURSES = [];        // Active courses from the API (with seatsLeft)
let myRegistrations = []; // from GET /api/registrations/mine
let cart = loadJSON(CART_KEY, null) ?? loadJSON("learnova_cart", []); // also reads the old key

const getCourse = (id) => COURSES.find((c) => c.id === id);
const seatsLeft = (course) => course.seatsLeft;

// "Tue & Thu · 18:00"
function scheduleText(course) {
  return `${course.days.map(escapeHTML).join(" & ")} &middot; ${escapeHTML(course.time)}`;
}


// =====================================================
// 1. Toasts
// =====================================================
const TOAST_ICONS = {
  success: "bi-check-circle-fill",
  info: "bi-info-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  danger: "bi-x-circle-fill",
};

// type: success | info | warning | danger
function showToast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast t-${type}`;
  el.setAttribute("role", "status");
  el.innerHTML = `
    <div class="d-flex align-items-center gap-3 p-3">
      <i class="bi ${TOAST_ICONS[type]} toast-icon"></i>
      <div class="flex-grow-1 small toast-text"></div>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  el.querySelector(".toast-text").textContent = message; // textContent = safe
  $("toastArea").appendChild(el);

  // Keep at most 4 toasts on screen: drop the oldest
  const all = $("toastArea").querySelectorAll(".toast");
  if (all.length > 4) all[0].remove();

  const toast = new bootstrap.Toast(el, { delay: 3500 });
  el.addEventListener("hidden.bs.toast", () => el.remove());
  toast.show();
}


// =====================================================
// 2. Countdown
// =====================================================
let registrationClosed = false;
let countdownTimer = null;

function updateCountdown() {
  const diff = DEADLINE - new Date();

  if (diff <= 0) {
    registrationClosed = true;
    ["cdDays", "cdHours", "cdMinutes", "cdSeconds"].forEach((id) => ($(id).textContent = "00"));
    $("countdown").classList.add("closed");
    $("cdLabel").textContent = "Registration is closed for this intake.";
    clearInterval(countdownTimer);
    return;
  }

  const pad = (n) => String(n).padStart(2, "0");
  $("cdDays").textContent = pad(Math.floor(diff / 86400000));
  $("cdHours").textContent = pad(Math.floor(diff / 3600000) % 24);
  $("cdMinutes").textContent = pad(Math.floor(diff / 60000) % 60);
  $("cdSeconds").textContent = pad(Math.floor(diff / 1000) % 60);
}


// =====================================================
// 3. Catalog (search, filters, sort, cards)
// =====================================================
const filters = { search: "", level: "all", sort: "default", availableOnly: false, category: "All" };

// Loads the Active courses (with live seat counts) from the API
async function loadCourses() {
  try {
    COURSES = await api("/courses?status=Active");
    $("catalogError").classList.add("d-none");
  } catch (err) {
    COURSES = [];
    $("catalogError").classList.remove("d-none");
    $("catalogErrorText").textContent = err.message;
  }
  // Drop cart items that are no longer offered
  const before = cart.length;
  cart = cart.filter((id) => getCourse(id));
  if (cart.length !== before && COURSES.length) saveCart();
}

// Category buttons are built from the data, so a new category appears automatically
function renderCategoryButtons() {
  const categories = ["All", ...new Set(COURSES.map((c) => c.category))];
  $("categoryFilters").innerHTML = categories.map((cat) => `
    <button type="button" class="btn filter-btn ${cat === filters.category ? "active" : ""}" data-category="${escapeHTML(cat)}">
      ${escapeHTML(cat)}
    </button>`).join("");
}

function getVisibleCourses() {
  const text = filters.search.trim().toLowerCase();

  let list = COURSES.filter((c) => {
    const matchText = c.title.toLowerCase().includes(text) || c.instructor.toLowerCase().includes(text);
    const matchLevel = filters.level === "all" || c.level === filters.level;
    const matchCategory = filters.category === "All" || c.category === filters.category;
    const matchAvailable = !filters.availableOnly || seatsLeft(c) > 0;
    return matchText && matchLevel && matchCategory && matchAvailable;
  });

  if (filters.sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (filters.sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (filters.sort === "seats-desc") list.sort((a, b) => seatsLeft(b) - seatsLeft(a));
  return list;
}

function courseCardHTML(course, conflictIds) {
  const left = seatsLeft(course);
  const inCart = cart.includes(course.id);
  const percent = course.seats ? Math.round((left / course.seats) * 100) : 0;
  // yellow at 6 or fewer, red at 3 or fewer
  const seatLevel = left <= 3 ? "critical" : left <= 6 ? "low" : "";
  const id = escapeHTML(course.id);

  let button;
  if (inCart) {
    button = `<button type="button" class="btn btn-add btn-added" data-action="remove" data-id="${id}" title="Remove from selection"><i class="bi bi-check-lg"></i> Added</button>`;
  } else if (left === 0) {
    button = `<button type="button" class="btn btn-add btn-full" disabled><i class="bi bi-slash-circle"></i> Full</button>`;
  } else {
    button = `<button type="button" class="btn btn-add btn-glow" data-action="add" data-id="${id}"><i class="bi bi-plus-lg"></i> Add</button>`;
  }

  const classes = ["glass", "reg-card"];
  if (inCart) classes.push("selected");
  if (conflictIds.has(course.id)) classes.push("conflict");
  if (left === 0) classes.push("full");

  return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <article class="${classes.join(" ")}" data-id="${id}">
        <div class="course-thumb ${escapeHTML(course.gradient)}">
          <span class="tag">${escapeHTML(course.category)}</span>
          <i class="bi ${escapeHTML(course.icon)}"></i>
        </div>
        <div class="course-body">
          <div class="course-meta mb-2">
            <span><i class="bi bi-bar-chart"></i> ${escapeHTML(course.level)}</span>
            <span><i class="bi bi-clock"></i> ${escapeHTML(course.duration)}h</span>
          </div>
          <h5 class="fs-6 mb-1">${escapeHTML(course.title)}</h5>
          <p class="small text-muted-c mb-2">by ${escapeHTML(course.instructor)}</p>
          <div class="schedule mb-3"><i class="bi bi-calendar-week"></i> ${scheduleText(course)}</div>
          <div class="d-flex justify-content-between mb-1">
            <span class="seats-text ${seatLevel}">${left === 0 ? "No seats left" : `${left} seat${left === 1 ? "" : "s"} left`}</span>
            <span class="seats-text">${course.seats} total</span>
          </div>
          <div class="seat-bar ${seatLevel} mb-3"><div style="width: ${percent}%"></div></div>
          <div class="d-flex justify-content-between align-items-center mt-auto">
            <span class="price">${money(course.price)}</span>
            ${button}
          </div>
        </div>
      </article>
    </div>`;
}

function renderCatalog() {
  const list = getVisibleCourses();
  const conflictIds = getConflictIds();
  $("courseGrid").innerHTML = list.map((c) => courseCardHTML(c, conflictIds)).join("");
  $("resultCount").textContent = `Showing ${list.length} of ${COURSES.length} courses`;
  // The empty state is only for "no match"; a server error has its own message
  const serverDown = !$("catalogError").classList.contains("d-none");
  $("emptyState").classList.toggle("d-none", list.length > 0 || serverDown);
}

function setupCatalogEvents() {
  $("searchInput").addEventListener("input", (e) => { filters.search = e.target.value; renderCatalog(); });
  $("levelFilter").addEventListener("change", (e) => { filters.level = e.target.value; renderCatalog(); });
  $("sortSelect").addEventListener("change", (e) => { filters.sort = e.target.value; renderCatalog(); });
  $("availableOnly").addEventListener("change", (e) => { filters.availableOnly = e.target.checked; renderCatalog(); });

  $("categoryFilters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    filters.category = btn.dataset.category;
    renderCategoryButtons();
    renderCatalog();
  });

  $("clearFilters").addEventListener("click", () => {
    Object.assign(filters, { search: "", level: "all", sort: "default", availableOnly: false, category: "All" });
    $("searchInput").value = "";
    $("levelFilter").value = "all";
    $("sortSelect").value = "default";
    $("availableOnly").checked = false;
    renderCategoryButtons();
    renderCatalog();
  });

  $("retryLoad").addEventListener("click", refreshCourses);

  // One listener for every Add / Added button (event delegation)
  $("courseGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "add") addToCart(btn.dataset.id);
    if (btn.dataset.action === "remove") removeFromCart(btn.dataset.id);
  });
}

// Reload courses (fresh seat counts) and redraw everything
async function refreshCourses() {
  await loadCourses();
  renderCategoryButtons();
  renderAll();
}


// =====================================================
// 4. Cart & conflicts
// =====================================================

// Two courses conflict when they meet on the same day at the same time.
// Returns a list of pairs: [[courseA, courseB, ["Tue", "Thu"]], ...]
function findConflicts(ids = cart) {
  const courses = ids.map(getCourse).filter(Boolean);
  const pairs = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i];
      const b = courses[j];
      const sharedDays = a.days.filter((d) => b.days.includes(d));
      if (a.time === b.time && sharedDays.length) pairs.push([a, b, sharedDays]);
    }
  }
  return pairs;
}

function getConflictIds() {
  const ids = new Set();
  findConflicts().forEach(([a, b]) => { ids.add(a.id); ids.add(b.id); });
  return ids;
}

function conflictMessage([a, b, days]) {
  return `${a.title} and ${b.title} both meet on ${days.join(" & ")} at ${a.time}.`;
}

function saveCart() {
  saveJSON(CART_KEY, cart);
}

function addToCart(id) {
  const course = getCourse(id);
  if (!course || cart.includes(id)) return;
  if (seatsLeft(course) === 0) {
    showToast(`${course.title} is full.`, "danger");
    return;
  }

  cart.push(id);
  saveCart();
  bumpBadge();
  showToast(`${course.title} added to your selection.`, "success");

  // Warn straight away if the new course clashes with one already selected
  const clash = findConflicts().find(([a, b]) => a.id === id || b.id === id);
  if (clash) showToast(`Schedule conflict: ${conflictMessage(clash)}`, "warning");

  renderAll();
}

function removeFromCart(id) {
  const course = getCourse(id);
  cart = cart.filter((c) => c !== id);
  saveCart();
  bumpBadge();
  if (course) showToast(`${course.title} removed from your selection.`, "info");
  renderAll();
}

function cartSubtotal() {
  return cart.reduce((sum, id) => sum + (getCourse(id)?.price || 0), 0);
}

// Small "pop" animation on the badge whenever the cart changes
function bumpBadge() {
  const badge = $("cartCount");
  badge.classList.remove("bump");
  void badge.offsetWidth; // restart the CSS animation
  badge.classList.add("bump");
}

// One selected-course row (used in the cart panel and in step 2)
function selectedRowHTML(course, isConflict) {
  return `
    <div class="sel-row ${isConflict ? "conflict" : ""}" data-id="${escapeHTML(course.id)}">
      <div class="sel-icon ${escapeHTML(course.gradient)}"><i class="bi ${escapeHTML(course.icon)}"></i></div>
      <div class="flex-grow-1">
        <h6 class="text-truncate">${escapeHTML(course.title)}</h6>
        <div class="small text-muted-c">${scheduleText(course)} &middot; ${money(course.price)}</div>
        ${isConflict ? '<div class="small" style="color:#fcd34d"><i class="bi bi-exclamation-triangle"></i> Time conflict</div>' : ""}
      </div>
      <button type="button" class="btn-remove" data-remove="${escapeHTML(course.id)}" aria-label="Remove ${escapeHTML(course.title)}"><i class="bi bi-trash3"></i></button>
    </div>`;
}

function conflictNotesHTML() {
  return findConflicts().map((pair) => `
    <div class="conflict-note mb-3"><i class="bi bi-exclamation-triangle-fill"></i>
      ${escapeHTML(conflictMessage(pair))} Remove one of them to continue.
    </div>`).join("");
}

function renderCart() {
  const conflictIds = getConflictIds();
  $("cartCount").textContent = cart.length;
  $("cartSubtotal").textContent = money(cartSubtotal());
  $("cartContinue").disabled = cart.length === 0;

  if (cart.length === 0) {
    $("cartItems").innerHTML = `
      <div class="cart-empty"><i class="bi bi-bag"></i><p class="mt-2 mb-0">No courses selected yet.<br>Add some from the catalog.</p></div>`;
    return;
  }
  $("cartItems").innerHTML = conflictNotesHTML() +
    cart.map((id) => selectedRowHTML(getCourse(id), conflictIds.has(id))).join("");
}

// Buttons with data-scroll-to="section-id" close their modal / panel first,
// then scroll, so the page doesn't jump while the overlay is still open
function setupScrollAfterClose() {
  let target = null;
  document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
    btn.addEventListener("click", () => (target = btn.dataset.scrollTo));
  });
  ["hidden.bs.modal", "hidden.bs.offcanvas"].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (target) $(target).scrollIntoView({ behavior: "smooth" });
      target = null;
    });
  });
}

function setupCartEvents() {
  // Remove buttons inside the cart panel and inside step 2
  [$("cartItems"), $("stepCourses")].forEach((container) => {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (btn) removeFromCart(btn.dataset.remove);
    });
  });
}


// =====================================================
// 5. Multi-step form (stepper + validation)
// =====================================================
let currentStep = 1;
const TOTAL_STEPS = 4;

// Each rule returns true when the value is valid (the server checks the same rules)
const RULES = {
  fullName: (v) => v.trim().length >= 3,
  email: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()),
  phone: (v) => /^\d{7,8}$/.test(v),
  occupation: (v) => v !== "",
};

// Adds Bootstrap's is-valid / is-invalid class and returns the result
function validateField(id) {
  const input = $(id);
  const ok = RULES[id](input.value);
  input.classList.toggle("is-valid", ok);
  input.classList.toggle("is-invalid", !ok);
  input.dataset.touched = "true";
  return ok;
}

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

// Checks the current step. Returns true if the user may move on.
function validateStep(step) {
  if (step === 1) {
    const ids = Object.keys(RULES);
    const results = ids.map(validateField); // check every field, not just the first
    const firstBad = ids[results.indexOf(false)];
    if (firstBad) {
      shake($("regForm"));
      $(firstBad).focus();
      return false;
    }
    return true;
  }

  if (step === 2) {
    if (cart.length === 0) {
      showToast("Add at least one course to continue.", "warning");
      shake($("regForm"));
      return false;
    }
    const conflicts = findConflicts();
    if (conflicts.length) {
      showToast(`Schedule conflict: ${conflictMessage(conflicts[0])} Remove one to continue.`, "warning");
      shake($("regForm"));
      return false;
    }
    return true;
  }

  if (step === 3) {
    if (!paymentMethod) {
      $("payError").classList.remove("d-none");
      shake($("paymentOptions"));
      return false;
    }
    return true;
  }

  if (step === 4) {
    const terms = $("terms");
    terms.classList.toggle("is-invalid", !terms.checked);
    if (!terms.checked) {
      shake(terms.closest(".form-check"));
      return false;
    }
    return true;
  }
  return true;
}

function goToStep(step, scroll = true) {
  currentStep = step;

  document.querySelectorAll(".form-step").forEach((panel) => {
    panel.classList.toggle("d-none", Number(panel.dataset.step) !== step);
  });

  // Stepper: earlier steps are "done" (check mark + filled line)
  document.querySelectorAll("#stepper li").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("done", n < step);
    li.classList.toggle("active", n === step);
  });

  if (step === 2) renderStepCourses();
  if (step === 4) renderReview();

  $("backBtn").disabled = step === 1;
  $("nextBtn").innerHTML = step === TOTAL_STEPS
    ? '<i class="bi bi-check2-circle"></i> Confirm registration'
    : 'Next <i class="bi bi-arrow-right"></i>';

  // Keep the top of the form visible on small screens
  const top = $("stepper").getBoundingClientRect().top;
  if (scroll && (top < 0 || top > window.innerHeight)) $("register").scrollIntoView({ behavior: "smooth" });
}

// Step 2: the selected courses and any conflicts
function renderStepCourses() {
  if (cart.length === 0) {
    $("stepCourses").innerHTML = `
      <div class="cart-empty">
        <i class="bi bi-bag"></i>
        <p class="mt-2">You haven't selected any courses yet.</p>
        <a href="#catalog" class="btn btn-ghost btn-sm">Browse the catalog</a>
      </div>`;
    return;
  }
  const conflictIds = getConflictIds();
  $("stepCourses").innerHTML = conflictNotesHTML() +
    cart.map((id) => selectedRowHTML(getCourse(id), conflictIds.has(id))).join("") +
    `<div class="review-line total mt-3"><span>Subtotal (${cart.length} course${cart.length === 1 ? "" : "s"})</span><span>${money(cartSubtotal())}</span></div>`;
}

function setupFormEvents() {
  // Live re-validation: once a field has been checked, re-check it on every keystroke
  Object.keys(RULES).forEach((id) => {
    const input = $(id);
    const eventName = input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, () => {
      if (id === "phone") input.value = input.value.replace(/\D/g, "").slice(0, 8); // digits only
      if (input.dataset.touched) validateField(id);
    });
    input.addEventListener("blur", () => {
      if (input.value !== "") validateField(id);
    });
  });

  $("terms").addEventListener("change", () => {
    if ($("terms").checked) $("terms").classList.remove("is-invalid");
  });

  $("backBtn").addEventListener("click", () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  $("nextBtn").addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
    else submitRegistration();
  });

  // Pressing Enter inside a field acts like "Next" instead of reloading the page
  $("regForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("nextBtn").click();
  });

  // Payment cards
  $("paymentOptions").addEventListener("click", (e) => {
    const card = e.target.closest(".pay-card");
    if (!card) return;
    paymentMethod = card.dataset.method;
    document.querySelectorAll(".pay-card").forEach((c) => c.classList.toggle("active", c === card));
    $("payError").classList.add("d-none");
  });
}


// =====================================================
// 6. Promo & review
// =====================================================
let paymentMethod = null;
let promo = null; // { code: "LEARN10", percent: 10 } - checked by the API

// Preview only: the server calculates the real total when you register
function getTotals() {
  const subtotal = cartSubtotal();
  const percent = promo ? promo.percent : 0;
  const discount = Math.round(subtotal * percent) / 100; // rounded to cents
  return { subtotal, discount, total: subtotal - discount };
}

async function applyPromo() {
  const code = $("promoInput").value.trim().toUpperCase();
  const msg = $("promoMsg");
  const input = $("promoInput");

  if (!code) {
    msg.className = "small mt-2 mb-0 text-danger";
    msg.textContent = "Please type a promo code first.";
    shake(input.closest(".input-group"));
    return;
  }

  $("applyPromo").disabled = true;
  try {
    promo = await api("/registrations/promo/" + encodeURIComponent(code));
    input.value = promo.code;
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    msg.className = "small mt-2 mb-0 discount";
    msg.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${escapeHTML(promo.code)} applied: ${promo.percent}% off your order.`;
    showToast(`Promo ${promo.code} applied: ${promo.percent}% off.`, "success");
  } catch (err) {
    promo = null;
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    msg.className = "small mt-2 mb-0 text-danger";
    msg.innerHTML = `<i class="bi bi-x-circle-fill"></i> ${escapeHTML(err.message)}`;
    shake(input.closest(".input-group"));
    showToast(err.status === 404 ? "That promo code is not valid." : err.message, "danger");
  } finally {
    $("applyPromo").disabled = false;
  }
  if (currentStep === 4) renderReview();
}

// Step 4: everything the student is about to confirm
function renderReview() {
  const { subtotal, discount, total } = getTotals();
  const name = $("fullName").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value;
  const occupation = $("occupation").value;

  const courseLines = cart.map((id) => {
    const c = getCourse(id);
    return `<div class="review-line"><span>${escapeHTML(c.title)} <span class="text-muted-c small">(${scheduleText(c)})</span></span><span>${money(c.price)}</span></div>`;
  }).join("");

  $("reviewBox").innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="review-block h-100">
          <h6>Student</h6>
          <div class="review-line"><span class="text-muted-c">Name</span><span>${escapeHTML(name)}</span></div>
          <div class="review-line"><span class="text-muted-c">Email</span><span class="text-break">${escapeHTML(email)}</span></div>
          <div class="review-line"><span class="text-muted-c">Phone</span><span>+961 ${escapeHTML(phone)}</span></div>
          <div class="review-line"><span class="text-muted-c">Occupation</span><span>${escapeHTML(occupation)}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="review-block h-100">
          <h6>Payment</h6>
          <div class="review-line"><span class="text-muted-c">Method</span><span>${escapeHTML(paymentMethod || "-")}</span></div>
          <div class="review-line"><span class="text-muted-c">Promo code</span><span>${promo ? escapeHTML(promo.code) : "None"}</span></div>
        </div>
      </div>
    </div>
    <div class="review-block mt-3">
      <h6>Courses</h6>
      ${courseLines || '<p class="text-muted-c small mb-0">No courses selected.</p>'}
      <div class="review-line mt-2 pt-2" style="border-top: 1px solid var(--glass-border)"><span class="text-muted-c">Subtotal</span><span>${money(subtotal)}</span></div>
      ${promo ? `<div class="review-line discount"><span>Discount (${escapeHTML(promo.code)}, ${promo.percent}%)</span><span>-${money(discount)}</span></div>` : ""}
      <div class="review-line total"><span>Total</span><span class="grad-text">${money(total)}</span></div>
    </div>`;
}


// =====================================================
// 7. Submit (POST /api/registrations)
// =====================================================
let submitting = false;

async function submitRegistration() {
  if (submitting) return;
  if (registrationClosed) {
    showToast("Registration is closed for this intake.", "danger");
    return;
  }
  // The cart can still change from the panel while on step 4, so check again
  if (!validateStep(2)) {
    goToStep(2);
    return;
  }

  submitting = true;
  const btn = $("nextBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

  try {
    // Only the choices are sent: the server works out prices, seats and the total
    const registration = await api("/registrations", {
      method: "POST",
      body: JSON.stringify({
        name: $("fullName").value.trim(),
        email: $("email").value.trim(),
        phone: $("phone").value,
        occupation: $("occupation").value,
        courseIds: cart,
        payment: paymentMethod,
        promo: promo ? promo.code : "",
      }),
    });

    // Remember this registration so "My registrations" can show it
    const myIds = loadJSON(MY_KEY, []);
    saveJSON(MY_KEY, [registration.id, ...myIds.filter((id) => id !== registration.id)]);

    // Success modal + confetti
    const count = registration.courseIds.length;
    $("successId").textContent = registration.id;
    $("successText").textContent =
      `${count} course${count === 1 ? "" : "s"} booked for ${registration.name}. ` +
      `Total ${money(registration.total)}, paid by ${registration.payment}. Status: Pending approval.`;
    bootstrap.Modal.getOrCreateInstance($("successModal")).show();
    launchConfetti();
    showToast(`Registration ${registration.id} sent! It is now pending approval.`, "success");

    resetForm();
    await Promise.all([refreshCourses(), loadMine()]);
  } catch (err) {
    showToast(err.message, "danger");
    // Seats or courses may have changed since the page loaded
    if (err.status === 409 || err.errors?.courseIds) {
      await refreshCourses();
      goToStep(2);
    }
  } finally {
    submitting = false;
    btn.disabled = false;
    if (currentStep === TOTAL_STEPS) goToStep(TOTAL_STEPS, false); // restore the button label
  }
}

function resetForm() {
  $("regForm").reset();
  document.querySelectorAll("#regForm .is-valid, #regForm .is-invalid").forEach((el) => {
    el.classList.remove("is-valid", "is-invalid");
  });
  Object.keys(RULES).forEach((id) => delete $(id).dataset.touched);
  document.querySelectorAll(".pay-card").forEach((c) => c.classList.remove("active"));
  $("promoMsg").textContent = "";
  paymentMethod = null;
  promo = null;

  cart = [];
  saveCart();
  bumpBadge();
  goToStep(1, false);
  renderAll();
}


// =====================================================
// 8. My registrations table (GET /api/registrations/mine)
// =====================================================
const STATUS_ICONS = { Pending: "bi-hourglass-split", Approved: "bi-check-circle-fill", Rejected: "bi-x-circle-fill" };

async function loadMine() {
  const ids = loadJSON(MY_KEY, []);
  if (!ids.length) {
    myRegistrations = [];
    renderTable();
    return;
  }
  try {
    myRegistrations = await api("/registrations/mine?ids=" + encodeURIComponent(ids.join(",")));
    // Forget IDs the admin has deleted
    saveJSON(MY_KEY, ids.filter((id) => myRegistrations.some((r) => r.id === id)));
  } catch (err) {
    myRegistrations = [];
  }
  renderTable();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    `<br><span class="text-muted-c small">${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>`;
}

function statusBadge(status) {
  const safe = escapeHTML(status);
  return `<span class="status-badge s-${safe.toLowerCase()}"><i class="bi ${STATUS_ICONS[status] || "bi-circle"}"></i> ${safe}</span>`;
}

function renderTable() {
  $("regEmpty").classList.toggle("d-none", myRegistrations.length > 0);
  $("regTableBody").closest("table").classList.toggle("d-none", myRegistrations.length === 0);

  $("regTableBody").innerHTML = myRegistrations.map((r) => {
    const chips = r.courses.map((c) => `<span class="course-chip">${escapeHTML(c.title)}</span>`).join("");
    const action = r.status === "Pending"
      ? `<button type="button" class="btn btn-sm btn-remove" data-cancel="${escapeHTML(r.id)}" title="Cancel registration" aria-label="Cancel registration ${escapeHTML(r.id)}"><i class="bi bi-x-circle"></i></button>`
      : `<span class="text-muted-c small" title="Only pending registrations can be cancelled"><i class="bi bi-lock"></i></span>`;
    return `
      <tr data-id="${escapeHTML(r.id)}">
        <td><code>${escapeHTML(r.id)}</code></td>
        <td><b>${escapeHTML(r.name)}</b><br><span class="small text-muted-c">${escapeHTML(r.email)}</span></td>
        <td style="min-width: 200px">${chips}</td>
        <td>${escapeHTML(r.payment)}${r.promo ? `<br><span class="small discount">${escapeHTML(r.promo)}</span>` : ""}</td>
        <td class="text-end fw-semibold">${money(r.total)}</td>
        <td class="text-nowrap">${formatDate(r.date)}</td>
        <td>${statusBadge(r.status)}</td>
        <td class="text-end">${action}</td>
      </tr>`;
  }).join("");
}

async function cancelRegistration(id) {
  const reg = myRegistrations.find((r) => r.id === id);
  if (!reg) return;
  if (!confirm(`Cancel registration ${id}? Its seats will be released.`)) return;

  try {
    await api(`/registrations/${encodeURIComponent(id)}/cancel`, { method: "DELETE" });
    saveJSON(MY_KEY, loadJSON(MY_KEY, []).filter((x) => x !== id));
    showToast(`Registration ${id} cancelled. ${reg.courseIds.length} seat${reg.courseIds.length === 1 ? "" : "s"} released.`, "info");

    // Fade the row out, then reload (seat counts go back up)
    const row = document.querySelector(`#regTableBody tr[data-id="${CSS.escape(id)}"]`);
    if (row) row.classList.add("removing");
    setTimeout(() => Promise.all([refreshCourses(), loadMine()]), 350);
  } catch (err) {
    showToast(err.message, "danger");
    loadMine(); // the status may have changed (e.g. approved meanwhile)
  }
}

function setupTableEvents() {
  $("regTableBody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cancel]");
    if (btn) cancelRegistration(btn.dataset.cancel);
  });
}


// =====================================================
// 9. Confetti (pure CSS animation, pieces made in JS)
// =====================================================
const CONFETTI_COLORS = ["#8b5cf6", "#22d3ee", "#f472b6", "#facc15", "#34d399", "#ffffff"];

function launchConfetti() {
  const box = $("confetti");
  for (let i = 0; i < 140; i++) {
    const piece = document.createElement("span");
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDuration = 2.2 + Math.random() * 2 + "s";
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    piece.style.setProperty("--drift", (Math.random() * 240 - 120) + "px");
    piece.style.setProperty("--spin", Math.random() * 900 + "deg");
    if (Math.random() > 0.5) piece.style.borderRadius = "50%";
    box.appendChild(piece);
  }
  setTimeout(() => (box.innerHTML = ""), 5000);
}


// =====================================================
// 10. Start-up
// =====================================================
function renderAll() {
  renderCatalog();
  renderCart();
  if (currentStep === 2) renderStepCourses();
  if (currentStep === 4) renderReview();
}

// Coming from a course page: registration.html?course=react&name=...&email=...
function readUrlParams() {
  const params = new URLSearchParams(location.search);
  if (!params.toString()) return;

  const wanted = params.get("course");
  const course = getCourse(wanted);
  if (course && !cart.includes(course.id)) {
    if (seatsLeft(course) > 0) addToCart(course.id);
    else showToast(`${course.title} is full. Please choose another course.`, "danger");
  } else if (wanted && !course && COURSES.length) {
    showToast("That course is not open for registration right now.", "warning");
  }
  if (params.get("name")) $("fullName").value = params.get("name");
  if (params.get("email")) $("email").value = params.get("email");
  if (params.get("phone")) $("phone").value = params.get("phone").replace(/\D/g, "").replace(/^961/, "").slice(0, 8);

  // Clean the address bar so a refresh doesn't add the course again
  history.replaceState(null, "", location.pathname + "#register");
  if (course) $("register").scrollIntoView();
}

async function start() {
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);

  setupCatalogEvents();
  setupCartEvents();
  setupScrollAfterClose();
  setupFormEvents();
  setupTableEvents();
  $("applyPromo").addEventListener("click", applyPromo);
  $("promoInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyPromo(); }
  });

  goToStep(1, false);
  await Promise.all([loadCourses(), loadMine()]);
  renderCategoryButtons();
  renderAll();
  readUrlParams();
}

start();
