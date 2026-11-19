// =====================================================
// Page scroll lock (used by Modal)
// html and body use overflow-x: clip, so the page is locked with
// a class on <html> (overflow: hidden, see admin.css). The scrollbar's
// width is measured first and added as padding to <html> and the top
// bar, so nothing moves sideways.
// Several modals can be open at once (a confirm dialog on top of the
// details modal): the page unlocks when the last one closes.
//
//   const unlock = lockScroll();
//   ...
//   unlock();
// =====================================================
let locks = 0;

export function lockScroll() {
  const root = document.documentElement;
  if (locks === 0) {
    root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
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
