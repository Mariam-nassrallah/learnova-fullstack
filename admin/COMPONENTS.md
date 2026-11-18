# Admin components

Reusable pieces of the React admin (`admin/src/components/`). Every color comes from the CSS variables in `styles/admin.css`, so each component works in both the light and the dark theme.

| Component | File | What it does |
|---|---|---|
| `Layout` | `Layout.jsx` | Sidebar, top bar, footer and the shared confirm dialog around every page |
| `Modal` | `Modal.jsx` | Bootstrap-styled dialog controlled by React (Esc / backdrop click closes it) |
| `CourseForm` | `CourseForm.jsx` | Add / edit course modal with validation |
| `ResponsiveTable` | `ResponsiveTable.jsx` | Every data table: a table on tablet and desktop, stacked cards on phones |
| `ThemeToggle` | `ThemeToggle.jsx` | Light / dark switch in the top bar |
| `StatusBadge`, `Avatar`, `StatCard`, `EmptyState`, `Loading`, `SearchInput`, `CourseIcon` | `ui.jsx` | Small building blocks |

## ResponsiveTable

Use it for every list of records so all pages behave the same on every screen. Nothing it renders is ever wider than the screen.

| Screen width | What is shown |
|---|---|
| 768px and up | A normal table. Columns with `hide` only appear from that breakpoint up (`d-none d-xl-table-cell`). Long text wraps; it never pushes the width. |
| Under 768px | One card per row: the title on top, then `Label: value` lines, the status, and the action buttons side by side across the full width at the bottom. |

### Example

```jsx
import ResponsiveTable from "../components/ResponsiveTable.jsx";

<ResponsiveTable
  label="Courses"
  rows={visible}
  rowKey={(c) => c.id}
  actionsLabel="Actions"
  columns={[
    { key: "course", label: "Course", card: "title", render: (c) => <b>{c.title}</b> },
    { key: "level", label: "Level", hide: "xl", render: (c) => c.level },
    { key: "price", label: "Price", align: "end", nowrap: true, render: (c) => money(c.price) },
    { key: "status", label: "Status", card: "status", render: (c) => <StatusBadge status={c.status} /> },
  ]}
  actions={(c) => [
    { icon: "bi-pencil", label: "Edit", ariaLabel: `Edit ${c.title}`, onClick: () => openEdit(c) },
    { icon: "bi-trash3", label: "Delete", ariaLabel: `Delete ${c.title}`, danger: true, onClick: () => remove(c) },
  ]}
/>
```

### Props

| Prop | Type | Description |
|---|---|---|
| `rows` | array | The records to show |
| `rowKey` | `(row) => string` | Unique key for each row |
| `columns` | array | Column definitions (below) |
| `actions` | `(row) => Action[]` | Optional buttons for each row |
| `actionsLabel` | string | Header text of the actions column (hidden from view when empty) |
| `label` | string | Accessible name of the table / card list |

### Column options

| Option | Description |
|---|---|
| `key` | Unique id of the column |
| `label` | Header text, also used as the label in the card |
| `render` | `(row) => content` for the cell |
| `hide` | `"md"`, `"lg"`, `"xl"` or `"xxl"`: in table mode the column is only shown from this breakpoint up. Cards always show it. |
| `align` | `"end"` to right-align (money, numbers) |
| `nowrap` | Keep a short value on one line (dates, prices) |
| `className` | Extra classes for the `<td>`, e.g. `rt-person` (name + email column, min 220px) or `rt-enrolled` |
| `card` | `"title"`: card heading. `"status"`: shown under the fields. `false`: left out of the card. Not set: a `Label: value` line. |

When a column is hidden on tablets, put its value in the title cell with `d-none d-md-inline d-xl-none`, so tablet users still see it (the Courses, Students and Registrations pages do this).

### Action options

| Option | Description |
|---|---|
| `icon` | Bootstrap Icons class, e.g. `bi-pencil` |
| `label` | Button text in cards, tooltip in the table |
| `onClick` | Click handler |
| `ariaLabel` | Screen reader label, e.g. `Edit React from Zero` |
| `danger` | Red style (delete) |
| `disabled` | Disable the button |
| `text` | `true` shows a labelled button in the table too, instead of an icon only |

### Also exported

`useMediaQuery(query)` returns `true` while the CSS media query matches, and updates when the screen size changes:

```js
import { useMediaQuery } from "../components/ResponsiveTable.jsx";
const isPhone = useMediaQuery("(max-width: 767.98px)");
```

### Styles

`styles/admin.css`, section 7 "Responsive table": `.rt-table-wrap`, `.rt-cards`, `.rt-card`, `.rt-card-title`, `.rt-fields`, `.rt-field`, `.rt-card-status`, `.rt-card-actions`.

## Responsive rules for the whole admin

- `html, body { overflow-x: clip; }`: the page can only scroll vertically.
- Media, tables and form controls have `max-width: 100%`. Grid columns, panels and modals can shrink (`min-width: 0`).
- Under 768px: search, filters and the page's main button take the full width; modal footer buttons share the width.
- Course form: every field is stacked under 576px (from 576px, Duration / Price / Seats sit side by side; the other fields stay stacked up to 768px).
- Under 576px: stat cards put the icon above the number, and modals take the full width.
- Sidebar: fixed on screens 992px and wider, a slide-in panel below that (menu button in the top bar).
