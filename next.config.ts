import type { NextConfig } from "next";

// Two build modes from one codebase:
//
//  - default (`next dev`, `next build`): the full app — public gallery, admin
//    UI, API routes, auth proxy. Meant to run locally.
//
//  - STATIC_EXPORT=1 (`npm run build:static`): only the public gallery, as
//    plain HTML/JS in `out/`, with project data read from the SQLite DB at
//    build time. This is what gets deployed to GitHub Pages.
//
// The split is done with `pageExtensions`: files named `*.pub.tsx` are routes
// in both modes; ordinary `page.tsx` / `route.ts` files (admin, API) only
// exist in the full app.
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  ...(isStatic
    ? {
        output: "export",
        pageExtensions: ["pub.tsx"],
        // No image optimizer on a static host; uploads are served as stored.
        images: { unoptimized: true },
      }
    : {
        pageExtensions: ["tsx", "ts", "pub.tsx"],
      }),
};

export default nextConfig;
