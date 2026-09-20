import { getSite } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Everything public is crawlable. AI crawlers are named explicitly so the
 * intent is unambiguous: the work is meant to be found and understood.
 */
export async function GET() {
  const site = await getSite();
  const base = (site.url || 'https://urbandrone.xyz').replace(/\/$/, '');
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'CCBot', 'Amazonbot', 'meta-externalagent', 'DuckAssistBot', 'MistralAI-User'];
  const text = ['User-agent: *', 'Allow: /', '', ...aiBots.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']), `Sitemap: ${base}/sitemap.xml`, ''].join('\n');
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
