# Atelier — project gallery

Minimal, fullscreen-image portfolio. Next.js 16, Tailwind 4, shadcn/ui, Prisma + SQLite.

The site is published as **static HTML on GitHub Pages** (https://urbandrone.xyz).
The **admin runs only on your machine**; it is never deployed.

## Everyday workflow

```sh
npm run dev:https          # full app at https://localhost:3000  (admin: /admin)
# … add / edit projects and upload images in the admin …
git add -A && git commit -m "Add project X" && git push
```

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
public gallery and deploys it to Pages. Content is versioned in git:
`db/custom.db` (projects) and `public/uploads/` (images).

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

- `DATABASE_URL` — `file:../db/custom.db` (relative to `prisma/`)
- `ADMIN_USER`, `ADMIN_PASSWORD` — admin sign-in at `/admin`
- `AUTH_SECRET` — 32+ random chars; signs the admin session cookie

## One-time GitHub Pages + domain setup

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Repo **Settings → Pages → Custom domain**: `urbandrone.xyz` (matches `public/CNAME`).
   Tick **Enforce HTTPS** once the certificate is issued (a few minutes after DNS resolves).
4. At your DNS provider, for `urbandrone.xyz`:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `<github-username>.github.io` |

   Current IPs: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

## How the two modes work

`next.config.ts` switches on `STATIC_EXPORT=1`:

- Files named `*.pub.tsx` (`src/app/layout.pub.tsx`, `src/app/page.pub.tsx`) are
  routes in **both** modes — this is the public gallery.
- Ordinary `page.tsx` / `route.ts` files (`src/app/admin/`, `src/app/api/`) and
  `src/proxy.ts` (auth) exist only in the full app.
- In static mode `page.pub.tsx` queries SQLite **at build time** and embeds the
  published projects into the HTML; the gallery and project views read from
  that embedded list, so no API is needed at runtime.
