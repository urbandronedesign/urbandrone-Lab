import { cn } from '@/lib/utils';

/**
 * Plain-text paragraphs (blank line = new paragraph) with inline links made
 * clickable. Deliberately minimal — no markdown engine to keep pages light.
 */
export function Prose({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={cn('prose-site', className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{linkify(p)}</p>
      ))}
    </div>
  );
}

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

function linkify(s: string): React.ReactNode[] {
  const parts = s.split(URL_RE);
  return parts.map((part, i) =>
    URL_RE.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4 hover:decoration-foreground">
        {part.replace(/^https?:\/\//, '')}
      </a>
    ) : (
      part.split('\n').flatMap((line, j, arr) => (j < arr.length - 1 ? [line, <br key={`${i}-${j}`} />] : [line]))
    )
  );
}
