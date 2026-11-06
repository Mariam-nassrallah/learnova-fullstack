// ===== Learnova - small interactions =====

// 1. Mobile menu: close it after a link (or the cart button) inside it is clicked
const mainNav = document.getElementById("mainNav");
if (mainNav && window.bootstrap) {
  mainNav.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", () => {
      if (mainNav.classList.contains("show")) bootstrap.Collapse.getOrCreateInstance(mainNav, { toggle: false }).hide();
    });
  });
}

// 2. Reveal elements when they scroll into view
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// 3. Count numbers up (e.g. <span class="counter" data-target="2500">0</span>)
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

// 4. Course category filter + search (courses page only)
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

// 5. Forms (contact + newsletter): show a confirmation instead of reloading the page
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
