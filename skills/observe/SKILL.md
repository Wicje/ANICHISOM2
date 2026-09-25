# Observe — SEE the page before you act

Call `see_tab` (or `observe_tab`) first, always. It returns:

- `summary` — node counts, editable/clickable cells, role histogram.
- `index` — flat, addressable nodes: `{ id, role, name, value, href, checked,
  disabled, hidden }`.
- `tab` — the label/url/title you addressed.

## Reading the output

- Node `id`s are index-paths into the DOM element tree, e.g. `"0.2"` = the
  2nd element child of the 1st child of `<body>`. Treat them as opaque tokens;
  resolve them no further. Never guess selectors.
- Trust `hidden`/`disabled` — acting on them is refused host-side.
- `name` may already be truncated; request more text with the page-text path
  only when the field is literally an input you must read.

## Call it again

- After any navigation or DOM change, re-observe before choosing a target.
  A stale index is the #1 cause of acting on the wrong element.
- Long pages: snapshots cap at ~600 nodes; target early, re-observe as you go.