# Verify — prove it before you claim it

Post-condition checking is mandatory for every write, and cheap for reads.

## After any action

1. Re-observe the page (`see_tab`).
2. Check the *observable* change, not the intended one:
   - typed → confirm the node's `value` matches,
   - clicked → confirm the navigation (`see_tab` → `tab.url`) or state change,
   - form → confirm before/after affordance changed, not just that JS ran.
3. If the state did not change, report it as failed — do not retry with
   stronger parameters unless the human says so.

## After navigation

- The host re-snapshots per navigation. Compare `tab.url` before/after.
- Stale handles die: after any load, the old index is void. Re-observe.

## Claiming done

- "Done" means verified. Present the evidence line you captured (url/value/
  state delta), not an assertion. Unsure → run `debrief` and re-verify.

## Timeboxing

- No infinite verify loops. Two re-observations, then report and ask.