# Brand system — "Sunlit Clay"

Derived from the live site by `sr-tokens.mjs`, then extended by a redesign layer appended to
`src/styles/tokens.css` by `src/tools/append-redesign-tokens.mjs` (source text:
`src/styles/tokens.redesign-layer.txt`). The measured values and their evidence live in
`audit/design-baseline.json`.

## Evidence

`audit/design-baseline.json` → evidence: **computed (browser capture)**, from 60 page captures at 390 / 768 / 1024 / 1440px.
Every brand colour below is the source's own (occurrence counts in the capture are in the token
file's header comment). The clay surfaces and shadow tones are the only invented colours: a
neumorphic surface needs a mid-light solid ground and two shadow tones derived from it.

## Colour

| token | value | role |
|---|---|---|
| `--ink` | `var(--c-6)` → #231f20 | primary text |
| `--ink-2` | `var(--c-4)` → #55575c | secondary text |
| `--ink-3` | `color-mix(in oklab, var(--c-7) 80%, var(--c-6))` → #585a5f | muted text — the source grey (--c-7) deepened: alone it is 4.39:1 on clay, under AA |
| `--paper` | `var(--c-3)` → #ffffff | text on dark / solid fills |
| `--sun` | `#f9e200` | primary accent, CTAs |
| `--sun-pale` | `#fbed6b` | accent on dark |
| `--ember` | `#fe8b19` | warm accent |
| `--peach` | `#ffd1a3` | glow / light leak |
| `--gold` | `#f5c96c` | secondary accent |
| `--pine` | `#074b44` | brand dark, links, headings accents |
| `--olive` | `#365207` | CBD family |
| `--dusk` | `#291b5f` | indica family |
| `--clay` | `#eee6d8` | page surface |
| `--clay-hi` | `#f7f1e6` | raised surface |
| `--clay-lo` | `#e2d8c6` | inset surface / fields |
| `--clay-deep` | `#d8ccb6` | deep inset |
| `--clay-light` | `#fffaf2` | neumorphic highlight |
| `--clay-shade` | `#c9bba2` | neumorphic shade |
| `--clay-shade-2` | `#b3a386` | deep shade |

Derived tones are `color-mix()`es of those, never re-typed: `--pine-2`, `--pine-ink`, `--sun-2`, `--ember-ink`, `--dusk-2`, `--olive-2`, `--ink-glass`, `--paper-glass`, `--clay-glass`.
Strain families map onto the palette: `--strain-indica` → `var(--dusk)`, `--strain-sativa` → `var(--ember-ink)`, `--strain-hybrid` → `var(--pine)`, `--strain-cbd` → `var(--olive)`, `--strain-default` → `var(--ink-2)`.

Every text/background pair the CSS declares, measured by `src/tools/contrast.mjs` (Chrome resolves each
colour, including every `color-mix()`, to the sRGB it paints; a gradient is judged at its worst
stop). WCAG AA: 4.5:1 for body text, 3:1 for large text. Source: `audit/contrast.json`.

| foreground | background | ratio | use |
|---|---|---|---|
| `--ink` #231f20 | `--clay` #eee6d8 | 13.15:1 ✓ AA | body text |
| `--ink` #231f20 | `--clay` #eee6d8 | 13.15:1 ✓ AA | cards: body text |
| `--ink-2` #55575c | `--clay` #eee6d8 | 5.84:1 ✓ AA | secondary text: crumbs, footer links |
| `--ink-3` #585a5f | `--clay` #eee6d8 | 5.57:1 ✓ AA | muted text: footer base, toolbar labels |
| `--pine` #074b44 | `--clay` #eee6d8 | 8.07:1 ✓ AA | eyebrows, card brand, footer headings |
| `--pine-ink` #11463f | `--clay` #eee6d8 | 8.59:1 ✓ AA | brand chips |
| `--sun-pale` #fbed6b | `--ink` #231f20 | 13.53:1 ✓ AA | announcement bar |
| `--sun-pale` #fbed6b | `--pine` #074b44 | 8.30:1 ✓ AA (large) | tagline band (large display type) |
| `--ink` #231f20 | `--sun-2` #fdc90d | 10.51:1 ✓ AA | sun buttons |
| `--paper` #ffffff | `--pine-2` #457069 | 5.56:1 ✓ AA | pine buttons, pickup badge |
| `--paper` #ffffff | `--ember-ink` #85512c | 6.54:1 ✓ AA | store status CLOSED badge |
| `--strain-indica` #291b5f | `10% --strain-indica in --clay-hi` #dfdad9 | 10.71:1 ✓ AA | strain badge: indica |
| `--strain-sativa` #85512c | `10% --strain-sativa in --clay-hi` #ece0d2 | 5.03:1 ✓ AA | strain badge: sativa |
| `--strain-hybrid` #074b44 | `10% --strain-hybrid in --clay-hi` #dfdfd4 | 7.45:1 ✓ AA | strain badge: hybrid |
| `--strain-cbd` #365207 | `10% --strain-cbd in --clay-hi` #e2e0cf | 6.67:1 ✓ AA | strain badge: cbd |
| `--ember-ink` #85512c | `14% --ember in --clay-hi` #fae4ce | 5.31:1 ✓ AA | warning chip |
| `--paper` #ffffff | `--ink-glass over white` #605d5e | 6.51:1 ✓ AA | stock label on a product photo (glass over white, worst case) |

Three source-derived tokens were deepened to reach AA on the new surfaces: `--ink-3` (the source grey
measured 4.39:1 on clay), `--ember-ink` (the sativa badge measured 4.38:1) and `--ink-glass` (white
text on a product photo measured 3.71:1).

## Type

- **Display:** Fraunces (variable, optical sizes) — new to the redesign; the source set all its
  text in Poppins (`audit/design-baseline.json` → typography.families).
- **Body / UI:** Poppins — the source's own body face, now self-hosted.
- Self-hosted files: `fraunces-latin-wght-italic.woff2`, `fraunces-latin-wght-normal.woff2`, `poppins-latin-400-normal.woff2`, `poppins-latin-500-normal.woff2`, `poppins-latin-600-normal.woff2`, `poppins-latin-700-normal.woff2`.
- Fluid scale (`--step--1` … `--step-5`): `--step--1` clamp(0.8rem, 0.77rem + 0.15vw, 0.9rem) · `--step-0` clamp(1rem, 0.9rem + 0.25vw, 1.08rem) · `--step-1` clamp(1.15rem, 1.05rem + 0.5vw, 1.4rem) · `--step-2` clamp(1.4rem, 1.2rem + 1vw, 1.95rem) · `--step-3` clamp(1.8rem, 1.45rem + 1.8vw, 2.9rem) · `--step-4` clamp(2.3rem, 1.7rem + 3vw, 4.4rem) · `--step-5` clamp(2.8rem, 1.9rem + 4.6vw, 6.4rem).
- No text is set under 12px, and no text field under 16px on phones (the sweep's font check across
  18 templates × 4 widths, `audit/sweep-findings.json`).

## Space, shape, layout

- Container `--shell` 1320px; gutter `--gutter` max(clamp(16px, 4vw, 48px), env(safe-area-inset-left), env(safe-area-inset-right)).
- Radii: `--radius-xs` 10px · `--radius-sm` 16px · `--radius` 26px · `--radius-lg` 38px · `--radius-pill` 999px.
- Neumorphic depth: `--neu-raise-sm`, `--neu-raise`, `--neu-raise-lg` (lit top-left, shaded
  bottom-right), `--neu-inset` / `--neu-inset-sm` for wells and fields, `--neu-pressed` for the
  active state; `--lift-shadow` for floating bands and `--cutout-shadow` for pop-out images.
- Layering: a pop-out frame (`.pop`) is an offset outline, a clipped photo and a background-removed
  cut-out of the same photo that breaks out of the frame's top edge.
- Breakpoints in use: `max-width: 600px` (5), `max-width: 1180px` (3), `max-width: 1024px` (1), `max-width: 720px` (6), `max-width: 834px` (4), `max-width: 1100px` (1), `max-width: 480px` (1), `min-width: 600px` (1), `max-width: 599px` (3), `max-width: 1249px` (1), `max-width: 899px` (1), `max-width: 1360px` (1), `min-width: 1181px` (2), `min-width: 1361px` (1), `max-width: 440px` (1), `min-width: 931px` (1), `max-width: 420px` (2), `min-width: 1025px` (1), `max-width: 400px` (1), `max-width: 310px` (1). Verified at
  390 / 768 / 1024 / 1440px: 0 blocker and 0 major findings on the rebuild
  (`audit/sweep-findings.json`). Every control on the 18 swept templates is at least 44×44px on a phone.

## Motion

Easings and durations are tokens (`--ease-out`, `--ease-spring`, `--dur`). The source's 52 keyframes
are kept verbatim in `src/styles/motion.css` as evidence — the file is not linked from any page, since
none of them is used; the redesign's motion is `src/styles/redesign-motion.css`. A reveal runs over a
fixed 30vh after the element enters (never a share of its height, which left tall blocks blurred while
read), and anything already on screen when the page opens is shown whole.
A `prefers-reduced-motion` block is present and must stay present: it stills every animation below.

| component | trigger | what moves |
|---|---|---|
| section reveals (`.reveal`) | scroll — `animation-timeline: view()`, IntersectionObserver fallback | fade + rise + un-blur, siblings staggered |
| hero video + copy | scroll — `scroll(root)` | the video pushes in and dims as the page scrolls away; the copy lifts off |
| pop-out cut-outs (`.pop__cut.scroll-rise`) | scroll | the cut-out rises out of its frame |
| offset outlines (`.pop__outline.scroll-drift`) | scroll | the outline drifts and rotates behind the frame |
| parallax layers (`.parallax-slow/-fast`) | scroll | light leaks and the about-section cut-out move at different rates |
| tagline band | scroll (named view timeline `--tb`) | the lines rise through the band — never on their own |
| lab-data bars | scroll | bars grow to their value |
| cards, buttons | hover / focus (pointer devices) | lift, tilt toward the pointer, magnetic CTAs |
| film grain | continuous, decorative | background texture only |

Nothing text-bearing moves on its own: the source's announcement and tagline marquees became a
still line and a scroll-driven band (WCAG 2.2.2, Pause/Stop/Hide).
