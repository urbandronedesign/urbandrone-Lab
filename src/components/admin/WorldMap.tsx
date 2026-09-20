'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { whereAlpha2 } from 'iso-3166-1';
import { Minus, Plus, Maximize } from 'lucide-react';

type Row = { code: string; name: string; visitors: number };

const W = 960;
const H = 470;
const MIN_K = 1;
const MAX_K = 8;

// Sequential scale: one hue (the foreground), five lightness steps via opacity.
// Zero/no data uses the muted surface so "none" is never confused with "few".
const STEPS = [0.18, 0.34, 0.52, 0.72, 1];

function thresholds(values: number[]): number[] {
  const v = [...values].filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length === 0) return [];
  // quantile breaks at 20/40/60/80 % so each step holds ~equal numbers of countries
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.min(v.length - 1, Math.floor(q * v.length))]);
}

type View = { k: number; x: number; y: number };
const HOME: View = { k: 1, x: 0, y: 0 };

/** Keep the map covering the viewport: no empty margins when panned. */
function clamp(v: View): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  const x = Math.min(0, Math.max(W - W * k, v.x));
  const y = Math.min(0, Math.max(H - H * k, v.y));
  return { k, x, y };
}

/** Visitors by country on a Natural Earth projection. Wheel / pinch to zoom, drag to pan, double-click to zoom in. */
export function WorldMap({ rows }: { rows: Row[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(HOME);
  const [hover, setHover] = useState<{ x: number; y: number; name: string; visitors: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; k: number } | null>(null);

  const { features, path } = useMemo(() => {
    const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
    const fc = feature(topo, topo.objects.countries);
    const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], fc);
    return { features: fc.features, path: geoPath(projection) };
  }, []);

  const byNumeric = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of rows) {
      const iso = whereAlpha2(r.code);
      if (iso) m.set(String(Number(iso.numeric)), r);
    }
    return m;
  }, [rows]);

  const breaks = useMemo(() => thresholds(rows.map((r) => r.visitors)), [rows]);
  const opacityFor = (n: number) => {
    if (n <= 0) return 0;
    let i = 0;
    while (i < breaks.length && n > breaks[i]) i++;
    return STEPS[Math.min(i, STEPS.length - 1)];
  };
  const max = Math.max(0, ...rows.map((r) => r.visitors));

  /** Client → SVG user-space coordinates. */
  const toSvg = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current!;
    const r = el.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H, px: clientX - r.left, py: clientY - r.top };
  }, []);

  /** Zoom by `factor` keeping the SVG point (sx, sy) fixed under the cursor. */
  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const f = k / v.k;
      return clamp({ k, x: sx - (sx - v.x) * f, y: sy - (sy - v.y) * f });
    });
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = toSvg(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * 0.0015), x, y);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [toSvg, zoomAt]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: view.k };
      drag.current = null;
    } else {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
      const target = pinch.current.k * (dist / pinch.current.dist);
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, target));
        const f = k / v.k;
        return clamp({ k, x: mid.x - (mid.x - v.x) * f, y: mid.y - (mid.y - v.y) * f });
      });
      setHover(null);
      return;
    }
    if (drag.current && drag.current.id === e.pointerId) {
      const r = svgRef.current!.getBoundingClientRect();
      const dx = ((e.clientX - drag.current.x) / r.width) * W;
      const dy = ((e.clientY - drag.current.y) / r.height) * H;
      if (!drag.current.moved && Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) {
        drag.current.moved = true;
        setDragging(true);
      }
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      if (drag.current.moved) {
        setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
        setHover(null);
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag.current?.id === e.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = toSvg(e.clientX, e.clientY);
    zoomAt(2, x, y);
  };

  const zoomButton = (factor: number) => zoomAt(factor, W / 2, H / 2);
  const zoomed = view.k > 1.01;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Visitors by country"
        className={`block h-auto w-full touch-none select-none ${dragging ? 'cursor-grabbing' : zoomed ? 'cursor-grab' : 'cursor-zoom-in'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onMouseLeave={() => setHover(null)}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {features.map((f, i) => {
            // a few territories in the atlas carry no ISO id → fall back to the index
            const row = f.id != null ? byNumeric.get(String(Number(f.id))) : undefined;
            const d = path(f) ?? '';
            const op = row ? opacityFor(row.visitors) : 0;
            const name = row?.name ?? (f.properties as { name?: string })?.name ?? '';
            return (
              <path
                key={f.id != null ? String(f.id) : `f${i}`}
                d={d}
                fill={op ? 'var(--foreground)' : 'var(--muted)'}
                fillOpacity={op || 1}
                stroke="var(--border)"
                strokeWidth={0.7}
                vectorEffect="non-scaling-stroke"
                onMouseMove={(e) => {
                  if (drag.current?.moved) return;
                  const { px, py } = toSvg(e.clientX, e.clientY);
                  setHover({ x: px, y: py, name, visitors: row?.visitors ?? 0 });
                }}
              >
                <title>{`${name}: ${row ? row.visitors.toLocaleString('en-GB') : 0} visitors`}</title>
              </path>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full border border-border bg-background px-2 py-1 text-xs shadow-sm" style={{ left: hover.x, top: hover.y - 8 }}>
          <span>{hover.name}</span>
          <span className="tracking-mono ml-2 tabular-nums text-muted-foreground">{hover.visitors.toLocaleString('en-GB')}</span>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-2 top-2 flex flex-col border border-border bg-background/90 backdrop-blur">
        <button type="button" onClick={() => zoomButton(1.6)} aria-label="Zoom in" className="flex h-8 w-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30" disabled={view.k >= MAX_K}>
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => zoomButton(1 / 1.6)} aria-label="Zoom out" className="flex h-8 w-8 cursor-pointer items-center justify-center border-t border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30" disabled={!zoomed}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setView(HOME)} aria-label="Reset zoom" className="flex h-8 w-8 cursor-pointer items-center justify-center border-t border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30" disabled={!zoomed}>
          <Maximize className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-between gap-3 tracking-mono text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>0</span>
          <div className="flex h-2 overflow-hidden">
            <span className="w-6 bg-muted" />
            {STEPS.map((o) => (
              <span key={o} className="w-6 bg-foreground" style={{ opacity: o }} />
            ))}
          </div>
          <span>{max.toLocaleString('en-GB')} visitors</span>
        </div>
        <span className="hidden sm:inline">{zoomed ? `${view.k.toFixed(1)}× · drag to pan` : 'scroll or double-click to zoom'}</span>
      </div>
    </div>
  );
}
