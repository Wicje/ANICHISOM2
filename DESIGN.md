---
title: "Continua — Geist (Vercel) reference design"
source: "https://vercel.com / geist-org/geist-ui"
tokens: extracted from geist-ui theme presets (dark + light)
scope: apps/desktop (browser chrome + start page)
---

# DESIGN.md — Continua · Geist (Vercel)

Design system reference for the Continua desktop browser UI, derived from
Vercel's Geist design language. The browser chrome is a **launcher-style
toolbar**, so we adopt Geist's restraint: strong type over ornament, a strict
near-square radius, 1px hairline borders, and a single saturated action color.

## Overview

- Precise, editorial, dark-first. Black #000 canvas like Vercel's dark UI.
- One accent color only (Geist link/success blue). Error keeps its own red;
  incognito keeps violet for safety; no other decorative color.
- Hairline borders do the separation work — no heavy shadows, no gradients
  except the single accent-tinted glow used for the active/focused states.
- Typography is the hero: tab titles, address text and hints are the visual
  surface, set in Inter (Geist Sans is preferred once a vendored font exists),
  mono for URLs and keyboard hints.

## Colors

Dark (default):
| Token | Value | Use |
|---|---|---|
| background | `#000` | window / app shell |
| chrome-bg | `#0a0a0a` | toolbar strip |
| surface | `#111` | cards, panels (Geist accents_1) |
| surface-card | `rgba(17,17,17,0.85)` | translucent cards |
| foreground | `#fff` | primary text |
| secondary | `#888` | secondary text (Geist accents_5/6) |
| border | `#333` | 1px hairlines (Geist accents_2) |
| border-faint | `rgba(255,255,255,0.08)` | faint separators |
| hover | `rgba(255,255,255,0.08)` | row / tile hover |
| link / accent | `#3291ff` | primary action, focus ring, active tab |
| accent-deep / dark | `#0761d1` | pressed, hover of primary action |
| accent-hi / light | `#76b9ff` | focus glow, hover text on dark |
| selection | `#79ffe1` | text selection |
| code | `#79ffe1` | inline code / vault key |
| error | `#e00` | destructive, close hover |
| warning | `#f5a623` | status warnings |
| incognito | `#7928ca` → light `#8a63d2` | private-tab identity (Geist violet) |

Light:
| Token | Value |
|---|---|
| background | `#fff` |
| chrome-bg | `#fafafa` |
| surface | `#fff` |
| foreground | `#000` |
| secondary | `#666` |
| border | `#eaeaea` |
| link / accent | `#0070f3` |
| accent-dark | `#0761d1` |
| hover | `rgba(0,0,0,0.06)` |
| error | `#e00` |
| incognito | `#7928ca` |

## Typography

- Sans stack: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  (swap the first entry for `"Geist"` once the font is vendored).
- Mono stack: `Menlo, Monaco, Lucida Console, "Liberation Mono", "DejaVu Sans Mono", monospace`
  — reserved for URLs, keyboard hints (`kbd`), timestamps, device info.
- Hierarchy (approx): chrome buttons 12px/500; tab titles 13px/500; address
  input 13px; start-page h1 30px/650 tracking -0.02em; card titles 13px/600;
  dimmed metadata 11–11.5px/450 with 0.05em letterspacing.
- Line height 1.5 for body text; tight (1.15) for display text.

## Layout

- Unit: 16px. Horizontal chrome gutter 10px, vertical 8px; 4px between rows.
- Start page: centered column, max ~1120px; hero at top, three equal cards
  (grid, 1fr gaps 12px), stacking below 900px.
- Vertical rail (overflow tabs) fixed 44px, hairline right border on the rail.
- Breakpoints: mobile <650px, tablet <900px, desktop ≥900px — chrome compact
  at ≤1000px (icon-strings hidden), ≤860px (labels hidden), ≤680px (icons
  hidden).

## Elevation

- Flattened, Vercel-style: panels pop with 1px `#333` borders + a faint
  background, not depth.
- The only shadow is a soft ambient glow used for focus/active states and the
  first-run hint: `0 8px 28px rgba(0,0,0,0.4), 0 0 18px rgba(50,145,255,0.09)`.
- Dropdown/palette surface: solid `#111`, 1px `#333` border, no drop shadow.

## Shapes

- Radius: **6px** (Geist `layout.radius`). Applied uniformly to buttons, cards,
  tiles, inputs, pills, panel corners.
- Do NOT use large-radius (12px+) "pill/card" shapes — that is the brass-era
  language we are retiring.
- Exceptions: scrollbar thumb radius stays fully round (999px); the browser
  window itself is undecorated/square.

## Components

- **Chrome buttons**: ghost squares ~28px, radius 6px, icon 14–15px; hover =
  background `rgba(255,255,255,0.08)`; active/pressed = accent-tinted.
- **Address bar**: full-width input, radius 6px, 1px `#333` border, focus
  border `#3291ff` + faint blue glow ring; URL text in mono 12px.
- **Tab**: 7px radius, active tab gets a 2px accent underline or accent-red
  text; vault shows the real title + a muted 11px lock glyph; incognito shows
  a violet badge.
- **Buttons (primary)**: solid `#fff` background with black text (Vercel style)
  OR solid accent `#0070f3`/`#3291ff` with white text; radius 6px; 500 weight.
  Secondary = ghost `#111` with 1px `#333` border.
- **Cards / tiles**: `#111` surface, 1px `#333` border, radius 6px, padding
  12–16px. Hover: border brightens to `#666`.
- **kbd hints**: 1px border, 2px bottom border (keycap feel), mono 11px.
- **Toasts / first-run hint**: `#111` surface + 1px `#333` border + the soft
  ambient glow; compact single-line where possible.

## Do's and Don'ts

- DO keep one accent color; let type and hairlines carry the design.
- DO use mono fonts for anything machine-y (URLs, shortcuts, IDs).
- DON'T re-introduce brass/gold, vintage shadows, or 12px+ card radii.
- DON'T use gradients (bar the single accent glow used on focus/active).
- DON'T let decorative color falsify state — blue = interactive, violet =
  incognito, red = error only.
- DO keep density: this is a toolbar, not a dashboard.