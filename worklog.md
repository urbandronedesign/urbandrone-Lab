# Project Worklog — "Atelier" Fullscreen Project Gallery Template

## Initial Task

Build a website template composed of multiple graphical projects with:
- A very minimal interface focused on fullscreen images
- A backend (admin/CMS) to create projects and populate them with text and images
- A detailed plan, proposed design system, and proposed stack for front and back

---

## Plan & Design System (Task ID: 1)

### Tech Stack (proposed and used)

**Frontend**
- Next.js 16 (App Router, Turbopack)
- TypeScript 5 (strict)
- Tailwind CSS 4 with shadcn/ui (New York style)
- Framer Motion 12 for transitions
- Lucide icons
- next-themes for light/dark mode
- Zustand for client view state (gallery → detail → admin)
- TanStack Query for server state (projects CRUD)
- `next/image` for sharp-optimized image delivery

**Backend**
- Next.js Route Handlers (`/api/...`)
- Prisma ORM + SQLite (file-based, zero-infra)
- `sharp` for image processing / thumbnails
- Multipart uploads written to `/public/uploads`
- Local in-memory cache layer for project reads

**Routing Strategy**
Because only `/` is user-visible, the app uses **client-side view state** plus URL
query params (`?v=gallery | project | admin`, `?p=<projectId>`) so deep links
and back-button still work. The single `src/app/page.tsx` reads query params and
renders the corresponding view.

### Design System

| Token              | Light                            | Dark                             |
|--------------------|----------------------------------|----------------------------------|
| background         | `oklch(0.985 0 0)` near-white    | `oklch(0.09 0 0)` near-black     |
| foreground         | `oklch(0.145 0 0)`               | `oklch(0.97 0 0)`                |
| muted-foreground   | `oklch(0.55 0 0)`                | `oklch(0.65 0 0)`                |
| border             | `oklch(0.90 0 0)` hairline       | `oklch(1 0 0 / 12%)`             |
| primary            | `oklch(0.15 0 0)` (ink)          | `oklch(0.97 0 0)`                |
| accent             | none — pure monochrome           | none                             |

- **Palette**: Pure monochrome (no indigo/blue per project rules). Accent is the
  photographs themselves.
- **Typography**: Use a serif display face (Cormorant Garamond / Playfair) for
  project titles + a clean grotesk (Geist Sans already wired) for UI labels.
  Mono (Geist Mono) for metadata (index numbers, dates, "01/12").
- **Spacing**: 12-col fluid grid, generous whitespace, `px-6 md:px-12 lg:px-24`
  outer gutters.
- **Image treatment**: Full-bleed `aspect-[16/10]` to `aspect-[3/4]` cells,
  `object-cover`, subtle 1px hairline border, hover lift + cursor label
  ("View Project 01 →").
- **Motion**: 0.6s `cubic-bezier(0.16, 1, 0.3, 1)` for image reveals; staggered
  fade-up for grid items; crossfade between slides in the detail view.
- **Sticky footer**: A thin `border-t` bar with `© year · Atelier · Made with Z.ai`
  + small admin toggle.

### Information Architecture

1. **Gallery (`?v=gallery`)** — Hero (one featured project, fullscreen) → Index grid
   of remaining projects. Each cell: cover image, project number (01/12), title,
   year, category. Hover → scales image 1.03 and shows label.
2. **Project detail (`?v=project&p=<id>`)** — Fullscreen image viewer:
   - Click image → enters immersive lightbox (image fills viewport, text panel slides
     from right on desktop, bottom on mobile).
   - Prev/next arrows, keyboard ←/→/Esc, thumbnails strip at bottom.
   - Right panel: title, year, category, description (markdown), credits, index.
3. **Admin (`?v=admin`)** — Minimal CMS:
   - List all projects in a table (drag to reorder via @dnd-kit).
   - "New Project" opens a dialog/sheet: title, year, category, description
     (markdown), cover selector, then an image manager (upload multiple,
     reorder, delete, set cover).
   - Edit / delete existing projects.
   - Toggle admin via a discrete `✱` icon in the footer.

### Data Model (Prisma, SQLite)

```prisma
model Project {
  id          String   @id @default(cuid())
  title       String
  year        Int
  category    String
  description String   @default("")  // markdown
  coverId     String?
  cover       Image?   @relation("Cover", fields: [coverId], references: [id], onDelete: SetNull)
  images      Image[]
  order       Int      @default(0)
  published   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Image {
  id        String   @id @default(cuid())
  url       String   // /uploads/xxx.jpg
  width     Int?
  height    Int?
  alt       String   @default("")
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

### File Layout (to be created)

```
prisma/schema.prisma                  (updated)
src/app/page.tsx                      (view router)
src/app/layout.tsx                    (providers, fonts)
src/app/api/projects/route.ts         (GET list, POST create)
src/app/api/projects/[id]/route.ts    (GET, PUT, DELETE)
src/app/api/upload/route.ts           (POST multipart)
src/app/api/seed/route.ts             (POST — seed demo data)
src/components/providers.tsx          (QueryClient + Theme)
src/components/gallery/*             (hero, grid, cell, footer)
src/components/project/*             (viewer, lightbox, panel)
src/components/admin/*               (cms, form, image manager, reorderable list)
src/lib/store.ts                      (Zustand: view + selected project + admin?)
src/lib/queries.ts                    (TanStack Query hooks)
src/public/uploads/                   (image storage)
```

---

Task ID: 1
Agent: main
Task: Write detailed plan + design system + tech stack proposal

Work Log:
- Inspected project scaffold: Next.js 16, Turbopack running on :3000, Prisma+SQLite wired, shadcn/ui New York installed, framer-motion + zustand + tanstack-query available, sharp available.
- Read existing prisma/schema.prisma (User + Post placeholders), src/app/page.tsx (logo placeholder), src/app/globals.css (default shadcn tokens).
- Designed monochrome minimal design system (no indigo/blue) with serif display + grotesk UI, fullscreen-image-first IA.
- Chose single-route strategy: `src/app/page.tsx` reads `?v=gallery|project|admin&p=<id>` and renders the matching view, satisfying the "only `/` is user-visible" rule.
- Documented full plan + Prisma schema + file layout in this worklog.

Stage Summary:
- Plan + design system approved and frozen. Next phases: generate sample images (Task 2), DB schema (Task 3), API routes (Task 4), then frontend build (Tasks 5–7).
