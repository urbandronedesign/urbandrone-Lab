import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSite, saveSite } from '@/lib/site';
import type { SiteInfo } from '@/lib/site-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ site: await getSite() });
}

/** Admin only (proxy.ts guards PUT). */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<SiteInfo>;
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (body.url && !/^https?:\/\//i.test(body.url)) {
      return NextResponse.json({ error: 'Site URL must start with http:// or https://' }, { status: 400 });
    }
    if (body.goatcounterCode && !/^[a-z0-9-]{2,50}$/i.test(body.goatcounterCode.trim())) {
      return NextResponse.json({ error: 'GoatCounter code is the subdomain part only, e.g. "urbandrone" for urbandrone.goatcounter.com' }, { status: 400 });
    }
    for (const l of body.links ?? []) {
      if (!/^(https?:\/\/|mailto:|\/)/i.test(l.url)) {
        return NextResponse.json({ error: `Link "${l.label}" needs a full URL (https://… or mailto:…)` }, { status: 400 });
      }
    }
    const site = await saveSite(body);
    revalidatePath('/', 'layout');
    return NextResponse.json({ site });
  } catch (e: any) {
    console.error('PUT /api/site error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
