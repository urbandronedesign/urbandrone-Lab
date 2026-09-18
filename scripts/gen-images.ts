import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/uploads';

type Job = { prompt: string; size: string; name: string };

const jobs: Job[] = [
  // Project 1: "Concrete & Light" — Brutalist architecture
  { name: 'p1-1', size: '1440x720', prompt: 'Brutalist concrete staircase shot from below, dramatic angular shadow, pure black and white architectural photography, fine art, ultra detailed, no people, harsh sunlight' },
  { name: 'p1-2', size: '1440x720', prompt: 'Raw concrete museum exterior facade, stark sunlight raking across surface, monochrome architectural fine art photography, deep shadow, minimalist composition' },
  { name: 'p1-3', size: '1440x720', prompt: 'Brutalist parking garage interior, light rays cutting through concrete pillars, black and white fine art architectural photography, moody, no people' },
  { name: 'p1-4', size: '1440x720', prompt: 'Modernist concrete bridge structure against cloudless sky, graphic black and white architecture, minimalist fine art photography' },
  { name: 'p1-5', size: '1344x768', prompt: 'Concrete church interior, single shaft of light from above, monochrome architectural photography, fine art, dramatic shadow play, empty' },

  // Project 2: "Fragments" — Abstract ink studies (portrait orientation)
  { name: 'p2-1', size: '864x1152', prompt: 'Black ink splash abstract on warm white paper, single expressive gesture, minimalist fine art, high contrast monochrome, japanese sumi-e inspired' },
  { name: 'p2-2', size: '864x1152', prompt: 'Charcoal line drawing abstract flowing forms on cream paper, monochrome minimalist fine art, gestural mark making, no figure' },
  { name: 'p2-3', size: '864x1152', prompt: 'Sumi-e ink wash abstract suggestion of mountains, white space, japanese minimalist fine art photography, pure monochrome' },
  { name: 'p2-4', size: '864x1152', prompt: 'Black ink calligraphic strokes on rice paper, abstract minimal composition, fine art scan, high contrast, no text readable' },

  // Project 3: "Northern Latitudes" — Icelandic landscape
  { name: 'p3-1', size: '1440x720', prompt: 'Icelandic black sand beach with basalt columns in distance, low fog, desaturated monochrome fine art landscape photography, no people, dramatic sky' },
  { name: 'p3-2', size: '1440x720', prompt: 'Inside glacier ice cave, smooth blue-white ice forms, near monochrome landscape photography, fine art, cold atmosphere, no people' },
  { name: 'p3-3', size: '1440x720', prompt: 'Lonely sharp peak mountain under heavy storm clouds, stark black and white landscape photography, fine art, distant view, no people' },
  { name: 'p3-4', size: '1440x720', prompt: 'Volcanic basalt rock formation emerging from fog, desaturated black and white fine art landscape, moody, no people, long exposure water' },

  // Project 4: "Quiet Movement" — Long-exposure dance (portrait)
  { name: 'p4-1', size: '864x1152', prompt: 'Long exposure photograph of dancer in flowing white silk, ghostly motion blur against black backdrop, monochrome fine art performance photography' },
  { name: 'p4-2', size: '864x1152', prompt: 'Slow shutter dance photograph, billowing fabric trails, pure black background, fine art black and white performance, abstract motion' },
  { name: 'p4-3', size: '864x1152', prompt: 'Performance artist mid-movement, ghostly multiple exposure trail, dark studio, monochrome fine art portrait, no face visible' },
  { name: 'p4-4', size: '864x1152', prompt: 'Long exposure dance, single figure dissolving into motion blur, vast empty stage, black and white fine art performance photography' },
];

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const zai = await ZAI.create();
  const manifest: { name: string; url: string; width: number; height: number; alt: string }[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    const outPath = path.join(OUT, `${j.name}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`[${i + 1}/${jobs.length}] skip (exists): ${j.name}`);
      const [w, h] = j.size.split('x').map(Number);
      manifest.push({ name: j.name, url: `/uploads/${j.name}.png`, width: w, height: h, alt: j.prompt });
      continue;
    }
    try {
      console.log(`[${i + 1}/${jobs.length}] generating: ${j.name} (${j.size})`);
      const res = await zai.images.generations.create({ prompt: j.prompt, size: j.size });
      const b64 = res.data[0].base64;
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      const [w, h] = j.size.split('x').map(Number);
      manifest.push({ name: j.name, url: `/uploads/${j.name}.png`, width: w, height: h, alt: j.prompt });
      console.log(`  -> ok ${outPath}`);
    } catch (e: any) {
      console.error(`  -> FAIL ${j.name}: ${e?.message ?? e}`);
    }
  }
  fs.writeFileSync('/home/z/my-project/scripts/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('DONE. Manifest written to scripts/manifest.json');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
