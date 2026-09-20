'use client';

import { useUploadImage } from '@/lib/queries';
import { toast } from 'sonner';
import Image from 'next/image';
import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Upload, X, Star, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ManagedImage = {
  id: string; // can be a temp id for new uploads; real id from API
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string;
  isNew?: boolean;
};

function SortableImage({
  image,
  index,
  isCover,
  highlighted,
  onSetCover,
  onDelete,
  onSelect,
}: {
  image: ManagedImage;
  index: number;
  isCover: boolean;
  highlighted?: boolean;
  onSetCover: () => void;
  onDelete: () => void;
  onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative aspect-[4/3] w-full overflow-hidden border bg-muted',
        isCover ? 'border-foreground' : 'border-border',
        highlighted && 'outline outline-2 outline-offset-2 outline-foreground',
        isDragging && 'opacity-70 shadow-lg'
      )}
    >
      {onSelect && <button type="button" onClick={onSelect} aria-label="Preview" className="absolute inset-0 z-[5]" />}
      <Image
        src={image.url}
        alt={image.alt ?? ''}
        fill
        sizes="(max-width: 768px) 50vw, 240px"
        className="object-cover"
        unoptimized={image.isNew}
      />

      {/* index number */}
      <span className="absolute left-1.5 top-1.5 z-10 tracking-mono text-[9px] uppercase tracking-[0.2em] text-white bg-black/60 px-1.5 py-0.5">
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* cover badge / set-cover */}
      <button
        type="button"
        onClick={onSetCover}
        title={isCover ? 'Cover image' : 'Set as cover'}
        className={cn(
          'absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition',
          isCover ? 'bg-foreground text-background' : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
        )}
      >
        <Star className={cn('h-3.5 w-3.5', isCover && 'fill-current')} />
      </button>

      {/* delete */}
      <button
        type="button"
        onClick={onDelete}
        title="Remove image"
        className="absolute bottom-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-y-0 left-0 flex w-8 cursor-grab items-center justify-center bg-gradient-to-r from-black/40 to-transparent text-white opacity-0 transition active:cursor-grabbing group-hover:opacity-100"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}

export function ImageManager({
  images,
  onChange,
  coverId,
  onCoverChange,
  selectedId = null,
  onSelect,
}: {
  images: ManagedImage[];
  onChange: (imgs: ManagedImage[]) => void;
  coverId: string | null;
  onCoverChange: (id: string | null) => void;
  selectedId?: string | null;
  onSelect?: (img: ManagedImage) => void;
}) {
  const upload = useUploadImage();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (list.length === 0) return;

      const newOnes: ManagedImage[] = [];
      for (const f of list) {
        try {
          const r = await upload.mutateAsync(f);
          newOnes.push({
            id: r.image.id,
            url: r.image.url,
            width: r.image.width,
            height: r.image.height,
            alt: r.image.alt,
            isNew: true,
          });
        } catch (e: any) {
          toast.error(`Upload failed for ${f.name}`, { description: e?.message });
        }
      }

      const next = [...images, ...newOnes];
      onChange(next);
      // auto-pick first cover if missing
      if (!coverId && next.length > 0) {
        onCoverChange(next[0].id);
      }
    },
    [images, coverId, onChange, onCoverChange, upload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(images, oldIndex, newIndex));
  };

  const deleteImage = (id: string) => {
    onChange(images.filter((i) => i.id !== id));
    if (coverId === id) {
      const next = images.filter((i) => i.id !== id);
      onCoverChange(next.length > 0 ? next[0].id : null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Images</label>
        <span className="tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {images.length} file{images.length === 1 ? '' : 's'} · drag to reorder
        </span>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed py-6 transition',
          dragOver ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/40'
        )}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {upload.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Drop images here or click to upload
            </>
          )}
        </div>
        <p className="text-[10px] tracking-mono uppercase tracking-[0.2em] text-muted-foreground">
          PNG · JPG · WEBP · max 20 MB
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Image grid */}
      {images.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {images.map((im, i) => (
                <SortableImage
                  key={im.id}
                  image={im}
                  index={i}
                  isCover={coverId === im.id}
                  highlighted={selectedId === im.id}
                  onSetCover={() => onCoverChange(im.id)}
                  onDelete={() => deleteImage(im.id)}
                  onSelect={onSelect ? () => onSelect(im) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-xs text-muted-foreground">No images yet. Upload at least one.</p>
      )}
    </div>
  );
}
