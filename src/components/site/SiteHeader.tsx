'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/artworks/', label: 'Artworks' },
  { href: '/lab/', label: 'Lab' },
  { href: '/bio/', label: 'Bio' },
];

function isActive(pathname: string, href: string) {
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(href);
}

export function SiteHeader() {
  const site = useSite();
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  // Close on Escape or on a click outside the menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('#mobile-menu, [aria-controls="mobile-menu"]')) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="gutter mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between md:h-16">
        <Link href="/" className="flex items-center gap-3 cursor-pointer" aria-label={`${site.name} — home`}>
          <Logo className="h-5 w-5 md:h-6 md:w-6" />
          <span className="text-sm font-medium tracking-tight md:text-base">{site.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href) ? 'page' : undefined}
              className={cn(
                't-label cursor-pointer py-3 transition-colors duration-150 hover:text-foreground',
                isActive(pathname, n.href) ? 'text-foreground underline decoration-1 underline-offset-[10px]' : 'text-muted-foreground'
              )}
            >
              {n.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        <div className="flex items-center md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 cursor-pointer items-center justify-center"
          >
            {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Dropdown menu (mobile): anchored under the menu button */}
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Primary mobile"
          className="gutter absolute right-0 top-full z-40 md:hidden"
        >
          <ul className="mt-2 min-w-[11rem] border border-border bg-background py-1 shadow-lg">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                  className={cn(
                    't-label block cursor-pointer px-4 py-3 transition-colors hover:bg-muted hover:text-foreground',
                    isActive(pathname, n.href) ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
