// Share-cover illustrations for the Lab, 1200x630. Each art() returns SVG drawn
// into the right-hand panel (x 400..1200). Light backgrounds only.
const W = 1200, H = 630, AX = 400; // art panel starts at AX

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => n.toFixed(1);

// ---------- ArtLux: video frame sampled onto LED strips ----------
function artlux() {
  const R = rng(3);
  const hue = (x, y) => 330 + (x - AX) / 800 * 230 + Math.sin(y / 70) * 25; // magenta→orange→cyan sweep
  let s = '';
  // source frame (small, top-left of panel)
  s += `<defs><linearGradient id="src" x1="0" x2="1" y1="0" y2="1">${[0, .25, .5, .75, 1].map((o) => `<stop offset="${o}" stop-color="hsl(${330 + o * 230},85%,58%)"/>`).join('')}</linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>`;
  s += `<rect x="${AX + 40}" y="56" width="200" height="112" fill="url(#src)"/>`;
  s += `<rect x="${AX + 40}" y="56" width="200" height="112" fill="none" stroke="#0b0b0b" stroke-width="1"/>`;
  s += `<text x="${AX + 40}" y="190" class="mono">SOURCE · VIDEO / NDI / DMX</text>`;
  // sampling rays from the frame to the rig
  for (let i = 0; i < 7; i++) s += `<line x1="${AX + 240}" y1="${70 + i * 15}" x2="${AX + 330 + i * 60}" y2="${250}" stroke="#d0d0d0" stroke-width="1" stroke-dasharray="2 4"/>`;
  // LED rig: curved strips
  for (let k = 0; k < 9; k++) {
    const y0 = 260 + k * 36;
    for (let i = 0; i < 46; i++) {
      const x = AX + 70 + i * 15.5;
      const y = y0 + Math.sin(i / 7 + k * 0.6) * 14;
      const hsl = `hsl(${hue(x, y) % 360},90%,${55 + R() * 6}%)`;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="${hsl}" opacity=".45" filter="url(#glow)"/>`;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="4.2" fill="${hsl}"/>`;
    }
    s += `<text x="${AX + 770}" y="${y0 + 4}" class="mono small">U${k + 1}</text>`;
  }
  return { bg: '#ffffff', svg: s };
}

// ---------- ArtLux Launcher: install / update / start ----------
function launcher() {
  const x = AX + 150, y = 95, w = 500, h = 440;
  let s = '';
  s += `<rect x="${x + 14}" y="${y + 14}" width="${w}" height="${h}" fill="#e9e9e9"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#0b0b0b"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="38" fill="#f5f5f5" stroke="#0b0b0b"/>`;
  s += `<text x="${x + 16}" y="${y + 24}" class="mono">ARTLUX LAUNCHER</text>`;
  [0, 1, 2].forEach((i) => s += `<circle cx="${x + w - 20 - i * 18}" cy="${y + 19}" r="5" fill="none" stroke="#0b0b0b"/>`);
  // logo
  s += `<rect x="${x + 32}" y="${y + 70}" width="84" height="84" rx="18" fill="#0b0b0b"/><text x="${x + 74}" y="${y + 135}" text-anchor="middle" style="font:700 58px Inter;fill:#fff">A</text>`;
  s += `<text x="${x + 140}" y="${y + 104}" style="font:300 30px Inter;fill:#0b0b0b">ArtLux</text>`;
  s += `<text x="${x + 140}" y="${y + 134}" class="mono">VENUE PC · SHOW MODE</text>`;
  const rows = [['INSTALL', 'done', 1], ['UPDATE', 'v0.34.0', 0.68], ['START', 'ready', 0]];
  rows.forEach(([k, v, p], i) => {
    const ry = y + 200 + i * 62;
    s += `<line x1="${x + 32}" y1="${ry - 22}" x2="${x + w - 32}" y2="${ry - 22}" stroke="#e5e5e5"/>`;
    s += `<text x="${x + 32}" y="${ry}" class="mono">${String(i + 1).padStart(2, '0')}  ${k}</text>`;
    s += `<text x="${x + w - 32}" y="${ry}" text-anchor="end" class="mono">${v}</text>`;
    s += `<rect x="${x + 32}" y="${ry + 12}" width="${w - 64}" height="4" fill="#ececec"/>`;
    if (p) s += `<rect x="${x + 32}" y="${ry + 12}" width="${(w - 64) * p}" height="4" fill="#0b0b0b"/>`;
  });
  s += `<rect x="${x + w - 172}" y="${y + h - 70}" width="140" height="42" fill="#0b0b0b"/><text x="${x + w - 102}" y="${y + h - 43}" text-anchor="middle" style="font:500 15px Inter;fill:#fff;letter-spacing:.08em">LAUNCH</text>`;
  return { bg: '#f5f5f5', svg: s };
}

// ---------- Plotter3D: hidden-line ridges drawn by a pen ----------
function plotter3d() {
  const R = rng(11);
  let s = `<rect x="${AX + 40}" y="40" width="720" height="550" fill="#fff" stroke="#0b0b0b" stroke-width=".8"/>`;
  const rows = 34, cols = 90, x0 = AX + 90, x1 = AX + 710;
  const bumps = Array.from({ length: 5 }, () => [R(), 0.25 + R() * 0.6, 0.05 + R() * 0.08, 60 + R() * 70]);
  const z = (u, v) => bumps.reduce((a, [bu, bv, sg, amp]) => a + amp * Math.exp(-((u - bu) ** 2 + (v - bv) ** 2) / (2 * sg * sg)), 0) + 6 * Math.sin(u * 30 + v * 9);
  let last = null;
  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    const yb = 150 + v * 390;
    const sx = x0 + (1 - v) * 60, ex = x1 - (1 - v) * 60;
    const pts = [];
    for (let c = 0; c <= cols; c++) { const u = c / cols; pts.push([sx + u * (ex - sx), yb - z(u, v) * (0.5 + v * 0.6)]); }
    const d = 'M' + pts.map((p) => f(p[0]) + ',' + f(p[1])).join('L');
    s += `<path d="${d}L${f(ex)},${f(yb + 30)}L${f(sx)},${f(yb + 30)}Z" fill="#fff" stroke="none"/>`;
    s += `<path d="${d}" fill="none" stroke="#0b0b0b" stroke-width="1.1"/>`;
    last = pts;
  }
  // pen carriage on the last line
  const [px, py] = last[62];
  s += `<line x1="${AX + 40}" y1="${f(py - 80)}" x2="${AX + 760}" y2="${f(py - 80)}" stroke="#9a9a9a" stroke-width="3"/>`;
  s += `<rect x="${f(px - 18)}" y="${f(py - 96)}" width="36" height="34" fill="#0b0b0b"/>`;
  s += `<path d="M${f(px - 6)},${f(py - 62)}L${f(px + 6)},${f(py - 62)}L${f(px)},${f(py - 2)}Z" fill="#1677d2"/>`;
  s += `<text x="${AX + 60}" y="72" class="mono">P3D · SVG EXPORT · 0.35 MM PEN</text>`;
  return { bg: '#f5f5f5', svg: s };
}

// ---------- 3DVIZ: model → render, split down the middle ----------
function viz() {
  const ox = AX + 360, oy = 390, k = 30;
  const iso = (x, y, z) => [ox + (x - y) * k * 0.866, oy + (x + y) * k * 0.5 - z * k];
  const boxes = [[-5, -3, 0, 4, 6, 2.2], [-1, -3, 0, 3, 3, 5.5], [-1, 0, 0, 6, 3, 1.4], [2, -3, 0, 3, 3, 3.2], [-5, 3, 0, 4, 2, 1]];
  const P = (pts) => 'M' + pts.map((p) => iso(...p).map(f).join(',')).join('L') + 'Z';
  const draw = (mode) => {
    let s = '';
    // ground
    s += `<path d="${P([[-7, -5, 0], [7, -5, 0], [7, 6, 0], [-7, 6, 0]])}" fill="${mode ? '#eef0ea' : 'none'}" stroke="${mode ? 'none' : '#bdbdbd'}" stroke-dasharray="${mode ? '' : '3 4'}"/>`;
    const sorted = [...boxes].sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    if (mode) sorted.forEach(([x, y, , w, d, h]) => s += `<path d="${P([[x + w, y, 0], [x + w + h * 0.9, y + h * 0.3, 0], [x + w + h * 0.9, y + d + h * 0.3, 0], [x + w, y + d, 0]])}" fill="#0b0b0b" opacity=".12"/>`);
    sorted.forEach(([x, y, z, w, d, h]) => {
      const top = P([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]);
      const left = P([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]);
      const right = P([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]);
      if (mode) {
        s += `<path d="${top}" fill="#fbfaf6" stroke="#0b0b0b" stroke-width=".6"/><path d="${left}" fill="#d9d5cc" stroke="#0b0b0b" stroke-width=".6"/><path d="${right}" fill="#ece9e2" stroke="#0b0b0b" stroke-width=".6"/>`;
        // window bands
        for (let zz = z + 0.6; zz < z + h - 0.3; zz += 0.9) s += `<path d="${P([[x + 0.3, y + d, zz], [x + w - 0.3, y + d, zz], [x + w - 0.3, y + d, zz + 0.35], [x + 0.3, y + d, zz + 0.35]])}" fill="#9fb7c4" opacity=".8"/>`;
      } else {
        s += `<path d="${top}" fill="#fff" stroke="#0b0b0b" stroke-width="1"/><path d="${left}" fill="#fff" stroke="#0b0b0b" stroke-width="1"/><path d="${right}" fill="#fff" stroke="#0b0b0b" stroke-width="1"/>`;
        for (let zz = z + 0.6; zz < z + h - 0.3; zz += 0.9) s += `<path d="${P([[x + 0.3, y + d, zz], [x + w - 0.3, y + d, zz], [x + w - 0.3, y + d, zz + 0.35], [x + 0.3, y + d, zz + 0.35]])}" fill="none" stroke="#0b0b0b" stroke-width=".5"/>`;
      }
    });
    return s;
  };
  const mid = AX + 400;
  let s = `<defs><clipPath id="L"><rect x="${AX}" y="0" width="${mid - AX}" height="${H}"/></clipPath><clipPath id="Rr"><rect x="${mid}" y="0" width="${W - mid}" height="${H}"/></clipPath>
  <radialGradient id="sky" cx=".85" cy=".1" r=".9"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#e7eef3"/></radialGradient></defs>`;
  s += `<rect x="${mid}" y="0" width="${W - mid}" height="${H}" fill="url(#sky)"/>`;
  s += `<circle cx="${W - 90}" cy="80" r="26" fill="#ffd97a"/>`;
  s += `<g clip-path="url(#L)">${draw(0)}</g><g clip-path="url(#Rr)">${draw(1)}</g>`;
  s += `<line x1="${mid}" y1="40" x2="${mid}" y2="${H - 40}" stroke="#0b0b0b" stroke-width="1.2"/>`;
  s += `<text x="${mid - 16}" y="70" text-anchor="end" class="mono">SKETCHUP · RHINO</text><text x="${mid + 16}" y="70" class="mono">TWINMOTION</text>`;
  return { bg: '#ffffff', svg: s };
}

// ---------- Coursebook: one HTML file, two languages ----------
function coursebook() {
  const page = (x, y, lang, fg) => {
    const w = 400, h = 500;
    let s = `<rect x="${x + 10}" y="${y + 10}" width="${w}" height="${h}" fill="#e6e6e6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#0b0b0b"/>`;
    s += `<rect x="${x}" y="${y}" width="110" height="${h}" fill="#f5f5f5"/><line x1="${x + 110}" y1="${y}" x2="${x + 110}" y2="${y + h}" stroke="#e5e5e5"/>`;
    for (let i = 0; i < 11; i++) s += `<rect x="${x + 14}" y="${y + 50 + i * 26}" width="${40 + ((i * 37) % 45)}" height="6" fill="${i === 3 ? '#0b0b0b' : '#cfcfcf'}"/>`;
    s += `<rect x="${x + w - 92}" y="${y + 16}" width="76" height="24" fill="none" stroke="#0b0b0b"/><rect x="${x + w - (lang === 'EN' ? 54 : 92)}" y="${y + 16}" width="38" height="24" fill="#0b0b0b"/>`;
    s += `<text x="${x + w - 73}" y="${y + 33}" text-anchor="middle" class="mono small" style="fill:${lang === 'FR' ? '#fff' : '#0b0b0b'}">FR</text><text x="${x + w - 35}" y="${y + 33}" text-anchor="middle" class="mono small" style="fill:${lang === 'EN' ? '#fff' : '#0b0b0b'}">EN</text>`;
    s += `<text x="${x + 130}" y="${y + 92}" class="mono small">CHAPITRE 04 / CHAPTER 04</text>`;
    s += `<text x="${x + 130}" y="${y + 130}" style="font:300 30px Inter;fill:#0b0b0b">${fg}</text>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${x + 130}" y="${y + 160 + i * 16}" width="${230 - (i === 5 ? 90 : (i * 23) % 40)}" height="5" fill="#bdbdbd"/>`;
    s += `<rect x="${x + 130}" y="${y + 270}" width="250" height="110" fill="#f5f5f5"/><path d="M${x + 150},${y + 360} L${x + 210},${y + 300} L${x + 250},${y + 335} L${x + 290},${y + 295} L${x + 360},${y + 360}Z" fill="#d6d6d6"/>`;
    s += `<text x="${x + 130}" y="${y + 398}" class="mono small">FIG. 4.2</text>`;
    for (let i = 0; i < 4; i++) s += `<rect x="${x + 130}" y="${y + 420 + i * 16}" width="${240 - (i * 29) % 60}" height="5" fill="#bdbdbd"/>`;
    return s;
  };
  let s = page(AX + 300, 36, 'EN', 'Lighting');
  s += page(AX + 80, 84, 'FR', 'Éclairage');
  s += `<text x="${W - 30}" y="${H - 14}" text-anchor="end" class="mono">ONE FILE · INDEX.HTML · NO BUILD</text>`;
  return { bg: '#ffffff', svg: s };
}

// ---------- Récits génératifs: a storyboard of generated frames ----------
function recits() {
  const R = rng(7);
  const scenes = [[200, 30, 'a quiet street at dawn'], [28, 70, 'neon café, rain'], [180, 18, 'rooftop, long shot'], [12, 60, 'close-up, hands'], [250, 25, 'tram at dusk'], [40, 40, 'the empty square']];
  let s = `<defs>`;
  scenes.forEach(([h, sat], i) => s += `<linearGradient id="g${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="hsl(${h},${sat}%,86%)"/><stop offset=".62" stop-color="hsl(${(h + 30) % 360},${sat + 10}%,70%)"/><stop offset="1" stop-color="hsl(${(h + 200) % 360},${sat * .6}%,38%)"/></linearGradient>`);
  s += `</defs>`;
  const fw = 232, fh = 130;
  scenes.forEach(([h, sat, cap], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = AX + 40 + col * (fw + 22), y = 70 + row * (fh + 120);
    s += `<rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="url(#g${i})"/>`;
    // horizon / shapes
    s += `<circle cx="${x + 40 + R() * 150}" cy="${y + 28 + R() * 30}" r="${12 + R() * 14}" fill="hsl(${(h + 160) % 360},70%,92%)" opacity=".9"/>`;
    let d = `M${x},${y + fh}`;
    for (let t = 0; t <= fw; t += 8) d += `L${x + t},${f(y + fh * 0.62 + Math.sin(t / 30 + i) * 10 + R() * 4)}`;
    s += `<path d="${d}L${x + fw},${y + fh}Z" fill="hsl(${(h + 200) % 360},20%,28%)" opacity=".7"/>`;
    for (let b = 0; b < 4; b++) { const bw = 14 + R() * 26, bh = 20 + R() * 50, bx = x + R() * (fw - bw); s += `<rect x="${f(bx)}" y="${f(y + fh - bh)}" width="${f(bw)}" height="${f(bh)}" fill="hsl(${(h + 200) % 360},15%,20%)" opacity=".75"/>`; }
    s += `<rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="none" stroke="#0b0b0b"/>`;
    s += `<text x="${x}" y="${y + fh + 22}" class="mono">SHOT ${String(i + 1).padStart(2, '0')} · ${['WIDE', 'MID', 'LONG', 'CLOSE', 'WIDE', 'MID'][i]}</text>`;
    s += `<text x="${x}" y="${y + fh + 42}" style="font:italic 300 14px Inter;fill:#6b6b6b">“${cap}”</text>`;
  });
  return { bg: '#ffffff', svg: s };
}

// ---------- Gaussian splatting: the Titan crane, Île de Nantes, in splats ----------
function splat() {
  const R = rng(5);
  const X0 = AX, X1 = W, Y0 = 0, Y1 = H;
  // scene in normalised coords: u 0..1 left→right, v 0..1 top→bottom
  const seg = (u, v, a, b, c, d, t) => { // distance to segment (a,b)-(c,d) < t
    const dx = c - a, dy = d - b, k = Math.max(0, Math.min(1, ((u - a) * dx + (v - b) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(u - a - k * dx, (v - b - k * dy) * 0.53) < t; // 0.53: panel aspect
  };
  const crane = (u, v) => {
    if (u > 0.30 && u < 0.34 && v > 0.24 && v < 0.74) return true; // tower
    if (u > 0.31 && u < 0.33 && v > 0.08 && v < 0.24) return true; // mast
    if (u > 0.27 && u < 0.38 && v > 0.19 && v < 0.27) return true; // cab
    if (u > 0.06 && u < 0.93 && ((v > 0.13 && v < 0.145) || (v > 0.19 && v < 0.205))) return true; // jib chords
    for (let i = 0; i < 22; i++) { const a = 0.06 + i * 0.04; if (seg(u, v, a, 0.205, a + 0.02, 0.13, 0.004) || seg(u, v, a + 0.02, 0.13, a + 0.04, 0.205, 0.004)) return true; }
    if (seg(u, v, 0.32, 0.08, 0.06, 0.135, 0.004) || seg(u, v, 0.32, 0.08, 0.6, 0.135, 0.004)) return true; // stays
    if (u > 0.06 && u < 0.12 && v > 0.205 && v < 0.27) return true; // counterweight
    if (Math.abs(u - 0.8) < 0.003 && v > 0.205 && v < 0.5) return true; // cable
    if (u > 0.79 && u < 0.81 && v > 0.5 && v < 0.53) return true; // hook
    return false;
  };
  const nefs = (u, v) => u > 0.45 && u < 0.98 && v > 0.56 - 0.04 * Math.sin(Math.PI * (u - 0.45) / 0.53) && v < 0.74;
  const color = (u, v) => {
    if (crane(u, v)) return [45, 95, 55];
    if (nefs(u, v)) return Math.sin(u * 160) > 0.6 ? [25, 10, 48] : [25, 12, 68 + v * 8];
    if (v > 0.74 && v < 0.79) return [30, 14, 78]; // quay
    if (v >= 0.79) return [200, 30, 62 + (v - 0.79) * 50 + Math.sin(u * 70) * 4]; // Loire
    return [205, 50, 93 - v * 12]; // sky
  };
  const pts = [];
  for (let i = 0; i < 9000; i++) {
    let u = R(), v = R();
    const isC = crane(u, v);
    if (!isC && R() < 0.35 && v < 0.74) continue; // thinner sky → crane reads
    const [h, sat, l] = color(u, v);
    const r0 = isC ? 1.5 + R() * 3.5 : 3 + R() ** 2 * 13;
    pts.push([v + (isC ? 1 : 0), `<ellipse cx="${f(X0 + u * (X1 - X0))}" cy="${f(Y0 + v * (Y1 - Y0))}" rx="${f(r0)}" ry="${f(r0 * (0.35 + R() * 0.65))}" transform="rotate(${f(R() * 180)} ${f(X0 + u * (X1 - X0))} ${f(Y0 + v * (Y1 - Y0))})" fill="hsl(${h},${sat}%,${f(l + (R() - 0.5) * 6)}%)" opacity="${f(isC ? 0.9 : 0.35 + R() * 0.45)}"/>`]);
  }
  pts.sort((a, b) => a[0] - b[0]); // crane splats last, on top
  let s = `<rect x="${AX}" y="0" width="${W - AX}" height="${H}" fill="#f1f5f8"/>` + pts.map((p) => p[1]).join('');
  s += `<rect x="${W - 300}" y="${H - 34}" width="280" height="22" fill="#fff" opacity=".85"/><text x="${W - 30}" y="${H - 18}" text-anchor="end" class="mono">ÎLE DE NANTES · 9,000 SPLATS</text>`;
  return { bg: '#f1f5f8', svg: s };
}

// ---------- Récits d'intérieurs: an interior, framed as a shot ----------
function interieurs() {
  const fx = AX + 50, fy = 50, fw = 700, fh = 394; // 16:9
  const vx = fx + fw * 0.56, vy = fy + fh * 0.48; // vanishing point
  const ix = fx + 230, iy = fy + 120, iw = 260, ih = 150; // back wall
  let s = `<defs><clipPath id="fr"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}"/></clipPath>
  <linearGradient id="light" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff5e1"/><stop offset="1" stop-color="#fff5e1" stop-opacity="0"/></linearGradient></defs>`;
  s += `<g clip-path="url(#fr)"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#f4efe7"/>`;
  // floor, ceiling, side walls
  s += `<path d="M${fx},${fy + fh}L${ix},${iy + ih}L${ix + iw},${iy + ih}L${fx + fw},${fy + fh}Z" fill="#d8c8b0"/>`;
  s += `<path d="M${fx},${fy}L${ix},${iy}L${ix + iw},${iy}L${fx + fw},${fy}Z" fill="#fbf8f3"/>`;
  s += `<path d="M${fx},${fy}L${ix},${iy}L${ix},${iy + ih}L${fx},${fy + fh}Z" fill="#ebe3d6"/>`;
  s += `<path d="M${fx + fw},${fy}L${ix + iw},${iy}L${ix + iw},${iy + ih}L${fx + fw},${fy + fh}Z" fill="#e4dacb"/>`;
  s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#f1ebe1"/>`;
  // floor boards
  for (let i = 1; i < 12; i++) { const t = i / 12; s += `<line x1="${f(fx + fw * t)}" y1="${fy + fh}" x2="${f(ix + iw * t)}" y2="${iy + ih}" stroke="#c4b296" stroke-width=".8"/>`; }
  // window on the right wall + light patch
  s += `<path d="M${fx + fw - 40},${fy + 70}L${ix + iw + 40},${iy + 20}L${ix + iw + 40},${iy + 115}L${fx + fw - 40},${fy + 250}Z" fill="#dfeaf0" stroke="#0b0b0b" stroke-width="1"/>`;
  s += `<path d="M${fx + fw - 70},${fy + fh}L${ix + iw - 10},${iy + ih + 8}L${ix + 120},${iy + ih + 40}L${fx + 280},${fy + fh}Z" fill="url(#light)" opacity=".9"/>`;
  // arch opening, table, chairs, lamp
  s += `<path d="M${ix + 30},${iy + ih}V${iy + 60}A40 40 0 0 1 ${ix + 110},${iy + 60}V${iy + ih}Z" fill="#c9b79c"/>`;
  s += `<rect x="${ix + 140}" y="${iy + ih + 18}" width="170" height="10" fill="#7a5a3a"/><rect x="${ix + 150}" y="${iy + ih + 28}" width="6" height="60" fill="#7a5a3a"/><rect x="${ix + 294}" y="${iy + ih + 28}" width="6" height="60" fill="#7a5a3a"/>`;
  s += `<path d="M${ix + 225},${fy}V${iy + 60}" stroke="#0b0b0b"/><path d="M${ix + 205},${iy + 82}L${ix + 245},${iy + 82}L${ix + 235},${iy + 60}L${ix + 215},${iy + 60}Z" fill="#0b0b0b"/>`;
  s += `<ellipse cx="${ix + 225}" cy="${iy + ih + 22}" rx="60" ry="8" fill="#fff4cf" opacity=".6"/>`;
  s += `<ellipse cx="${ix + 200}" cy="${fy + fh - 40}" rx="190" ry="34" fill="#b9a38a" opacity=".55"/>`;
  { const cx = fx + 110, cy = fy + fh - 30; s += `<rect x="${cx}" y="${cy - 70}" width="130" height="58" rx="10" fill="#a7714c"/><rect x="${cx - 14}" y="${cy - 36}" width="30" height="40" rx="8" fill="#8f5f3f"/><rect x="${cx + 114}" y="${cy - 36}" width="30" height="40" rx="8" fill="#8f5f3f"/><rect x="${cx + 8}" y="${cy - 22}" width="114" height="24" rx="6" fill="#b9805a"/><rect x="${cx}" y="${cy + 2}" width="5" height="16" fill="#3a2a1e"/><rect x="${cx + 125}" y="${cy + 2}" width="5" height="16" fill="#3a2a1e"/>`; }
  s += `<rect x="${ix - 20}" y="${iy + 40}" width="6" height="${ih - 40}" fill="#4b6b4b"/><circle cx="${ix - 17}" cy="${iy + 40}" r="24" fill="#5f8a5f"/>`;
  s += `</g>`;
  // camera frame marks
  s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="none" stroke="#0b0b0b"/>`;
  const m = 18;
  [[fx + m, fy + m, 1, 1], [fx + fw - m, fy + m, -1, 1], [fx + m, fy + fh - m, 1, -1], [fx + fw - m, fy + fh - m, -1, -1]].forEach(([x, y, a, b]) => s += `<path d="M${x},${y + b * 22}V${y}H${x + a * 22}" fill="none" stroke="#0b0b0b" stroke-width="1.5"/>`);
  s += `<text x="${fx + 46}" y="${fy + 40}" class="mono" style="fill:#0b0b0b"><tspan style="fill:#c0392b">●</tspan> REC  SHOT 12 / 35</text><text x="${fx + fw - 46}" y="${fy + 40}" text-anchor="end" class="mono" style="fill:#0b0b0b">1920 × 1080</text>`;
  // contact strip below
  for (let i = 0; i < 8; i++) {
    const tx = fx + i * 89, ty = fy + fh + 26;
    s += `<rect x="${tx}" y="${ty}" width="81" height="46" fill="hsl(${[30, 24, 38, 18, 200, 34, 28, 210][i]},${[22, 30, 26, 34, 18, 20, 28, 14][i]}%,${[82, 74, 86, 70, 84, 78, 88, 76][i]}%)" stroke="${i === 3 ? '#0b0b0b' : '#d0d0d0'}" stroke-width="${i === 3 ? 2 : 1}"/>`;
    s += `<path d="M${tx},${ty + 46}L${tx + 30},${ty + 26}L${tx + 51},${ty + 26}L${tx + 81},${ty + 46}Z" fill="#000" opacity=".12"/>`;
  }
  return { bg: '#ffffff', svg: s };
}

const COVERS = [
  { slug: 'artlux', kind: 'Software', title: 'ArtLux', sub: 'A media server for interactive installations', art: artlux },
  { slug: 'artlux-launcher', kind: 'Software', title: 'ArtLux Launcher', sub: 'Install, update and start ArtLux on a venue PC', art: launcher },
  { slug: 'plotter3d', kind: 'Software', title: 'Plotter3D', sub: '3D models into pen-plotter drawings', art: plotter3d },
  { slug: '3dviz', kind: 'Course manual', title: '3DVIZ', sub: 'SketchUp & Rhino to Twinmotion', art: viz },
  { slug: 'coursebook', kind: 'Authoring toolkit', title: 'Coursebook', sub: 'Bilingual course manuals in one HTML file', art: coursebook },
  { slug: 'recits-generatifs', kind: 'Course manual', title: 'Récits génératifs', sub: 'A short film made with generative AI', art: recits },
  { slug: 'gaussian-splatting', kind: 'Course manual', title: 'Gaussian Splatting', sub: 'Récits urbains — capturing the city in 3D', art: splat },
  { slug: 'recits-interieurs', kind: 'Course manual', title: 'Récits d’intérieurs', sub: 'Interior architecture on film', art: interieurs },
];

const MARK = `<path d="M222 90L358 226V364H222Z" fill="#0b0b0b"/><path d="M86 92V224L226 364" stroke="#0b0b0b" stroke-width="10" fill="none"/>`;

function page(c) {
  const { bg, svg } = c.art();
  const big = c.title.length > 14 ? 44 : 56;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,700;1,300&family=Geist+Mono:wght@500&display=block" rel="stylesheet">
<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#fff}
.mono{font:500 11px 'Geist Mono',monospace;letter-spacing:.14em;fill:#0b0b0b;text-transform:uppercase}.small{font-size:9.5px}</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#fff"/>
<rect x="${AX}" width="${W - AX}" height="${H}" fill="${bg}"/>
${svg}
<line x1="${AX}" y1="0" x2="${AX}" y2="${H}" stroke="#e5e5e5"/>
<text x="48" y="64" class="mono" style="fill:#6b6b6b">Lab · ${c.kind}</text>
<foreignObject x="48" y="${H / 2 - 110}" width="320" height="260"><div xmlns="http://www.w3.org/1999/xhtml" style="font:300 ${big}px/0.98 Inter;letter-spacing:-0.03em;color:#0b0b0b">${c.title}</div>
<div xmlns="http://www.w3.org/1999/xhtml" style="margin-top:18px;font:400 17px/1.45 Inter;color:#6b6b6b">${c.sub}</div></foreignObject>
<g transform="translate(48 ${H - 76}) scale(0.1) translate(-84 -90)">${MARK}</g>
<text x="86" y="${H - 52}" class="mono">urbandrone.xyz</text>
</svg></body></html>`;
}

module.exports = { COVERS, page, W, H, AX };
