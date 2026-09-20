/** Top block of an index page: small label, display title, optional lead. */
export function PageIntro({ label, title, lead, children }: { label?: string; title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="gutter mx-auto w-full max-w-[1600px] pt-12 pb-10 md:pt-20 md:pb-16">
      {label && <p className="t-label mb-4 text-muted-foreground">{label}</p>}
      <h1 className="t-display">{title}</h1>
      {lead && <p className="t-lead mt-6 max-w-[42rem] text-muted-foreground">{lead}</p>}
      {children}
    </div>
  );
}
