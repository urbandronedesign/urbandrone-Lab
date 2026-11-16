// node design-system/share-cards/render.js public/og/lab [slug]
// → <slug>.jpg (1200x630) for every card in art.js, or only [slug].
// Needs puppeteer-core in %TEMP%/shots/node_modules and Chrome installed.
const path = require('path');
const fs = require('fs');
const shots = path.join(process.env.TEMP, 'shots', 'node_modules');
const puppeteer = require(path.join(shots, 'puppeteer-core'));
const { COVERS, page, W, H } = require('./art.js');

(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const only = process.argv[3];
  for (const c of COVERS) {
    if (only && c.slug !== only) continue;
    await p.setContent(page(c), { waitUntil: 'load', timeout: 90000 });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, `${c.slug}.jpg`), type: 'jpeg', quality: 88 });
    console.log('ok', c.slug);
  }
  await b.close();
})();
