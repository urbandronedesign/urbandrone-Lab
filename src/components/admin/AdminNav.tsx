'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSite } from '@/components/SiteProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/site', label: 'Site' },
  { href: '/admin/bio', label: 'Bio' },
  { href: '/admin/account', label: 'Account' },
];

/** Shared admin header: mark + name, section links, sign out. */
export function AdminNav({ children }: { children?: React.ReactNode }) {
  const site = useSite();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-6 px-6 md:px-12 lg:px-24">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo className="h-6 w-6" />
            <span className="font-display text-2xl italic">{site.name}</span>
            <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">· Admin</span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex" aria-label="Admin">
            {NAV.map((n) => {
              const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} className={cn('tracking-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-foreground', active ? 'text-foreground underline underline-offset-[10px]' : 'text-muted-foreground')}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {children}
          <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
