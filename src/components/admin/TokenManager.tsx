'use client';

import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Star, X } from 'lucide-react';
import type { Token } from '@/lib/types';
import { useTokenPool } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TokenPool, TokenTile } from './TokenPool';

function SortableToken({
  token,
  index,
  isCover,
  highlighted,
  locked,
  onSetCover,
  onRemove,
  onSelect,
}: {
  token: Token;
  index: number;
  isCover: boolean;
  highlighted: boolean;
  locked: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: token.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 }} className={cn(isDragging && 'opacity-70')}>
      <TokenTile token={token} selected={isCover} highlighted={highlighted} onToggle={onSelect}>
        <span className="absolute left-1.5 top-1.5 z-20 bg-black/60 px-1.5 py-0.5 tracking-mono text-[9px] uppercase tracking-[0.2em] text-white">
          {String(index + 1).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={onSetCover}
          title={isCover ? 'Cover' : 'Set as cover'}
          className={cn(
            'absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition',
            isCover ? 'bg-foreground text-background' : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
          )}
        >
          <Star className={cn('h-3.5 w-3.5', isCover && 'fill-current')} />
        </button>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove from project"
            className="absolute bottom-7 right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-y-0 left-0 z-20 flex w-7 cursor-grab items-center justify-center bg-gradient-to-r from-black/40 to-transparent text-white opacity-0 transition active:cursor-grabbing group-hover:opacity-100"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TokenTile>
    </div>
  );
}

/**
 * Tokens attached to a project: reorder, pick the cover, add from the pool or
 * remove. `locked` (contract projects) disables add/remove — membership comes
 * from the sync; hide a token in the Tokens tab to drop it instead.
 */
export function TokenManager({
  tokens,
  onChange,
  coverTokenId,
  onCoverChange,
  locked = false,
  selectedId = null,
  onSelect,
}: {
  tokens: Token[];
  onChange: (t: Token[]) => void;
  coverTokenId: string | null;
  onCoverChange: (id: string | null) => void;
  locked?: boolean;
  selectedId?: string | null;
  onSelect?: (token: Token) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = tokens.findIndex((t) => t.id === active.id);
    const to = tokens.findIndex((t) => t.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(tokens, from, to));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em]">Tezos tokens</p>
          <p className="text-[10px] text-muted-foreground tracking-mono">
            {locked ? 'Membership follows the contract · hide tokens in the Tokens tab · drag to reorder' : 'Drag to reorder · ★ sets the cover'}
          </p>
        </div>
        {!locked && (
          <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Add from Tezos
          </Button>
        )}
      </div>

      {tokens.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No tokens attached.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tokens.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {tokens.map((t, i) => (
                <SortableToken
                  key={t.id}
                  token={t}
                  index={i}
                  isCover={coverTokenId === t.id}
                  highlighted={selectedId === t.id}
                  locked={locked}
                  onSelect={onSelect ? () => onSelect(t) : undefined}
                  onSetCover={() => onCoverChange(coverTokenId === t.id ? null : t.id)}
                  onRemove={() => {
                    onChange(tokens.filter((x) => x.id !== t.id));
                    if (coverTokenId === t.id) onCoverChange(null);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto thin-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl italic">Add from Tezos</DialogTitle>
            <DialogDescription className="text-xs tracking-mono uppercase tracking-[0.2em]">
              Select tokens, then “Add to project”
            </DialogDescription>
          </DialogHeader>
          <TokenPicker exclude={tokens.map((t) => t.id)} onAdd={(picked) => { onChange([...tokens, ...picked]); setPickerOpen(false); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** TokenPool in pick mode, resolving the picked ids back to Token objects. */
function TokenPicker({ exclude, onAdd }: { exclude: string[]; onAdd: (tokens: Token[]) => void }) {
  const { data } = useTokenPool();
  return (
    <TokenPool
      mode="pick"
      exclude={exclude}
      onPick={(ids) => {
        const byId = new Map((data?.tokens ?? []).map((t) => [t.id, t]));
        onAdd(ids.map((id) => byId.get(id)).filter((t): t is Token => !!t));
      }}
    />
  );
}
