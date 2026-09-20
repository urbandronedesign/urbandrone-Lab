'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AuthShell } from './AuthShell';

export function ResetForm({ token, valid, username }: { token: string; valid: boolean; username: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        router.replace('/admin');
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Reset failed');
    } catch {
      setError('Network error');
    }
    setPending(false);
  };

  if (!valid) {
    return (
      <AuthShell kicker="Reset password" backHref="/admin/login" backLabel="Back to sign in">
        <p className="text-sm">This reset link is invalid, already used, or expired.</p>
        <Link href="/admin/forgot" className="text-sm underline underline-offset-4">
          Request a new one
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell kicker="Reset password" backHref="/admin/login" backLabel="Back to sign in">
      <p className="text-sm text-muted-foreground">
        Choose a new password for <strong className="text-foreground">{username}</strong>.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="rs-password">New password</Label>
          <Input id="rs-password" type="password" autoComplete="new-password" autoFocus required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 10 characters" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rs-confirm">Confirm password</Label>
          <Input id="rs-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set new password
        </Button>
      </form>
    </AuthShell>
  );
}
