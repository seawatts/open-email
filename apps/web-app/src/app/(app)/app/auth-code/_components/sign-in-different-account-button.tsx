'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { signOut } from '@seawatts/auth/client';
import { useSearchParams } from 'next/navigation';

export function SignInDifferentAccountButton() {
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const redirectUrl = `/app/auth-code${
    currentQueryString ? `?${currentQueryString}` : ''
  }`;

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = redirectUrl;
        },
      },
    });
  };

  return (
    <MetricButton
      className="w-fit"
      metric="auth_code_sign_in_different_account_clicked"
      onClick={handleSignOut}
      variant="link"
    >
      Sign in with different account
    </MetricButton>
  );
}
