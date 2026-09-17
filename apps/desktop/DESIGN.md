---
title: "Continua — Apple (designmd.supply) reference design"
source: "https://designmd.supply/guides/apple.com (generated from Apple brand identity via Context.dev)"
tokens: primary #0071e3, secondary #0066cc, tertiary #f5f5f7, neutral 0 #fff / 50 #f5f5f7 / 100 #e5e7eb / 900 #1d1d1f, muted #6e6e73, error #d92d20
scope: apps/desktop (browser chrome + start page)
supersedes: the Geist (Vercel) reference previously in this file
---

# DESIGN.md — Continua · Apple

Design system reference for the Continua desktop browser UI, derived from
Apple's design language (via designmd.supply). The browser chrome stays
quiet so content dominates: generous space, short confident copy, SF type,
one action blue, pill actions, soft 8px cards, no shadows, no gradients.

> Dark-mode mapping: Apple.com is light-first, but Continua is dark-first
> (and Apple dark surfaces are near-black). Dark theme keeps `#000` window /
> `#161617`-family chrome with white text; the blue tokens stay identical
> (`primary #0071e3` fills, `#2997ff` for small link text on dark only, where
> `#0066cc` would fail contrast). Everything else follows the guide exactly.

## Overview

- Restrained, premium, editorial. Content dominates; chrome is quiet.
- One accent color only (Apple blue). Error keeps its own red; incognito
  keeps violet for safety; no other decorative color.
- Borders do the separation work — no shadows, no glassmorphism, no complex
  gradients.
- Typography is the hero: SF Pro Display for headlines, SF Pro Text for UI.

## Colors

| Token | Value | Use |
|---|---|---|
| primary | `#0071e3` | filled CTA buttons, active/focus states |
| secondary | `#0066cc` | links, outline buttons (light) |
| link-on-dark | `#2997ff` | small link text on dark surfaces only |
| tertiary | `#f5f5f7` | light section / page tint |
| neutral.900 | `#1d1d1f` | primary text (light) |
| neutral.50 | `#f5f5f7` | page tint behind hero sections |
| neutral.100 | `#e5e7eb` | subtle borders (light) |
| on-surface.muted | `#6e6e73` | secondary explanatory text |
| error | `#d92d20` | destructive only |
| incognito | `#7928ca` | private-tab identity (unchanged house rule) |

Dark surfaces: window `#000`, chrome `#0a0a0a`, cards `#161617`, primary
text `#f5f5f7`, secondary `#86868b`, hairlines `rgba(255,255,255,0.12)`.

## Typography

- Display stack: `-apple-system, "SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif`
  (Inter renders on Linux where SF is absent; keep it in the stack after SF).
- Text stack: `-apple-system, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif`.
- Mono (URLs, kbd hints, IDs): `ui-monospace, "SF Mono", Menlo, Monaco, monospace`.
- Headlines short (2–5 words), semibold; button labels regular; generous
  headline↔subhead spacing — never compressed.

## Layout

- Centered editorial hero: headline → short subhead → paired CTA row.
- Spacing scale: xs 4 / sm 12 / md 20 / lg 44 / xl 102.
- Start page: centered column; hero at top; cards below; generous negative
  space — never dense dashboard grids.
- Navigation (tab strip, toolbar) visually quieter than content.

## Elevation

- `box-shadow: none` everywhere. Thin borders instead of shadows for cards
  and panels. No glassmorphism, no ambient glows.

## Shapes

- `rounded.full = 980px` — signature pill for buttons and the address bar.
- `rounded.md = 8px` — cards, tiles, panels, menus.
- `rounded.sm = 4px` — compact elements, kbd hints.
- Primary actions min-height 44px in hero/marketing contexts; compact
  `8px 16px` pills in dense chrome rows.

## Components

- **Buttons**: primary = solid `#0071e3`, white text, pill; secondary =
  transparent, `#0066cc` border + text, pill; link = blue text, no
  border/padding. Paired primary + secondary in hero blocks.
- **Address bar**: pill, 1px border, focus border `primary`; URL text mono.
- **Tab**: 8px radius; active tab gets a quiet surface fill (no underline);
  incognito shows violet badge; audio shows speaker glyph.
- **Cards / tiles**: 8px radius, 16px padding, 1px border, no shadow. Hover:
  border brightens.
- **kbd hints**: 1px border, mono 11px.
- **Toasts**: quiet surface + 1px border, compact single-line.

## Do's and Don'ts

- DO keep one accent color; let type and space carry the design.
- DO use pill buttons with sentence-case short labels.
- DO keep copy short, specific, benefit-driven.
- DON'T use heavy shadows, glassmorphism, or complex gradients.
- DON'T use square buttons for primary actions.
- DON'T build dense, data-heavy layouts as the default.
- DON'T let decorative color falsify state — blue = interactive, violet =
  incognito, red = error only.
