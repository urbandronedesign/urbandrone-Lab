'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AuthShell } from './AuthShell';

export function ForgotForm() {
  const [login, setLogin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ mailConfigured: boolean } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ login }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setDone({ mailConfigured: !!body.mailConfigured });
      else setError(body.error ?? 'Request failed');
    } catch {
      setError('Network error');
    }
    setPending(false);
  };

  return (
    <AuthShell kicker="Reset password" backHref="/admin/login" backLabel="Back to sign in">
      {done ? (
        <div className="space-y-3 text-sm">
          {done.mailConfigured ? (
            <>
              <p>If an account matches, a reset link has been emailed to it.</p>
              <p className="text-muted-foreground">The link is valid for 30 minutes and can be used once. Check your spam folder if nothing arrives.</p>
            </>
          ) : (
            <>
              <p>No mail server is configured, so the reset link was <strong>printed in the terminal</strong> running the dev server.</p>
              <p className="text-muted-foreground">
                Look for a line starting with <code className="tracking-mono">[mail]</code>. To receive it by email instead, set the <code className="tracking-mono">SMTP_*</code> variables in <code className="tracking-mono">.env</code> (see README).
              </p>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <p className="text-sm text-muted-foreground">Enter the email (or username) of the admin account and we&apos;ll send a link to choose a new password.</p>
          <div className="space-y-2">
            <Label htmlFor="fg-login">Email or username</Label>
            <Input id="fg-login" autoComplete="username" autoFocus required value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
