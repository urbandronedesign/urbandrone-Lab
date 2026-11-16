# Share cards

Link-preview images (`og:image`) for Lab projects: 1200×630 JPG, light background,
an illustration of what the project *is* on the right, title column on the left.
Served from `public/og/<section>/<slug>.jpg`; `shareImage()` in `src/lib/seo.ts`
uses the card when the file exists and falls back to the project cover.

The project covers are not used for previews because three are transparent logos
(rendered as black boxes by most sites) and the rest are dark screenshots.

- `art.js` — one drawing function per project, plus the shared title column.
- `render.js` — renders them with headless Chrome.

```sh
node design-system/share-cards/render.js public/og/lab            # all
node design-system/share-cards/render.js public/og/lab plotter3d  # one
```

The same illustrations, without the title column, are the Lab projects' **covers**
on the site (Lab list thumbnail and first image of the page), uploaded as
`public/uploads/<uuid>.webp` and set as the project cover; the old logo or
screenshot stays in the page gallery after it. Make one with
`SCALE=2 ART_ONLY=1 node design-system/share-cards/render.js <dir> <slug>` and
upload it in the admin as the project's cover.

New Lab project → add an entry to `COVERS` in `art.js` with its slug, render it,
commit the JPG. The three course repos (3DVIZ, AI_GEN_NARRATIVES,
gaussian-splatting) carry a copy as `share-card.jpg` with their own Open Graph
tags; copy the new JPG there too when one of their cards changes.

Social sites cache previews: after changing a card, refresh it with LinkedIn's
Post Inspector or Facebook's Sharing Debugger.
