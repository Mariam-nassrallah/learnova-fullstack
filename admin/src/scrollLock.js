// =====================================================
// Page scroll lock (used by Modal)
// The lock is a class on <html> (see admin.css):
//   - computers: <html> gets overflow: hidden (the window scrolls)
//   - phones (app shell): .admin-scroll gets overflow: hidden
// The scrollbar's width is measured first and added as padding,
// so nothing moves sideways.
// Several modals can be open at once (a confirm dialog on top of the
// details modal): the page unlocks when the last one closes.
//
//   const unlock = lockScroll();
//   ...
//   unlock();
// =====================================================
let locks = 0;

// What scrolls the page right now: .admin-scroll on phones, else <html>
function scrollbarWidth() {
  const root = document.documentElement;
  const area = document.querySelector(".admin-scroll");
  const phoneShell = root.classList.contains("app-shell") && window.matchMedia("(max-width: 991.98px)").matches;
  return phoneShell && area ? area.offsetWidth - area.clientWidth : window.innerWidth - root.clientWidth;
}

export function lockScroll() {
  const root = document.documentElement;
  if (locks === 0) {
    root.style.setProperty("--scrollbar-w", `${scrollbarWidth()}px`);
    root.classList.add("scroll-locked");
  }
  locks++;

  let released = false;
  return function unlock() {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0) {
      root.classList.remove("scroll-locked");
      root.style.removeProperty("--scrollbar-w");
    }
  };
}
