'use client';

import { signIn } from '@seawatts/auth/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';
import { Button } from '@seawatts/ui/components/button';
import { Input } from '@seawatts/ui/input';
import { Label } from '@seawatts/ui/label';
import { Separator } from '@seawatts/ui/separator';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn.social({
        callbackURL: callbackUrl,
        provider: 'google',
      });
    } catch (err) {
      setError('Failed to sign in with Google');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn.email({
        callbackURL: callbackUrl,
        email,
        password,
      });
      if (result.error) {
        setError(result.error.message || 'Invalid credentials');
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('Failed to sign in');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          variant="outline"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <title>Google</title>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              disabled={isLoading}
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete="current-password"
              disabled={isLoading}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button className="w-full" disabled={isLoading} type="submit">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center">
          Don't have an account?{' '}
          <Link
            className="text-primary underline-offset-4 hover:underline"
            href={`/sign-up${callbackUrl !== '/app' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
