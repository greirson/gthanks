import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Welcome - gthanks',
  description: 'Complete your profile setup',
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // Check if user has already completed onboarding
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      isOnboardingComplete: true,
      name: true,
      avatarUrl: true,
      image: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  // If user already completed onboarding, redirect to wishes
  if (user.isOnboardingComplete) {
    redirect('/wishes');
  }

  return (
    <OnboardingScreen
      defaultName={user.name || ''}
      defaultAvatar={user.avatarUrl || user.image || ''}
    />
  );
}
