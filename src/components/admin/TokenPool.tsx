'use client';

import { useMemo, useState } from 'react';
import { useTokenPool, useSetTokenHidden } from '@/lib/queries';
import type { Token } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Eye, EyeOff, ExternalLink, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

const KIND_LABEL: Record<Token['kind'], string> = {
  image: '',
  video: '▶ video',
  audio: '♪ audio',
  interactive: '⟐ interactive',
  other: '⟐ file',
};

export function TokenTile({
  token,
  selected,
  highlighted,
  onToggle,
  dimmed,
  children,
}: {
  token: Token;
  selected?: boolean;
  highlighted?: boolean;
  onToggle?: () => void;
  dimmed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden border bg-muted text-left',
        selected ? 'border-foreground ring-1 ring-foreground' : 'border-border',
        highlighted && 'outline outline-2 outline-offset-2 outline-foreground',
        dimmed && 'opacity-40'
      )}
    >
      {token.thumb ? (
        <img
          src={token.thumb}
          alt={token.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={token.placeholder ? { backgroundImage: `url(${token.placeholder})`, backgroundSize: 'cover' } : undefined}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center tracking-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          no preview
        </div>
      )}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={selected ? 'Deselect' : 'Select'}
          className="absolute inset-0 z-10"
        />
      )}
      {selected && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      {KIND_LABEL[token.kind] && (
        <span className="pointer-events-none absolute bottom-7 left-1.5 z-20 bg-black/60 px-1 py-0.5 tracking-mono text-[8px] uppercase tracking-[0.2em] text-white">
          {KIND_LABEL[token.kind]}
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
        <p className="truncate text-[11px] text-white">{token.name || `#${token.tokenId}`}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Browse every synced token. In `pick` mode the caller receives the selected
 * ids (for adding to a project); otherwise it's a curation view with hide/show.
 */
export function TokenPool({
  mode = 'curate',
  exclude = [],
  onPick,
}: {
  mode?: 'curate' | 'pick';
  exclude?: string[];
  onPick?: (ids: string[]) => void;
}) {
  const [contract, setContract] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [showHidden, setShowHidden] = useState(mode === 'curate');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useTokenPool({ contract, q: q.trim() || undefined });
  const setHidden = useSetTokenHidden();

  const excluded = useMemo(() => new Set(exclude), [exclude]);
  const tokens = useMemo(
    () => (data?.tokens ?? []).filter((t) => (showHidden || !t.hidden) && !(mode === 'pick' && excluded.has(t.id))),
    [data, showHidden, mode, excluded]
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulkHide = async (hidden: boolean) => {
    const ids = [...selected];
    try {
      for (const id of ids) await setHidden.mutateAsync({ id, hidden });
      toast.success(`${ids.length} token${ids.length === 1 ? '' : 's'} ${hidden ? 'hidden' : 'shown'}`);
      setSelected(new Set());
    } catch (e: any) {
      toast.error('Update failed', { description: e?.message });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, description, tags" className="h-8 w-64 pl-8 text-xs" />
        </div>
        <select
          value={contract ?? ''}
          onChange={(e) => setContract(e.target.value || null)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">All contracts · {data?.tokens.length ?? 0}</option>
          {data?.contracts.map((c) => (
            <option key={c.contract} value={c.contract}>
              {c.own ? '★ ' : ''}{c.name} · {c.count}
            </option>
          ))}
        </select>
        {mode === 'curate' && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            show hidden
          </label>
        )}
        <span className="ml-auto tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {tokens.length} shown · {selected.size} selected
        </span>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          {mode === 'pick' ? (
            <Button size="sm" onClick={() => onPick?.([...selected])}>
              Add {selected.size} to project
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => bulkHide(true)} disabled={setHidden.isPending}>
                <EyeOff className="mr-2 h-3.5 w-3.5" /> Hide
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkHide(false)} disabled={setHidden.isPending}>
                <Eye className="mr-2 h-3.5 w-3.5" /> Show
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          {setHidden.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Failed to load tokens: {(error as Error).message}</p>
      ) : tokens.length === 0 ? (
        <p className="py-10 text-center font-display text-xl italic text-muted-foreground">
          {data?.wallets.length ? 'No tokens here. Run a sync first.' : 'Set TEZOS_WALLETS in .env, then sync.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {tokens.map((t) => (
            <TokenTile key={t.id} token={t} selected={selected.has(t.id)} onToggle={() => toggle(t.id)} dimmed={t.hidden}>
              <a
                href={t.objktUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on objkt"
                className="absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
              {t.hidden && (
                <span className="pointer-events-none absolute right-1.5 top-1.5 z-20 bg-black/60 px-1 py-0.5 tracking-mono text-[8px] uppercase tracking-[0.2em] text-white">
                  hidden
                </span>
              )}
            </TokenTile>
          ))}
        </div>
      )}
    </div>
  );
}
