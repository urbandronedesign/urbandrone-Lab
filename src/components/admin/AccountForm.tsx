'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from './AuthShell';

export function AccountForm({
  user,
  mailConfigured,
}: {
  user: { username: string; email: string };
  mailConfigured: boolean;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: current,
          username: username !== user.username ? username : undefined,
          email: email !== user.email ? email : undefined,
          newPassword: password || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Account updated');
        setCurrent('');
        setPassword('');
        setConfirm('');
        router.refresh();
      } else {
        setError(body.error ?? 'Update failed');
      }
    } catch {
      setError('Network error');
    }
    setPending(false);
  };

  return (
    <AuthShell kicker="Account" backHref="/admin" backLabel="Back to dashboard">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ac-username">Username</Label>
          <Input id="ac-username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ac-email">Email</Label>
          <Input id="ac-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="text-[10px] text-muted-foreground tracking-mono">
            Password reset links are sent here{mailConfigured ? '' : ' — no mail server configured yet (see README)'}.
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Change password (optional)</p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ac-new">New password</Label>
              <Input id="ac-new" type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="leave empty to keep" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-confirm">Confirm new password</Label>
              <Input id="ac-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <Label htmlFor="ac-current">Current password</Label>
          <Input id="ac-current" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <p className="text-[10px] text-muted-foreground tracking-mono">Required to confirm any change.</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </AuthShell>
  );
}
