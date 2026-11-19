// ===== Learnova - small interactions =====

// 1. Page scroll lock (mobile menu, modals, cart panel)
//    html and body use overflow-x: clip, so the page is locked with a class on
//    <html> (overflow: hidden). The scrollbar's width is measured first and
//    added as padding to <html> and the fixed navbar, so nothing moves sideways.
//    Several things can hold the lock at once; the page unlocks when the last
//    one lets go.
const root = document.documentElement;
const scrollLocks = new Set();

function lockScroll(owner) {
  if (scrollLocks.size === 0) {
    root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
    root.classList.add("scroll-locked");
  }
  scrollLocks.add(owner);
}

function unlockScroll(owner) {
  scrollLocks.delete(owner);
  if (scrollLocks.size === 0) {
    root.classList.remove("scroll-locked");
    root.style.removeProperty("--scrollbar-w");
  }
}

// Bootstrap modals and the cart panel (offcanvas). The "show" event comes
// before Bootstrap measures the scrollbar, so it doesn't add its own padding.
["modal", "offcanvas"].forEach((type) => {
  document.addEventListener(`show.bs.${type}`, (e) => { if (!e.defaultPrevented) lockScroll(e.target); });
  document.addEventListener(`hidden.bs.${type}`, (e) => unlockScroll(e.target));
});

// 2. Mobile menu (under 992px): opens inside the fixed navbar
//    - the page is locked while it is open
//    - closes after a link (or the cart button) inside it is clicked, on Esc,
//      and when the screen gets wide enough for the full navbar
const mainNav = document.getElementById("mainNav");
if (mainNav && window.bootstrap) {
  const menu = bootstrap.Collapse.getOrCreateInstance(mainNav, { toggle: false });
  const toggler = document.querySelector('[data-bs-target="#mainNav"]');
  const closeMenu = () => { if (mainNav.classList.contains("show")) menu.hide(); };

  mainNav.addEventListener("show.bs.collapse", (e) => { if (e.target === mainNav) lockScroll(mainNav); });
  mainNav.addEventListener("hidden.bs.collapse", (e) => { if (e.target === mainNav) unlockScroll(mainNav); });

  mainNav.querySelectorAll("a, button").forEach((item) => item.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("show")) {
      closeMenu();
      if (toggler) toggler.focus();
    }
  });

  window.matchMedia("(min-width: 992px)").addEventListener("change", (e) => { if (e.matches) closeMenu(); });
}

// 3. Reveal elements when they scroll into view
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// 4. Count numbers up (e.g. <span class="counter" data-target="2500">0</span>)
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = +el.dataset.target;
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current === target) clearInterval(timer);
    }, 25);
    counterObserver.unobserve(el);
  });
});
document.querySelectorAll(".counter").forEach((el) => counterObserver.observe(el));

// 5. Course category filter + search (courses page only)
const filterButtons = document.querySelectorAll(".filter-btn");
const courseItems = document.querySelectorAll(".course-item");
const searchInput = document.querySelector("#searchCourses");
let activeFilter = "all";

function applyFilters() {
  const text = searchInput ? searchInput.value.toLowerCase() : "";
  courseItems.forEach((item) => {
    const matchCategory = activeFilter === "all" || item.dataset.category === activeFilter;
    const matchText = item.textContent.toLowerCase().includes(text);
    item.classList.toggle("d-none", !(matchCategory && matchText));
  });
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});
if (searchInput) searchInput.addEventListener("input", applyFilters);

// 6. Forms (contact + newsletter): show a confirmation instead of reloading the page
//    Forms marked data-no-auto handle themselves (enroll modal, registration form)
document.querySelectorAll("form:not([data-no-auto])").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    let msg = form.querySelector(".form-msg");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "form-msg small mt-3 mb-0";
      msg.style.color = "var(--cyan)";
      form.appendChild(msg);
    }
    msg.innerHTML = '<i class="bi bi-check-circle-fill"></i> Thanks! Your message has been sent. We\'ll reply soon.';
    form.reset();
    if (btn) btn.disabled = true;
    setTimeout(() => { if (btn) btn.disabled = false; }, 2500);
  });
});
