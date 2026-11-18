// =====================================================
// ResponsiveTable: one component for every admin table
//   >= 768px  a normal table; columns with `hide` are only
//             shown from that breakpoint up (d-none d-lg-table-cell)
//   <  768px  every row becomes a stacked card:
//             title, "Label: value" lines, status, then the
//             action buttons in a full-width row
// Nothing is ever wider than the screen: cells wrap long text
// instead of pushing the width.
//
// <ResponsiveTable
//   rows={courses}
//   rowKey={(c) => c.id}
//   label="Courses"
//   columns={[
//     { key: "title", label: "Course", card: "title", render: (c) => ... },
//     { key: "level", label: "Level", hide: "xl", render: (c) => c.level },
//     { key: "price", label: "Price", align: "end", render: (c) => money(c.price) },
//     { key: "status", label: "Status", card: "status", render: (c) => <StatusBadge ... /> },
//   ]}
//   actions={(c) => [
//     { icon: "bi-pencil", label: "Edit", ariaLabel: `Edit ${c.title}`, onClick: () => openEdit(c) },
//     { icon: "bi-trash3", label: "Delete", danger: true, onClick: () => remove(c) },
//   ]}
// />
//
// Action options: icon, label, onClick, ariaLabel, danger, disabled,
//   text (true = a labelled button in the table too, not just an icon)
//
// Column options
//   label      header text (also the label in the card)
//   render     (row) => cell content
//   hide       "md" | "lg" | "xl" | "xxl": table column only shown from this breakpoint up
//   align      "end" to right-align (numbers, money)
//   nowrap     keep the cell on one line (short values: dates, prices)
//   className  extra classes for the <td>
//   card       "title"  -> card heading
//              "status" -> shown under the fields
//              false    -> left out of the card
//              (default) a "Label: value" line
// =====================================================
import { useSyncExternalStore } from "react";

// Same breakpoint as Bootstrap's md
const PHONE_QUERY = "(max-width: 767.98px)";

export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

const hideClass = (bp) => (bp ? `d-none d-${bp}-table-cell` : "");

function cellClass(col) {
  return [
    hideClass(col.hide),
    col.align === "end" ? "text-end" : "",
    col.nowrap ? "text-nowrap" : "",
    col.className || "",
  ].filter(Boolean).join(" ");
}

export default function ResponsiveTable({ rows, rowKey, columns, actions, actionsLabel = "", label }) {
  const isPhone = useMediaQuery(PHONE_QUERY);

  // Phone: stacked cards ---------------------------------
  if (isPhone) {
    const titleCol = columns.find((c) => c.card === "title");
    const statusCol = columns.find((c) => c.card === "status");
    const fields = columns.filter((c) => c.card === undefined || c.card === true);

    return (
      <ul className="rt-cards" aria-label={label}>
        {rows.map((row) => {
          const buttons = actions ? actions(row).filter(Boolean) : [];
          return (
            <li className="rt-card" key={rowKey(row)}>
              {titleCol && <div className="rt-card-title">{titleCol.render(row)}</div>}
              {fields.length > 0 && (
                <dl className="rt-fields">
                  {fields.map((col) => (
                    <div className="rt-field" key={col.key}>
                      <dt>{col.label}:</dt>
                      <dd>{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {statusCol && <div className="rt-card-status">{statusCol.render(row)}</div>}
              {buttons.length > 0 && (
                <div className="rt-card-actions">
                  {buttons.map((b) => (
                    <button key={b.label} type="button" className={`btn btn-sm ${b.danger ? "btn-danger-soft" : "btn-soft"}`}
                      aria-label={b.ariaLabel} disabled={b.disabled} onClick={b.onClick}>
                      <i className={`bi ${b.icon}`}></i> {b.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  // Tablet + desktop: table -------------------------------
  return (
    <div className="rt-table-wrap">
      <table className="table admin-table align-middle mb-0" aria-label={label}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cellClass({ ...col, className: "" })}>{col.label}</th>
            ))}
            {actions && <th scope="col" className="text-end">{actionsLabel || <span className="visually-hidden">Actions</span>}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => <td key={col.key} className={cellClass(col)}>{col.render(row)}</td>)}
              {actions && (
                <td className="text-end text-nowrap rt-actions">
                  {actions(row).filter(Boolean).map((b) => b.text ? (
                    <button key={b.label} type="button" className={`btn btn-sm ${b.danger ? "btn-danger-soft" : "btn-soft"}`}
                      aria-label={b.ariaLabel} disabled={b.disabled} onClick={b.onClick}>
                      <i className={`bi ${b.icon}`}></i> {b.label}
                    </button>
                  ) : (
                    <button key={b.label} type="button" className={`icon-btn sm ${b.danger ? "danger" : ""}`}
                      title={b.label} aria-label={b.ariaLabel || b.label} disabled={b.disabled} onClick={b.onClick}>
                      <i className={`bi ${b.icon}`}></i>
                    </button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
