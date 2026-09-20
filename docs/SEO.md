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
| Generated description when a work has no text (`"Title — 8 works by Jawhari Zaki, 2021, minted on Tezos (hic et nunc)."`) | `projectDescription` |
| JSON-LD (schema.org): `WebSite` + `Person` on every page; `VisualArtwork` (with `hasPart` for each token, objkt links) on artworks and collabs; `SoftwareApplication` (version, OS, download URLs) or `CreativeWork` on lab entries; `ProfilePage` on the bio; `BreadcrumbList` on detail pages | `src/lib/seo.ts`, `components/site/JsonLd.tsx` |
| `<meta name="robots" content="index, follow, max-image-preview:large">`; 404 pages `noindex` | layout / not-found |
| Static HTML — all text is in the page source, no client rendering needed to read it | static export |

## One-time steps (your accounts)

1. **Google Search Console** — https://search.google.com/search-console → *Add property* →
   **Domain** `urbandrone.xyz` → Google gives a `TXT` record → add it in Netlify DNS
   (Domains → urbandrone.xyz → DNS settings → *Add new record*, type TXT, name empty).
   Verify. Then *Sitemaps* → submit `https://urbandrone.xyz/sitemap.xml`.
   Indexing usually starts within days; *URL inspection → Request indexing* speeds up a page.
2. **Bing Webmaster Tools** — https://www.bing.com/webmasters → *Import from Google Search
   Console* (one click, also feeds DuckDuckGo and ChatGPT search).
3. **Check structured data** — paste a work URL into https://search.google.com/test/rich-results
   and https://validator.schema.org/.
4. **Share previews** — https://www.opengraph.xyz/ or the X card validator show what a link looks like.

## Writing for search (you control this in the admin)

- **Site → Description** is the home page's search snippet and the default for pages
  without their own text. It should name you and the work: e.g. *"Jawhari Zaki —
  digital architect. Architecture fiction, generative art and interactive
  installations minted on Tezos; open-source tools for LED mapping and pen plotting."*
  (150–160 characters; the current one is shorter.)
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
