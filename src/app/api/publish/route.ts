import { NextRequest, NextResponse } from 'next/server';
import { publish } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

/** Admin only (proxy.ts): commit every change and push, which triggers the deploy. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.slice(0, 200) : '';
    const result = await publish(message);
    return NextResponse.json(result);
  } catch (e: any) {
    const msg: string = e?.stderr || e?.message || 'Publish failed';
    return NextResponse.json({ error: msg.trim().split('\n').slice(-3).join(' ') }, { status: 400 });
  }
}
