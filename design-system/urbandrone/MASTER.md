# Urbandrone — Design System (Master)

Source of truth for the public site and the admin. Generated with UI/UX Pro Max
(pattern *Portfolio Grid*, style *Exaggerated Minimalism*) and adjusted to the
reference (oxoarch.com): strictly monochrome, one grotesque family, tiny
tracked labels, tight image mosaics, generous whitespace.

## Principles
1. The work is the color. UI is black, white and grey only — no accent hue.
2. Hierarchy by size and space, never by decoration. One primary action per screen.
3. Every image is sharp: variants are derived from the full-resolution original, never upscaled.
4. Mobile first (375px) through very large screens (2560px+). Nothing depends on hover alone.
5. Motion explains; 150–300ms ease-out, opacity/transform only, honours `prefers-reduced-motion`.

## Tokens (`src/app/globals.css`)

### Color (semantic, light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | #ffffff | #0b0b0b | page |
| `--foreground` | #0b0b0b | #f2f2f2 | text, mark |
| `--surface` (`--muted`) | #f5f5f5 | #161616 | media frames, cards |
| `--muted-foreground` | #6b6b6b (5.3:1) | #9a9a9a (7:1) | labels, captions |
| `--border` | #e5e5e5 | #262626 | rules, frames |
| `--overlay` | rgb(0 0 0 / .55) | rgb(0 0 0 / .7) | lightbox scrim |
Theme follows the system (`color-scheme: light dark`) with a manual toggle.

### Type — Inter (variable) + Geist Mono
| Role | Class | Size | Weight | Tracking |
|---|---|---|---|---|
| Display | `.t-display` | clamp(2.5rem, 7vw, 7rem) | 300 | -0.03em, lh 0.95 |
| H1 | `.t-h1` | clamp(1.75rem, 3vw, 2.75rem) | 300 | -0.02em, lh 1.1 |
| H2 | `.t-h2` | 1.375rem / 1.75rem | 400 | -0.01em |
| Body | default | 1rem (16px) / 1.0625rem ≥1024 | 400 | 0, lh 1.6 |
| Lead | `.t-lead` | 1.125rem–1.25rem | 300 | lh 1.5 |
| Label | `.t-label` | 0.6875rem (11px) | 500 | 0.14em, uppercase, mono |
| Caption | `.t-caption` | 0.8125rem | 400 | 0 |
Max line length 65–75ch (`max-w-prose`). Numerals tabular in mono.

### Space & layout
- Scale: 4 8 12 16 24 32 48 64 96 128.
- Gutters: 20px (<768) · 40px (<1280) · 64px (≥1280). Class `.gutter`.
- Containers: text 72rem (1152px) · media 100rem (1600px) · bleed 100%.
- Section rhythm: 64 / 96 / 128px by breakpoint. Class `.section`.
- Mosaics: 4px gaps, 2 → 3 → 4 → 5 columns at 0/768/1280/1920.
- Header 56px mobile / 64px desktop, sticky, `backdrop-blur`.
- Radius 0 (architectural). Shadows none; frames use 1px `--border`.

### Motion
- `--ease-out: cubic-bezier(.16,1,.3,1)`; durations 150 (hover) / 250 (reveal) / 300 (route).
- Grid reveal: fade + 12px rise, 30ms stagger, once.
- Hover on media: scale 1.02 over 700ms; caption unchanged (captions never hover-only).
- `@media (prefers-reduced-motion: reduce)` disables transforms/transitions.

## Components (`src/components/site`)
- `SiteHeader` — mark + name, nav Artworks / Lab / About, theme toggle; full-screen menu <768.
- `SiteFooter` — © holder, links (objkt, X…), Contact, Index; mark.
- `PageIntro` — label + display title + optional lead. Top of index pages.
- `ArtworkGrid` / `ArtworkCard` — mosaic, cover 4:5 mobile 1:1 desktop, caption (title · year) below.
- `ProjectHero` — full-bleed media frame, object-contain on `--surface`, height clamp(56vh, 70vh, 82vh).
- `ProjectMeta` — 1fr / 320px grid: description (prose) · meta list (year, category, collection, editions, links).
- `MediaMosaic` — remaining works, 2 → 3 columns, opens `Lightbox`.
- `Lightbox` — scrim, media contained, prev/next, counter, links; keyboard + swipe; focus trapped.
- `MediaPlayer` — image (srcset), video/audio click-to-play with poster (`preload=none`), interactive sandboxed on request. Sources: objkt CDN → IPFS gateways.
- `LabList` / `LabEntry` — text-forward rows (year · title · tags) → detail with body, media, external links.

## Media pipeline
- Variants from `artifact_uri` (originals): 480 / 960 / 1600 / 2400 px WebP q85, never upscaled; blur placeholder 16px.
- `sizes`: grid `(min-width:1920px) 20vw, (min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw`; hero/lightbox `100vw`.

## Accessibility
- Contrast ≥ 4.5:1 text, ≥ 3:1 UI. Focus ring 2px `--foreground` offset 2px, never removed.
- Touch targets ≥ 44px. Skip link. `<main id="content">`. Alt = work title.
- Lightbox: `role=dialog`, `aria-modal`, Esc closes, focus returns to trigger.

## Anti-patterns to avoid
Accent colors and gradients · upscaled or over-compressed images · hover-only information ·
modals for primary navigation · autoplaying sound · emoji as icons · fixed px containers.
