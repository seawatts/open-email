import { Suspense } from 'react';
import { OnboardingSuccessContent } from './_components/onboarding-success-content';

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingSuccessContent />
    </Suspense>
  );
}
