# Atelier — project gallery

Minimal, fullscreen-image portfolio. Next.js 16, Tailwind 4, shadcn/ui, Prisma + SQLite.

The site is published as **static HTML on GitHub Pages** (https://urbandrone.xyz).
The **admin runs only on your machine**; it is never deployed.

## Everyday workflow

A local launcher (`admin.cmd` → `scripts/admin.js`, kept out of git) starts the
server and opens https://localhost:3000/admin; the terminal window that appears is
the server — keep it open while you work, Ctrl-C (or closing it) stops it.
Without it: `npm run dev:https` and open the URL yourself.

Edit projects, site info and bio in the admin, then click **Publish** on the
dashboard — that commits and pushes, and the site is live about a minute later.
(Equivalent by hand: `npm run dev:https`, then `git add -A && git commit && git push`.)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
public gallery and deploys it to Pages. Content is versioned in git:
`db/custom.db` (projects) and `public/uploads/` (images).

## Site structure

| URL | Content |
|---|---|
| `/` | Home: name, tagline, description, **4 featured projects** (Projects → *Featured on the home page*; first artworks until you choose), collabs and lab teasers, about + links |
| `/artworks/` · `/artworks/<slug>/` | Gallery of artwork projects; detail = uncropped hero, title/description/facts, mosaic, lightbox |
| `/collabs/` · `/collabs/<slug>/` | Collaborations — same gallery treatment as artworks |
| `/lab/` · `/lab/<slug>/` | Experiments, research, tools — text-forward list; detail leads with text, media optional |

Every project has a **section** (Artworks / Collabs / Lab), a **slug** (URL), **tags**, external
**links** and a **featured** flag, all editable in the project editor. The design
system (tokens, type roles, components, media rules) is documented in
[design-system/urbandrone/MASTER.md](design-system/urbandrone/MASTER.md); light and
dark follow the visitor's system with a manual toggle.

## Tezos NFTs

Your minted tokens are the primary content. Nothing is re-uploaded: metadata
comes from the public objkt.com API, media stays on IPFS.

- Set `TEZOS_WALLETS` in `.env` (comma-separated minting addresses).
- Admin → **Sync Tezos** fetches new/changed tokens (1–2 API requests; right-click
  the button for a full re-sync), creates/updates one project per **contract you
  own**, and generates local WebP variants (480/960/1600/2400 px + blur placeholder)
  in `public/media/` from each token's **full-resolution original**, fetched once
  (objkt CDN first, then IPFS gateways).
  Gateways rate-limit, so the pipeline is paced; anything that fails is retried
  on the next sync.
- Tokens from **shared contracts** (hic et nunc / Teia, Versum, …) land in the
  **Tezos tokens** tab. Hide the ones you don't want shown; pick the rest into
  hand-curated projects with **Add from Tezos** in the project form.
- Videos, audio and interactive pieces show their still and load on click
  (poster + play), streaming from objkt's CDN with IPFS gateway fallback. Interactive works
  run in a sandboxed frame on request only.
- `public/sw.js` caches `/media`, `/_next/static` and IPFS images on the visitor's
  device (cache-first, content-addressed = never stale).
- Commit `db/custom.db` + `public/media/` after syncing — that is what gets deployed.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `npm run dev:https` | Full app (gallery + admin + API), HTTP or HTTPS |
| `npm run build:static` | Static export of the public gallery into `out/` — what CI deploys |
| `npm run preview:static` | Serve `out/` locally like a static host would |
| `npm run build` / `npm start` | Full app production build (not used for Pages) |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `prisma/schema.prisma` to the SQLite file |

## Setup on a new machine

```sh
npm install
npx prisma generate
cp .env.example .env       # then set ADMIN_PASSWORD and AUTH_SECRET
```

`.env` keys:

- `TEZOS_WALLETS` — minting wallets to sync, comma-separated
- `DATABASE_URL` — `file:../db/custom.db` (relative to `prisma/`)
- `AUTH_SECRET` — 32+ random chars; signs the admin session cookie
- `SMTP_*`, `MAIL_FROM` — optional, for password-reset emails (below)

## Admin dashboard, publishing and analytics

`/admin` is a dashboard: **Publish** (uncommitted changes → commit + push from the
browser, which triggers the Pages deploy), **Deploy** (last GitHub Actions run and
the live URL), **Tezos sync**, content and storage figures against the Pages budget,
and **Traffic** once GoatCounter is connected. Projects live at `/admin/projects`.

### Analytics — GoatCounter (free, no cookies, no consent bar)

Step-by-step: [docs/ANALYTICS-SETUP.md](docs/ANALYTICS-SETUP.md).

1. Create a free account at goatcounter.com (personal, non-commercial use) and pick a
   site code; paste it into *Site → Analytics* and publish. The public site loads
   GoatCounter's counter script — it sets no cookies and stores no personal data, so
   no consent banner is needed under GDPR.
2. In GoatCounter, open the menu under your user name (top right) → *API*
   (`https://<code>.goatcounter.com/user/api`), create a token with *Read statistics* and set
   `GOATCOUNTER_API_TOKEN` in `.env`. The dashboard then shows the last 30 days:
   visitors, per-day chart, **a world map of visitors by country**, top pages,
   sources, browsers and systems (cached 10 min; *refresh* bypasses the cache).
   In development, `/admin/?mock=1` previews the card with sample data.

## SEO

robots.txt, sitemap.xml, llms.txt, canonicals, per-page descriptions and schema.org
JSON-LD are generated at build time; the one-time Search Console steps and writing
advice are in [docs/SEO.md](docs/SEO.md).

## Security & accessibility notes

- Everything under `/admin` and every mutating or admin-only API route is gated by
  `src/proxy.ts` (signed httpOnly session cookie, SameSite=Lax → no cross-site POST).
  The proxy compares paths without their trailing slash. Sign-in, forgot and reset
  are throttled per IP. Publishing runs `git` via `execFile` (no shell) with the
  message as an argument.
- The static export contains no admin, no API and no secrets; media and interactive
  pieces are requested in CORS mode from objkt's CDN (which allows any origin) so
  browsers' Opaque Response Blocking does not interfere with audio/video.
- `npm audit --omit=dev`: the only remaining advisory (deepmerge-ts via
  `@prisma/config`) affects the Prisma CLI's config loader at build time, not the
  site or the admin at runtime; it clears with Prisma 7+, which is a larger migration.
- axe-core (WCAG 2.1 A/AA + best practices) passes on all public pages in light and
  dark mode; keyboard: skip link, focus-trapped lightbox with Escape and focus return,
  `aria-expanded` mobile menu, `prefers-reduced-motion` honoured.

## Admin account

Accounts live in the database (scrypt-hashed passwords), not in `.env`.

- **First run**: opening `/admin` with no account redirects to `/admin/setup` —
  choose a username, an email (used only for resets) and a password (10+ chars).
- **Change username / email / password**: admin header → **Account**. The current
  password is required for any change.
- **Forgot password**: sign-in page → *Forgot password?* → enter email or username.
  A single-use link (valid 30 min) is emailed; open it to set a new password.
  Without a mail server the link is **printed in the terminal running `npm run dev`**
  (line starting with `[mail]`) — you are on your own machine, so that is safe.
- Sign-in, forgot and reset endpoints are rate-limited per IP.

### Email for reset links (optional)

Any SMTP server works. Gmail example:

1. Google Account → Security → 2-Step Verification (must be on) → **App passwords**
   → create one named "Atelier" → copy the 16-character password.
2. In `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   MAIL_FROM=Atelier <you@gmail.com>
   ```
3. Restart the dev server. The Account page shows whether mail is configured.

OVH mail works the same with `SMTP_HOST=ssl0.ovh.net`, `SMTP_PORT=465`.

### Locked out completely?

You have the machine, so you always have a way back in: stop the dev server,
delete the account row and start over at `/admin/setup`:

```sh
node -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.adminUser.deleteMany().then(()=>db.$disconnect())"
```

## Domain / GitHub Pages

Repo: https://github.com/urbandronedesign/urbandrone-Lab — Pages source is GitHub
Actions, custom domain `urbandrone.xyz`. The DNS move from Netlify to OVH and the
HTTPS steps are written up in [docs/DOMAIN-SETUP.md](docs/DOMAIN-SETUP.md).

## How the two modes work

`next.config.ts` switches on `STATIC_EXPORT=1`:

- Files named `*.pub.tsx` (`src/app/layout.pub.tsx`, `src/app/page.pub.tsx`) are
  routes in **both** modes — this is the public gallery.
- Ordinary `page.tsx` / `route.ts` files (`src/app/admin/`, `src/app/api/`) and
  `src/proxy.ts` (auth) exist only in the full app.
- In static mode `page.pub.tsx` queries SQLite **at build time** and embeds the
  published projects into the HTML; the gallery and project views read from
  that embedded list, so no API is needed at runtime.
