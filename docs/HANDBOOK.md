# Urbandrone site — handbook

Everything about how this site works, in one place. Written for Jawhari (owner) and
for whoever — human or AI — works on the code next. Shorter task guides live beside
it: [DOMAIN-SETUP.md](DOMAIN-SETUP.md), [ANALYTICS-SETUP.md](ANALYTICS-SETUP.md),
[SEO.md](SEO.md), and the design system in
[../design-system/urbandrone/MASTER.md](../design-system/urbandrone/MASTER.md).

## 1. What it is

A portfolio for **Jawhari Zaki / Urbandrone**: architecture fiction and generative
art minted on Tezos, plus a Lab of tools and course manuals, and a bilingual bio.

- Public site: **https://urbandrone.xyz** — static HTML on **GitHub Pages**, built by
  GitHub Actions from https://github.com/urbandronedesign/urbandrone-Lab (branch `main`).
- Admin: runs **only on the owner's machine** at https://localhost:3000/admin
  (never deployed). Content lives in a SQLite file that is committed to git.
- Publishing = commit + push (the dashboard's **Publish** button does it).

```
 owner's PC                                   GitHub                         visitors
 ┌───────────────────────────┐   push   ┌──────────────────────┐   Pages   ┌──────────────┐
 │ Next.js full app (dev)    │ ───────▶ │ Actions: build:static│ ────────▶ │ urbandrone.xyz│
 │  /admin + /api + SQLite   │          │  → out/ (HTML+media) │           │ static HTML   │
 │  public/media (WebP)      │          └──────────────────────┘           └──────┬───────┘
 └────────────┬──────────────┘                                                    │ media
              │ objkt GraphQL + IPFS/CDN (sync)                                   ▼
              ▼                                                          objkt CDN / IPFS
       Tezos indexers                                                 (videos, originals)
```

## 2. Two builds from one codebase

`next.config.ts` switches on `STATIC_EXPORT=1`:

| | `npm run dev:https` / `npm run build` | `npm run build:static` (CI) |
|---|---|---|
| Routes | everything | only files named `*.pub.tsx` |
| Output | Node server | `out/` static folder, `trailingSlash` |
| Data | live SQLite | SQLite read **at build time**, embedded in HTML |

The trick is `pageExtensions`: public pages are `page.pub.tsx` / `layout.pub.tsx` /
`route.pub.tsx`; admin pages and API routes are plain `page.tsx` / `route.ts` and
therefore do not exist in the static build. **Metadata files (`sitemap.ts`,
`robots.ts`) do not survive this** — robots.txt, sitemap.xml and llms.txt are route
handlers under `src/app/<name>/route.pub.tsx` with `dynamic = 'force-static'`.

Dynamic routes (`/artworks/[slug]`) use `generateStaticParams` + `dynamicParams=false`;
an empty section emits a placeholder `_` path that renders the 404 page so the
export never fails. In **dev**, a newly created project 404s for a few seconds until
the param cache refreshes — reload.

## 3. Code map

```
src/app/(site)/            public pages: page.pub.tsx (home), artworks/, collabs/, lab/, bio/
src/app/admin/             admin pages (dashboard, projects, projects/[id] editor, site, bio, account, login/setup/forgot/reset)
src/app/api/               admin + public JSON: projects, tokens, tezos/sync, upload, site, bio, featured, dashboard, publish, auth/*
src/app/{robots.txt,sitemap.xml,llms.txt}/route.pub.tsx
src/proxy.ts               Next 16 "proxy" (middleware): session check for /admin/* and admin/mutating APIs
src/components/site/       public UI (SiteHeader, ArtworkGrid, ProjectGallery, Lightbox, ProjectMeta, LabList, Downloads, BioText, Analytics, JsonLd…)
src/components/media/      MediaImage (srcset + blur), MediaPlayer (image/video/audio/interactive)
src/components/admin/      Dashboard, AdminView (projects + tokens), ProjectEditor, TokenPool/TokenManager, FeaturedManager, SiteForm, BioForm, WorldMap, auth forms
src/lib/                   db (Prisma), auth (session cookie), admin-user (accounts, JSON store), site, bio, content (public queries), serialize (DB → Project/Media), seo, github (latest releases), dashboard, mailer, throttle, projects
src/lib/tezos/             objkt client, ipfs candidates, media pipeline (sharp), sync orchestration, config
prisma/schema.prisma       Project, Token, ProjectToken, Image, Site, Bio, Setting  (NO credentials)
db/custom.db               the content (committed)
db/auth.json               the admin account + reset tokens (GITIGNORED, never commit)
public/media/              WebP variants of token images (committed, ~260 MB)   public/uploads/  manual uploads
design-system/urbandrone/MASTER.md   tokens, type roles, components, motion, a11y rules
```

## 4. Data model

- **Project** — the unit shown on the site. `section` = `artworks` | `collabs` | `lab`;
  `slug` (URL); `source` = `manual` or `contract` (auto-created from a Tezos
  collection contract the owner deployed; token membership then follows the sync);
  `featured` + `featuredOrder` (home page, max 4); `tags`, `linksJson`, `published`,
  `order`, cover = `coverTokenId` **or** `coverId` (uploaded image).
- **Token** — a Tezos NFT indexed by objkt: chain metadata, `hidden` (curation),
  `mediaKey`/`mediaWidths`/`placeholder` for the local WebP variants.
- **ProjectToken** — ordered membership. **Image** — manual uploads.
- **Site** — name, tagline, description, author, copyright, email, url, keywords,
  links, about, `goatcounterCode`. **Bio** — headline/text EN + FR, portrait, CV JSON.
- **Admin account** — *not in the database.* `db/custom.db` is committed to a **public**
  repository, so credentials live in `db/auth.json` (gitignored, `AUTH_STORE` overrides
  the path): one user (username, email, scrypt hash) plus reset tokens (sha256-hashed,
  30 min). Written via a temp file + rename, with read-modify-write cycles serialised.
  Read and written only by `src/lib/admin-user.ts`; nothing else may touch it.
- **Setting** — key/value (`tezos:lastSync`).

Serialization (`lib/serialize.ts`) turns rows into the frontend `Project` with a
unified `media: Media[]` (tokens + uploads) so components never care about origin.

## 5. Content pipeline (Tezos)

`TEZOS_WALLETS` in `.env` (two wallets). **Sync Tezos** (dashboard / projects page;
right-click = full re-sync):

1. objkt GraphQL, one query shape, 500 rows/page, cursor on `pk`, incremental since
   last sync (10-min overlap), 600 ms between pages, back-off on 429/5xx. Whole
   catalogue (256 tokens) = 1 request.
2. Contracts owned by the wallets → one `contract` project each (created once with the
   collection's texts; membership = non-hidden tokens, mint order).
3. Media: for each token, download the **full-resolution original** (`artifact_uri`;
   hic et nunc `display_uri` is only a 1024 px preview) — objkt CDN first
   (`assets.objkt.media/file/assets-003/<cid>/artifact`), then IPFS gateways — paced
   700 ms, retried on 429, thumbnail fallback; sharp → WebP 480/960/1600/2400 q85,
   never upscaled, + 16 px blur placeholder; content-addressed filenames in
   `public/media/`; stale files pruned. `{ "media": "rebuild" }` regenerates all.
4. Tokens on shared contracts (hic et nunc/Teia, Versum, Rarible…) sit in the **Tezos
   tokens** pool; they were grouped into series projects by title/numbering once
   (27 series + 67 singles) and are curated from there.

Playback: media elements load from the CDN with `crossOrigin="anonymous"` (defeats
Chrome ORB) and the document sends **no Referer** (`referrer: same-origin`) because
the CDN hotlink-protects against foreign referrers. Video/audio/interactive load on
click (poster + play), never autoplay.

## 6. Admin

| Page | Purpose |
|---|---|
| `/admin` | Dashboard: Publish (commit + push), Deploy status (GitHub Actions), Tezos sync, content/storage vs Pages budget, tokens by year, Traffic (GoatCounter, world map) |
| `/admin/projects` | Featured-on-home manager (4 slots, drag), projects list (filter by section, drag to reorder, publish switch), Tezos tokens tab (filter, search, hide/show) |
| `/admin/projects/<id>` (`new`) | Full-page editor: section, URL, featured, title/year/category, tall description, credits, tags, links (a GitHub `…/releases[/latest][?q=<tag-prefix>]` link becomes a Download block), large media preview (plays video/audio), token grid (reorder, ★ cover, add from pool), uploads |
| `/admin/site` | Name, tagline, description, keywords, about statement, author, copyright, email, URL, footer links, GoatCounter code, with live previews |
| `/admin/bio` | Portrait, headline + text EN/FR, CV rows |
| `/admin/account` | Username/email/password (current password required) |
| `/admin/setup`, `/login`, `/forgot`, `/reset` | First-run account, sign-in, e-mail reset (SMTP or link printed in terminal) |

Launcher on the owner's PC: `admin.cmd` → `scripts/admin.js` (both gitignored).

### Getting in, and getting back in

The password exists only as a scrypt hash in `db/auth.json`; **it cannot be read back**,
by anyone, including from this repo. Three ways in, in order of convenience:

1. **Normal sign-in** — https://localhost:3000/admin, username `urbandrone` (e-mail works
   too). Let the browser's password manager save it; the origin is stable.
2. **Forgot password** — sign-in page → *Forgot password?* → username or e-mail. With no
   SMTP configured the single-use link (30 min) is **printed in the terminal window that
   `admin.cmd` opened**: `…/admin/reset?token=…`. Paste it in the browser, set a new one.
   Works entirely offline.
3. **Start over** — delete `db/auth.json` and reload `/admin`: it returns to the first-run
   setup page. Content in `db/custom.db` is untouched.

Change username, e-mail or password in **admin → Account** (the current password is
always required). Do not keep a copy of the password inside the project folder — even
ignored, it is one `git add -f` away from being public; use a password manager.

## 7. Security model

- Session = HMAC-SHA256 signed cookie (`atelier_admin`, 7 days, httpOnly, SameSite=Lax,
  Secure over HTTPS), key `AUTH_SECRET`. Stateless: a password change does not
  revoke existing cookies (they expire).
- `src/proxy.ts` gates `/admin/*` (except login/setup/forgot/reset) and every mutating
  API plus `/api/tokens`, `/api/tezos`, `/api/dashboard`, `/api/publish`, and
  `GET /api/projects?all=true`. **Paths are compared without trailing slash.**
- Throttles per IP: login 10/15 min, forgot 5, reset 10. Passwords scrypt, min 10 chars.
- **Credentials never enter git.** Until 2026-09-28 the account lived in the committed
  `db/custom.db`, so the public repo carried the username, e-mail and password hash
  (commits up to `b58ba11`). Fixed in two steps: `85ccc92` moved the account to the
  gitignored `db/auth.json` and removed the models from the schema; `3b36b67` dropped
  the now-empty `AdminUser`/`PasswordReset` tables from the committed database. The
  password was rotated, so the hashes still in git history open nothing.
  Keep it that way: **never add an account model to `prisma/schema.prisma`**, and never
  commit `db/auth.json` or a `db/*.bak` copy of an older database (both are ignored).
  Losing `db/auth.json` is not a disaster — delete it and `/admin` returns to setup.
- Publish runs `git` via `execFile` (no shell). Upload validates type/size, random name.
- Static site has no admin/API/secrets; `.env`, `certificates/`, launcher are ignored.
- Known accepted advisory: deepmerge-ts via `@prisma/config` (Prisma CLI, build time).
  **Do not `npm install prisma@latest`** — that tag resolved to an 8.0 release
  candidate; stay on Prisma 6.x.

## 8. Deploy, domain, analytics

- Push to `main` → `.github/workflows/deploy.yml` → `npm ci`, `prisma generate`,
  `build:static` (with `GITHUB_TOKEN` for release lookups) → Pages. ~90 s.
- Domain: DNS at **Netlify DNS** (four `A` → GitHub IPs, `CNAME www`); Pages custom
  domain `urbandrone.xyz`, HTTPS enforced. Registrar OVH. Details in DOMAIN-SETUP.md.
- Browser cache: Pages sends `max-age=600`; hard-reload to see a fresh publish sooner.
- Analytics: **GoatCounter** (code `urbandrone`, no cookies, no consent bar); API
  token in `.env` feeds the dashboard. GA was removed on purpose.
- SEO: see SEO.md. Bing verified (`public/BingSiteAuth.xml`) and Google Search Console
  verified (TXT record in Netlify DNS — keep it); sitemap submitted to both. Titles 30–60 and
  descriptions 70–160 chars are enforced by `lib/seo.ts` (`projectTitle`, `clip`).

## 9. Environment (`.env`, never committed)

```
DATABASE_URL=file:../db/custom.db      # relative to prisma/
AUTH_SECRET=<32+ random chars>
TEZOS_WALLETS=tz1bXrkUZi2neinqmx3amCvptVwFiT43qT2m,tz1RDpCQLPRfFb82EX1Rnk3mGwMxXwBfHmtC
GOATCOUNTER_API_TOKEN=…                # dashboard traffic
SMTP_HOST/PORT/USER/PASS, MAIL_FROM     # optional, password-reset mail
```

## 10. Routine tasks

- **Add / edit content** → admin → Save → dashboard **Publish**.
- **New mint** → Sync Tezos → the token appears in its contract project or the pool → Publish.
- **New software release** → nothing to do; the Download block resolves the latest
  release at build time. Trigger a rebuild by publishing anything (or re-run the workflow).
- **Feature works on the home** → Projects → *Featured on the home page*.
- **Move a project to Collabs/Lab** → editor → Section.
- **Re-encode all media** (quality/width change in `lib/tezos/config.ts`) →
  `POST /api/tezos/sync {"media":"rebuild"}` (or Sync with a code change) → Publish.
- **Check the site** → `npm run build:static && npx serve out`, or the dashboard's Deploy card.

## 11. Gotchas (learned the hard way)

- Editing `next.config.ts` restarts the dev server and kills an in-flight sync.
- After `prisma db push`, **restart the dev server** (it holds the old client; on
  Windows the engine DLL is locked until then).
- Public IPFS gateways 403/429 large files; the objkt CDN is the reliable source.
- Two Rarible tokens have sub-path CIDs the CDN cannot serve; they keep older variants.
- Desktop Chrome cannot shrink below ~500 px; mobile checks need puppeteer viewport
  emulation (used during development from `%TEMP%\shots`).
- The Next dev "N" badge shows in screenshots; it is not part of the site.
- `trailingSlash` + exact path comparisons = the draft-leak bug of 2026-09-20. Normalise.
- Inspect the committed database without Prisma with Node's built-in `node:sqlite`
  (`new DatabaseSync('db/custom.db', { readOnly: true })`) — handy to prove what a commit
  would publish, and to compare `git show HEAD:db/custom.db` against the working copy
  table by table before committing a binary file.
- `npx prisma db push` after removing a model needs `--accept-data-loss`; back the
  database up first (`db/*.bak` is ignored) and check the warning names only the tables
  you meant to drop.

## 12. Log of notable changes

Dated so a future reader knows what was decided when, and why.

| Date | Change |
|---|---|
| 2026-09-20 | SEO pass: `robots.txt` (17 crawlers named), `sitemap.xml`, `llms.txt`, canonicals, per-page OG covers, schema.org JSON-LD (`b4b0fbe`). |
| 2026-09-21 | Handbook written (`c2aa3fc`). Site → Description rewritten to 159 chars and a two-paragraph About statement added (`b58ba11`, `92d5b3e`). |
| 2026-09-21 | Bing Webmaster verified via `public/BingSiteAuth.xml` (`b0015c5`); Google Search Console verified by TXT record in Netlify DNS — **that record must stay**. |
| 2026-09-21 | Bing's SEO checker flagged short titles and out-of-range descriptions: titles are now 30–60 chars (`projectTitle`) and descriptions 70–160 (`clip`, `projectDescription`) on all 95 pages (`ac9c3b3`). Its "H1 tag missing" was a stale crawl — every page has exactly one. |
| 2026-09-28 | **Credential leak fixed.** The committed `db/custom.db` had published the admin username, e-mail and password hash. Password rotated; account moved to the gitignored `db/auth.json` (`85ccc92`); auth tables dropped from the database (`3b36b67`). Full auth flow re-verified: setup, login by name and e-mail, bad password, route guard, account change, forgot → reset → token reuse refused. |
