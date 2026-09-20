/** Emits a schema.org JSON-LD script (server component). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify output is safe inside a script tag once "<" is escaped
  const json = JSON.stringify(data, (_, v) => (v === undefined ? undefined : v)).replace(/</g, '\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
