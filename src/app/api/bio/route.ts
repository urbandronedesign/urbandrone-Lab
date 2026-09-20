import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getBio, saveBio, type CvEntry } from '@/lib/bio';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ bio: await getBio() });
}

/** Admin only (proxy.ts guards PUT). Body: { headline?, text?, portraitId?, cv? } */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { headline?: unknown; text?: unknown; portraitId?: unknown; cv?: unknown };
    const input: Parameters<typeof saveBio>[0] = {};
    if (body.headline !== undefined) {
      if (typeof body.headline !== 'string') return NextResponse.json({ error: 'headline must be text' }, { status: 400 });
      input.headline = body.headline;
    }
    if (body.text !== undefined) {
      if (typeof body.text !== 'string') return NextResponse.json({ error: 'text must be text' }, { status: 400 });
      input.text = body.text;
    }
    if (body.portraitId !== undefined) {
      if (body.portraitId !== null && typeof body.portraitId !== 'string') return NextResponse.json({ error: 'portraitId invalid' }, { status: 400 });
      input.portraitId = body.portraitId as string | null;
    }
    if (body.cv !== undefined) {
      if (!Array.isArray(body.cv)) return NextResponse.json({ error: 'cv must be a list' }, { status: 400 });
      for (const e of body.cv as CvEntry[]) {
        if (e.url && !/^(https?:\/\/|mailto:|\/)/i.test(e.url)) {
          return NextResponse.json({ error: `Link for "${e.text?.slice(0, 40)}" needs a full URL` }, { status: 400 });
        }
      }
      input.cv = body.cv as CvEntry[];
    }
    const bio = await saveBio(input);
    revalidatePath('/bio');
    return NextResponse.json({ bio });
  } catch (e: any) {
    console.error('PUT /api/bio error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
