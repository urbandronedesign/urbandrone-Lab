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
  { href: '/#about', label: 'About' },
];

function isActive(pathname: string, href: string) {
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(href);
}

export function SiteHeader() {
  const site = useSite();
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  // Lock scroll while the menu is open (links below close it on click)
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
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

      {/* Full-screen menu (mobile) */}
      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col bg-background transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Primary mobile" className="gutter flex flex-1 flex-col justify-center gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn('t-h1 cursor-pointer py-3', isActive(pathname, n.href) ? 'text-foreground' : 'text-muted-foreground')}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="gutter pb-10 t-label text-muted-foreground">{site.tagline}</div>
      </div>
    </header>
  );
}
