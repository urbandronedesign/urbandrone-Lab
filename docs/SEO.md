# SEO & discoverability

What the site does for search engines and AI crawlers, and the few steps that
need your Google/Bing accounts.

## In place (automatic on every build)

| Item | Where |
|---|---|
| `robots.txt` — everything public allowed, AI crawlers named explicitly (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …), sitemap link | `src/app/robots.txt/route.pub.tsx` |
| `sitemap.xml` — every page with `lastmod`, priorities and cover images | `src/app/sitemap.xml/route.pub.tsx` |
| `llms.txt` — plain-text map for AI assistants: who, what, every page with a one-line summary | `src/app/llms.txt/route.pub.tsx` |
| Canonical URL, title, description, Open Graph and Twitter card on every page; cover image as share image for works | `src/lib/seo.ts` (`pageMeta`) |
| Page titles 30–60 chars: home `Urbandrone — <author>, <tagline>`; sections `Artworks — Architecture fiction on Tezos`, `Lab — Tools, software and courses`, `Collabs — Collaborative works`, `Bio — <author>, <tagline>`; projects `<title> — <category>, <year>` (shortened automatically so title + ` — Urbandrone` stays ≤ 60) | `siteTitle` (`lib/site.ts`), `projectTitle` (`lib/seo.ts`), section pages |
| Descriptions 70–160 chars on every page: a project's first paragraph, completed with a generated summary when it is under 70 chars (`"Title — 8 works by Jawhari Zaki, 2021, minted on Tezos (hic et nunc). Series from the Urbandrone studio."`); bio page uses the bio's first paragraph; all clipped at a word boundary | `projectDescription`, `clip` |
| `public/BingSiteAuth.xml` — Bing ownership proof, served at the site root | `public/` |
| JSON-LD (schema.org): `WebSite` + `Person` on every page; `VisualArtwork` (with `hasPart` for each token, objkt links) on artworks and collabs; `SoftwareApplication` (version, OS, download URLs) or `CreativeWork` on lab entries; `ProfilePage` on the bio; `BreadcrumbList` on detail pages | `src/lib/seo.ts`, `components/site/JsonLd.tsx` |
| `<meta name="robots" content="index, follow, max-image-preview:large">`; 404 pages `noindex` | layout / not-found |
| Static HTML — all text is in the page source, no client rendering needed to read it | static export |

## Search engine accounts (state on 2026-09-21)

1. **Bing Webmaster Tools** — **done**: verified with `public/BingSiteAuth.xml`, home page
   indexed. Bing also feeds DuckDuckGo, Ecosia and ChatGPT search. Submit the sitemap there
   too (*Sitemaps* → `https://urbandrone.xyz/sitemap.xml`) if not yet done.
   Bing's *URL Inspection → SEO/GEO issues* reported "Title too short", "Meta description
   too long or too short" and "H1 tag missing" on 2026-09-21. The first two were real and are
   fixed (see table above); the H1 one was a stale crawl — every page has exactly one `<h1>`.
   Click **Request indexing** after a deploy to refresh Bing's snapshot.
2. **Google Search Console** — https://search.google.com/search-console → *Add property* →
   **Domain** `urbandrone.xyz` → Google gives a `TXT` record → add it in Netlify DNS
   (Domains → urbandrone.xyz → DNS settings → *Add new record*, type **TXT**, name **empty**
   (bare domain, not `www`), value = the `google-site-verification=…` string). Verify (retry
   after a few minutes if it does not find the record yet). Then *Sitemaps* → submit
   `https://urbandrone.xyz/sitemap.xml`.
   **Known quirk:** a freshly submitted sitemap shows *"Impossible de récupérer le sitemap"*
   with an empty *Dernière lecture* for hours or days — Google simply has not fetched it yet.
   Do not delete/resubmit; use *URL inspection → Request indexing* on the home page and wait.
   Only if the error persists **with** a read date is something actually wrong
   (check `curl -sI https://urbandrone.xyz/sitemap.xml` → must be 200 `application/xml`).
3. **Check structured data** — paste a work URL into https://search.google.com/test/rich-results
   and https://validator.schema.org/.
4. **Share previews** — https://www.opengraph.xyz/ or the X card validator show what a link looks like.

## Writing for search (you control this in the admin)

- **Site → Description** is the home page's search snippet, the `WebSite` JSON-LD text and
  the default for pages without their own. Current (159 chars): *"Architecture fiction,
  generative art and interactive works by Jawhari Zaki, architect and founder of Urbandrone —
  minted on Tezos, with open tools and courses."* Keep it 150–160 characters.
- **Site → Author** and **Site → Tagline** appear in the home and bio page titles
  (`Urbandrone — Jawhari Zaki, Digital Architect`); **Site → About** is the home page's
  About statement (two short paragraphs; the bio page carries the detail).
- Each project's **first paragraph** becomes its description and its JSON-LD text —
  a specific sentence beats an empty field, which falls back to the generated line.
- **Tags** on projects become `keywords` in the structured data.
- The **Bio** text is what AI assistants quote when asked who Urbandrone is; the first
  paragraph is also in `llms.txt`.

## Checks

```sh
curl -s https://urbandrone.xyz/robots.txt
curl -s https://urbandrone.xyz/sitemap.xml | grep -c "<loc>"
curl -s https://urbandrone.xyz/llms.txt | head -20
curl -s https://urbandrone.xyz/artworks/diatoms/ | grep -o '<script type="application/ld+json">.*</script>'
```

Title/description/H1 audit of a static build (what Bing's checker measures):

```sh
STATIC_EXPORT=1 npx next build
# then, for every out/**/index.html: <title> 30–60 chars, description 70–160, exactly one <h1>
```

The one-liner used on 2026-09-21 is in the git history of this file's commit (`ac9c3b3`);
it reads the HTML, unescapes entities and lists pages outside those bounds.
