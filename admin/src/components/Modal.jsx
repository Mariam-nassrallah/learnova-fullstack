// =====================================================
// Modal: a Bootstrap-styled dialog controlled by React
// (no Bootstrap JavaScript). Closes with Esc or a click
// on the backdrop. The page behind it is locked while it
// is open (scrollLock.js).
// =====================================================
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "../scrollLock.js";

export default function Modal({ show, onClose, title, children, footer, size = "", labelId = "modalTitle" }) {
  // The page behind the modal can't scroll (lock on <html>, see scrollLock.js)
  useEffect(() => {
    if (!show) return;
    return lockScroll();
  }, [show]);

  // Esc closes the modal
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  return createPortal(
    <>
      <div className="modal-backdrop show"></div>
      <div
        className="modal d-block admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        // Only a click on the backdrop itself closes (not inside the dialog)
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={labelId}>{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
