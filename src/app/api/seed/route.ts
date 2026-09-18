import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Read the generated image manifest (created by scripts/gen-images.ts)
// Falls back to a small curated list if absent.
function readManifest() {
  const p = path.join(process.cwd(), 'scripts', 'manifest.json');
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as {
        name: string;
        url: string;
        width: number;
        height: number;
        alt: string;
      }[];
    } catch {
      return [];
    }
  }
  return [];
}

type SeedProject = {
  title: string;
  year: number;
  category: string;
  description: string;
  credits: string;
  imageNames: string[]; // matches the `name` field in manifest.json
};

const SEED_PROJECTS: SeedProject[] = [
  {
    title: 'Concrete & Light',
    year: 2024,
    category: 'Architecture',
    description:
      'A study of brutalist form and the way hard light carves through raw concrete. Photographed across museums, parking structures, and modernist sanctuaries in northern Europe, the series reduces mass to geometry and shadow.',
    credits: 'Photography · Atelier Studio. Locations · Copenhagen, Rotterdam, Stockholm. 2024.',
    imageNames: ['p1-1', 'p1-2', 'p1-3', 'p1-4', 'p1-5'],
  },
  {
    title: 'Fragments',
    year: 2023,
    category: 'Fine Art',
    description:
      'Twelve sheets of paper, twelve gestures. Ink, charcoal, and sumi washes collected over a winter spent removing everything until only the gesture remained.',
    credits: 'Works on paper · Atelier Studio. Studio · Reykjavík. Winter 2023.',
    imageNames: ['p2-1', 'p2-2', 'p2-3', 'p2-4'],
  },
  {
    title: 'Northern Latitudes',
    year: 2024,
    category: 'Landscape',
    description:
      'Black sand, basalt, fog. A traverse of the southern Icelandic coast made in shoulder seasons when the weather refused to commit. Made with a 4×5 camera and long exposures.',
    credits: 'Photography · Atelier Studio. Locations · Vík, Sólheimajökull, Reynisfjara. 2024.',
    imageNames: ['p3-1', 'p3-2', 'p3-3', 'p3-4'],
  },
  {
    title: 'Quiet Movement',
    year: 2023,
    category: 'Performance',
    description:
      'Long exposures of a single dancer in a black room. Each frame is between four and twelve seconds — long enough that the body becomes a substance, somewhere between smoke and stone.',
    credits: 'Photography · Atelier Studio. Performer · Tilda Wren. Studio · Berlin. 2023.',
    imageNames: ['p4-1', 'p4-2', 'p4-3', 'p4-4'],
  },
];

export async function POST(req: NextRequest) {
  try {
    const { reset } = await req.json().catch(() => ({ reset: false }));

    if (reset) {
      await db.image.deleteMany();
      await db.project.deleteMany();
    } else {
      // Skip if any project exists
      const count = await db.project.count();
      if (count > 0) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'Projects already exist' });
      }
    }

    const manifest = readManifest();
    const byName = new Map(manifest.map((m) => [m.name, m]));

    let created = 0;
    for (let i = 0; i < SEED_PROJECTS.length; i++) {
      const sp = SEED_PROJECTS[i];
      const imgs = sp.imageNames
        .map((n) => byName.get(n))
        .filter(Boolean) as { name: string; url: string; width: number; height: number; alt: string }[];

      if (imgs.length === 0) continue;

      // Create images first
      const createdImages = await Promise.all(
        imgs.map((im) =>
          db.image.create({
            data: { url: im.url, width: im.width, height: im.height, alt: im.alt },
          })
        )
      );

      const coverId = createdImages[0].id;
      const project = await db.project.create({
        data: {
          title: sp.title,
          year: sp.year,
          category: sp.category,
          description: sp.description,
          credits: sp.credits,
          coverId,
          order: i,
          published: true,
          images: { connect: createdImages.map((im) => ({ id: im.id })) },
        },
      });
      created++;
      void project;
    }

    revalidatePath('/');
    return NextResponse.json({ ok: true, created });
  } catch (e: any) {
    console.error('POST /api/seed error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
