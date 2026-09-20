'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/AuthCard';
import { TextField } from '@/components/TextField';
import { ApiError, signup } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const { access_token } = await signup(username, email, password);
      setToken(access_token);
      router.push('/rooms');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-1 flex flex-col gap-1.5 text-center">
        <h1 className="font-display text-[26px] font-semibold text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-[#9A9AA5]">Design your character and start clashing.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <TextField
          id="signup-username"
          label="Username"
          type="text"
          placeholder="RoomRaider"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              id="signup-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <TextField
              id="signup-confirm"
              label="Confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-full bg-accent py-3.5 font-extrabold text-white disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-[11px] leading-relaxed text-[#6E6E78]">
        By creating an account, you agree to our Terms and Privacy Policy.
      </p>

      <p className="mt-0.5 text-center text-sm text-[#9A9AA5]">
        Already have an account?{' '}
        <Link href="/login" className="font-extrabold text-accent hover:text-[#58E497]">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
