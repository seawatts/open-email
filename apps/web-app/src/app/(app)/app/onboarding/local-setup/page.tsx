import { auth } from '@seawatts/auth/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LocalDevelopmentSetup } from './_components/local-development-setup';

export const dynamic = 'force-dynamic';

export default async function LocalSetupPage(props: {
  searchParams: Promise<{
    orgName?: string;
    webhookName?: string;
    redirectTo?: string;
    source?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const { orgName, webhookName, redirectTo, source } = searchParams;

  if (!orgName || !webhookName) {
    return redirect('/app/onboarding');
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <LocalDevelopmentSetup
        orgName={orgName}
        redirectTo={redirectTo}
        source={source}
        webhookName={webhookName}
      />
    </div>
  );
}
