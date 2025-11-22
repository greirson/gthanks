// File: src/components/my-reservations/BrowseListsButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function BrowseListsButton() {
  const router = useRouter();

  return (
    <Button onClick={() => router.push('/lists')} className="mt-4">
      Browse Lists
    </Button>
  );
}
