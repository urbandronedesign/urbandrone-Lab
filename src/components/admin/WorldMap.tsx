'use client';

import { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { whereAlpha2 } from 'iso-3166-1';

type Row = { code: string; name: string; visitors: number };

const W = 960;
const H = 470;

// Sequential scale: one hue (the foreground), five lightness steps via opacity.
// Zero/no data uses the muted surface so "none" is never confused with "few".
const STEPS = [0.18, 0.34, 0.52, 0.72, 1];

function thresholds(values: number[]): number[] {
  const v = [...values].filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length === 0) return [];
  // quantile breaks at 20/40/60/80 % so each step holds ~equal numbers of countries
  return [0.2, 0.4, 0.6, 0.8].map((q) => v[Math.min(v.length - 1, Math.floor(q * v.length))]);
}

/** Visitors by country on a Natural Earth projection. */
export function WorldMap({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<{ x: number; y: number; name: string; visitors: number } | null>(null);

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

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitors by country" className="block h-auto w-full">
        <g onMouseLeave={() => setHover(null)}>
          {features.map((f) => {
            const row = byNumeric.get(String(Number(f.id)));
            const d = path(f) ?? '';
            const op = row ? opacityFor(row.visitors) : 0;
            const name = row?.name ?? (f.properties as { name?: string })?.name ?? '';
            return (
              <path
                key={String(f.id)}
                d={d}
                fill={op ? 'var(--foreground)' : 'var(--muted)'}
                fillOpacity={op || 1}
                stroke="var(--background)"
                strokeWidth={0.6}
                className="transition-[fill-opacity] duration-150"
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, name, visitors: row?.visitors ?? 0 });
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

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 tracking-mono text-[10px] text-muted-foreground">
        <span>0</span>
        <div className="flex h-2 overflow-hidden">
          <span className="w-6 bg-muted" />
          {STEPS.map((o) => (
            <span key={o} className="w-6 bg-foreground" style={{ opacity: o }} />
          ))}
        </div>
        <span>{max.toLocaleString('en-GB')} visitors</span>
      </div>
    </div>
  );
}
