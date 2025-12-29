'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useClerk } from '@seawatts/auth/clerk-compat';
import { useSearchParams } from 'next/navigation';

export function SignInDifferentAccountButton() {
  const { signOut } = useClerk();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const redirectUrl = `/app/auth-code${
    currentQueryString ? `?${currentQueryString}` : ''
  }`;

  return (
    <MetricButton
      className="w-fit"
      metric="auth_code_sign_in_different_account_clicked"
      onClick={async () => {
        await signOut();
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      }}
      variant="link"
    >
      Sign in with different account
    </MetricButton>
  );
}
