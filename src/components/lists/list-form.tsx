'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';
import { useFormDirtyState } from '@/hooks/use-form-dirty-state';
import { listsApi } from '@/lib/api/lists';
import { vanityApi } from '@/lib/api/vanity';
import { ListWithDetails } from '@/lib/services/list-service';
import { PaginatedListsResponse, ListWithOwner } from '@/lib/validators/api-responses/lists';
import { ListCreateInput, ListUpdateInput } from '@/lib/validators/list';

interface ListFormProps {
  list?: ListWithDetails;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  onOpenSharingSettings?: () => void;
}

// Helper to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function ListForm({
  list,
  onSuccess,
  onCancel,
  onDirtyStateChange,
  onOpenSharingSettings,
}: ListFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isEditing = Boolean(list);

  // Check if user can use vanity URLs
  const canUseVanityUrls = session?.user?.canUseVanityUrls ?? false;
  const username = session?.user?.username;

  // Form state
  const [formData, setFormData] = useState<Partial<ListCreateInput>>({
    name: list?.name ?? '',
    description: list?.description ?? '',
    visibility: (list?.visibility as 'private' | 'public' | 'password') ?? 'private',
    password: '',
    hideFromProfile: list?.hideFromProfile ?? false,
  });

  const [slug, setSlug] = useState(list?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Initial values for dirty state tracking
  const initialFormData = useMemo(
    () => ({
      name: list?.name ?? '',
      description: list?.description ?? '',
      visibility: (list?.visibility as 'private' | 'public' | 'password') ?? 'private',
      password: '',
      hideFromProfile: list?.hideFromProfile ?? false,
    }),
    [list]
  );

  // Track dirty state
  const { isDirty } = useFormDirtyState(initialFormData, formData);

  // Track when component is mounted (client-side) to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyStateChange?.(isDirty);
  }, [isDirty, onDirtyStateChange]);

  // Slug mutation - separate from list create/update
  const setSlugMutation = useMutation({
    mutationFn: async ({ listId, slug }: { listId: string; slug: string }) => {
      return vanityApi.setListSlug(listId, slug);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to set custom URL',
        description: error.message || 'The list was created, but the custom URL could not be set.',
        variant: 'destructive',
      });
    },
  });

  // Create/Update mutations with optimistic updates
  const createMutation = useMutation({
    mutationFn: listsApi.createList,
    onMutate: async (newListData: ListCreateInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['lists'] });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(['lists']);

      // Generate a temporary ID for optimistic update
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const optimisticList = {
        id: tempId,
        name: newListData.name,
        description: newListData.description || null,
        visibility: newListData.visibility || 'private',
        password: newListData.password || null,
        ownerId: '', // Will be filled by server response
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: '',
          name: '', // Will be filled by next query
          email: '',
          avatarUrl: null,
        },
        _count: {
          wishes: 0,
        },
        isOwner: true,
        canEdit: true,
        hasAccess: true,
      };

      // Optimistically add the new list
      queryClient.setQueryData(['lists'], (oldData: PaginatedListsResponse | undefined) => {
        if (!oldData?.items) {
          return {
            items: [optimisticList],
            pagination: { hasMore: false, totalPages: 1, currentPage: 1, limit: 20 },
          };
        }
        return {
          ...oldData,
          items: [optimisticList, ...oldData.items],
        };
      });

      return { previousLists, tempId };
    },
    onSuccess: async (newList, _, context) => {
      // Replace temporary list with server response
      queryClient.setQueryData(['lists'], (oldData: PaginatedListsResponse | undefined) => {
        if (!oldData?.items) {
          return oldData;
        }

        const newListWithDetails = {
          ...newList,
          user: {
            id: newList.ownerId,
            name: '', // Will be filled by next query
            email: '',
            avatarUrl: null,
          },
          _count: {
            wishes: 0,
          },
          isOwner: true,
          canEdit: true,
          hasAccess: true,
        };

        return {
          ...oldData,
          items: oldData.items.map((list: ListWithOwner) =>
            list.id === context?.tempId ? newListWithDetails : list
          ),
        };
      });

      // Set slug if provided and user has access
      if (slug.trim() && canUseVanityUrls && username) {
        await setSlugMutation.mutateAsync({ listId: newList.id, slug });
      }

      toast({
        title: 'Success!',
        description: 'Your list has been created',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/lists');
      }
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousLists) {
        queryClient.setQueryData(['lists'], context.previousLists);
      }

      const message =
        (error as Error & { response?: { data?: { error?: string; field?: string } } }).response
          ?.data?.error || 'Failed to create list';
      const field = (error as Error & { response?: { data?: { error?: string; field?: string } } })
        .response?.data?.field;

      if (field) {
        setErrors({ [field]: message });
      } else {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: ListUpdateInput) => {
      if (!list?.id) {
        throw new Error('List ID is required');
      }
      return listsApi.updateList(list.id, input);
    },
    onSuccess: async (updatedData) => {
      // Set/update slug if changed and user has access
      if (list?.id && slug !== list.slug && canUseVanityUrls && username) {
        await setSlugMutation.mutateAsync({ listId: list.id, slug });
      }

      toast({
        title: 'Success!',
        description: 'Your list has been updated',
      });

      // Update specific list query (detail page) if it exists
      if (list?.id) {
        queryClient.setQueryData(['lists', list.id], (oldData: ListWithDetails | undefined) => {
          if (oldData) {
            return { ...oldData, ...updatedData };
          }
          return oldData;
        });
      }

      // Update the list within the paginated lists query (index page)
      queryClient.setQueryData(['lists'], (oldData: PaginatedListsResponse | undefined) => {
        if (oldData?.items) {
          const updatedLists = oldData.items.map((listItem: ListWithOwner) =>
            listItem.id === list?.id ? { ...listItem, ...updatedData } : listItem
          );
          return {
            ...oldData,
            items: updatedLists,
          };
        }
        return oldData;
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/lists');
      }
    },
    onError: (error: Error) => {
      const message =
        (error as Error & { response?: { data?: { error?: string; field?: string } } }).response
          ?.data?.error || 'Failed to update list';
      const field = (error as Error & { response?: { data?: { error?: string; field?: string } } })
        .response?.data?.field;

      if (field) {
        setErrors({ [field]: message });
      } else {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    },
  });

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? null : value,
    }));

    // Auto-slugify name if slug hasn't been manually touched
    if (name === 'name' && !slugTouched && canUseVanityUrls && username) {
      setSlug(slugify(value));
    }
  };

  // Handle slug change
  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    const cleanedSlug = slugify(value);
    setSlug(cleanedSlug);

    // Clear slug error
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Clean data - convert empty strings to null for optional fields
    const cleanData = {
      ...formData,
      description: formData.description?.trim() || null,
      password: formData.password?.trim() || null,
    };

    // Remove password if visibility is not 'password'
    if (cleanData.visibility !== 'password') {
      cleanData.password = null;
    }

    if (isEditing) {
      updateMutation.mutate(cleanData as ListUpdateInput);
    } else {
      createMutation.mutate(cleanData as ListCreateInput);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">List Name *</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="My Wishlist"
          value={formData.name ?? ''}
          onChange={handleChange}
          className={errors.name ? 'border-red-500' : ''}
          required
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe your wishlist..."
          value={formData.description ?? ''}
          onChange={handleChange}
          className={errors.description ? 'border-red-500' : ''}
          rows={3}
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>

      {/* Vanity URL / Slug field - only show if user has access and username set */}
      {canUseVanityUrls && username && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Custom URL (Optional)</Label>
            <div className="space-y-2">
              <Input
                id="slug"
                type="text"
                placeholder="my-awesome-list"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className={errors.slug ? 'border-red-500' : ''}
                maxLength={100}
              />
              {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
              {slug && (
                <div className="rounded-lg border bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Preview:{' '}
                    {isMounted
                      ? `${window.location.origin}/${username}/${slug}`
                      : `/${username}/${slug}`}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Create a custom URL for easy sharing. Auto-filled from list name.
              </p>
            </div>
          </div>

          {/* Hide from profile toggle - only show if list is public/password */}
          {(formData.visibility === 'public' || formData.visibility === 'password') && (
            <div className="flex items-center justify-between space-x-2 rounded-lg border bg-muted/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="hideFromProfile">Hide from public profile</Label>
                <p className="text-xs text-muted-foreground">
                  List will still be accessible via its URL but won&apos;t appear on /{username}
                </p>
              </div>
              <Switch
                id="hideFromProfile"
                checked={formData.hideFromProfile}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hideFromProfile: checked })
                }
              />
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
          <Label>Visibility</Label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {formData.visibility === 'private' && 'Private'}
                {formData.visibility === 'public' && 'Public'}
                {formData.visibility === 'password' && 'Password Protected'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.visibility === 'private' && 'Only you and co-managers can see this list'}
                {formData.visibility === 'public' && 'Anyone with the link can see this list'}
                {formData.visibility === 'password' &&
                  'Anyone with the link and password can see this list'}
              </p>
            </div>
            {onOpenSharingSettings && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenSharingSettings}>
                Change Sharing
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="mb-0 flex flex-col gap-3 pb-2 pt-4 sm:flex-row sm:gap-4">
        <ThemeButton type="submit" disabled={isLoading} className="w-full sm:flex-1">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update List' : 'Create List'}
        </ThemeButton>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
