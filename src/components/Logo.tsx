/** The Urbandrone mark. Inherits `currentColor`, so it is black on the light site and white on dark surfaces. */
export function Logo({ className, title = 'Urbandrone' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="84 90 274 274" fill="none" aria-label={title} role="img" className={className}>
      <path d="M222 90L358 226V364H222Z" fill="currentColor" />
      <path d="M86 92V224L226 364" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
