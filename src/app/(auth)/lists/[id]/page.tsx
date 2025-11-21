import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import { ListDetailView } from '@/components/lists/list-detail-view';
import { getCurrentUser } from '@/lib/auth-utils';
import { listService } from '@/lib/services/list-service';

interface PageProps {
  params: { id: string };
}

export default async function ListDetailPage({ params }: PageProps) {
  // Check authentication server-side
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin');
  }

  // Create a new QueryClient for this request
  const queryClient = new QueryClient();

  // Fetch list details server-side
  let list;
  try {
    list = await listService.getList(params.id, user.id);
  } catch {
    // If list not found or no access, show error in client
    list = null;
  }

  // Prefetch the query for React Query hydration
  if (list) {
    await queryClient.prefetchQuery({
      queryKey: ['lists', params.id],
      queryFn: () => Promise.resolve(list),
    });
  }

  return (
    <div className="container mx-auto mt-2 max-w-full overflow-x-hidden px-4 pb-8">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ListDetailView initialList={list} listId={params.id} />
      </HydrationBoundary>
    </div>
  );
}
