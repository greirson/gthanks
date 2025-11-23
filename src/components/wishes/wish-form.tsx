'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useEffect, useMemo, useRef, useState } from 'react';
import { simplifyProductUrl } from '@/lib/utils/url-simplification';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageInput } from '@/components/ui/image-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';
import { useFormDirtyState } from '@/hooks/use-form-dirty-state';
import { listsApi } from '@/lib/api/lists';
import { wishesApi } from '@/lib/api/wishes';
import { WishCreateInput, WishUpdateInput } from '@/lib/validators/wish';
import { StarRating } from '@/components/ui/star-rating';

interface WishFormProps {
  wish?: Wish;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultListId?: string;
  showListSelection?: boolean;
  onDirtyStateChange?: (isDirty: boolean) => void;
}

export function WishForm({
  wish,
  onSuccess,
  onCancel,
  defaultListId,
  showListSelection = false,
  onDirtyStateChange,
}: WishFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [priceFetchFailed, setPriceFetchFailed] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>(
    defaultListId ? [defaultListId] : []
  );
  const initialListIdsRef = useRef<string[]>([]);
  const isEditing = Boolean(wish);

  // Form state
  const [formData, setFormData] = useState<Partial<WishCreateInput>>({
    title: wish?.title || '',
    url: wish?.url || null,
    price: wish?.price || undefined,
    wishLevel: wish?.wishLevel || 1,
    quantity: wish?.quantity || 1,
    color: wish?.color || null,
    size: wish?.size || null,
    imageUrl: wish?.imageUrl || null,
  });

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initial form values for dirty state tracking
  const initialFormData = useMemo(
    () => ({
      title: wish?.title || '',
      url: wish?.url || null,
      price: wish?.price || undefined,
      wishLevel: wish?.wishLevel || 1,
      quantity: wish?.quantity || 1,
      color: wish?.color || null,
      size: wish?.size || null,
      imageUrl: wish?.imageUrl || null,
    }),
    [wish]
  );

  // Track form dirty state
  const { isDirty: isFormDataDirty } = useFormDirtyState(initialFormData, formData);

  // Check if lists have changed from their initial state
  const areListsDirty = useMemo(() => {
    const initial = [...initialListIdsRef.current].sort();
    const current = [...selectedListIds].sort();
    return JSON.stringify(initial) !== JSON.stringify(current);
  }, [selectedListIds]);

  const isDirty = isFormDataDirty || areListsDirty;

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyStateChange?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]); // onDirtyStateChange is stable (setState function) - no need in deps

  // Load user's lists for list selection
  const { data: listsData, isLoading: isLoadingLists } = useQuery({
    queryKey: ['lists'],
    queryFn: () => listsApi.getLists(),
    enabled: showListSelection,
  });

  // Load wish's current lists (edit mode only)
  const wishListsQuery = useQuery({
    queryKey: ['wish-lists', wish?.id],
    queryFn: async () => {
      if (!wish?.id) {
        return [];
      }
      return wishesApi.getWishLists(wish.id);
    },
    enabled: !!wish?.id && showListSelection,
  });

  // Initialize selected lists from wish's current lists (edit mode)
  useEffect(() => {
    if (wishListsQuery.isSuccess && wishListsQuery.data) {
      const ids = wishListsQuery.data.map((list) => list.id);
      setSelectedListIds(ids);
      initialListIdsRef.current = ids;
    }
  }, [wishListsQuery.isSuccess, wishListsQuery.data]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: WishCreateInput) => {
      const wish = await wishesApi.createWish(data);

      // If lists are selected, add the wish to all selected lists
      if (selectedListIds.length > 0 && wish.id) {
        await Promise.all(
          selectedListIds.map((listId) => listsApi.addWishToList(listId, { wishId: wish.id }))
        );
      }

      return wish;
    },
    onSuccess: () => {
      toast({
        title: 'Wish created',
        description: 'Your wish has been added successfully.',
      });
      void queryClient.invalidateQueries({ queryKey: ['wishes'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create wish',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: WishUpdateInput) => {
      if (!wish?.id) {
        throw new Error('Wish ID is required');
      }
      const updatedWish = await wishesApi.updateWish(wish.id, data);

      // Update list memberships transactionally
      if (showListSelection) {
        await wishesApi.updateWishMemberships(wish.id, {
          listIds: selectedListIds,
        });
      }

      return updatedWish;
    },
    onSuccess: () => {
      toast({
        title: 'Wish updated',
        description: 'Your wish has been updated successfully.',
      });
      // Invalidate all relevant queries
      void queryClient.invalidateQueries({ queryKey: ['wishes'] });
      if (wish?.id) {
        void queryClient.invalidateQueries({ queryKey: ['wish', wish.id] });
        void queryClient.invalidateQueries({ queryKey: ['wish-lists', wish.id] });
      }
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update wish',
        variant: 'destructive',
      });
    },
  });

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    // Clear price fetch failed flag when user edits price
    if (name === 'price') {
      setPriceFetchFailed(false);
    }

    // Simplify URL automatically when it's pasted or changed
    let processedValue: string | number | null | undefined = value === '' ? null : value;
    if (name === 'url' && value && value.length > 0) {
      // Only simplify if it looks like a URL (contains http:// or https://)
      if (value.startsWith('http://') || value.startsWith('https://')) {
        processedValue = simplifyProductUrl(value);
      }
    } else if (type === 'number') {
      processedValue = value ? Number(value) : undefined;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image URL change
  const handleImageUrlChange = (value: string | null) => {
    setFormData((prev) => ({ ...prev, imageUrl: value }));
  };

  // Handle wish level change
  const handleWishLevelChange = (value: number | null) => {
    setFormData((prev) => ({ ...prev, wishLevel: value ?? 1 }));
  };

  // Handle list selection toggle
  const handleListToggle = (listId: string, checked: boolean) => {
    setSelectedListIds((prev) => {
      if (checked) {
        return [...prev, listId];
      } else {
        return prev.filter((id) => id !== listId);
      }
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    // No need to validate URL length - URLs are automatically simplified to ~36 chars
    // Backend validation will catch any edge cases

    if (formData.price && formData.price < 0) {
      newErrors.price = 'Price must be positive';
    }

    if (formData.quantity && (formData.quantity < 1 || formData.quantity > 99)) {
      newErrors.quantity = 'Quantity must be between 1 and 99';
    }

    if (formData.wishLevel && (formData.wishLevel < 1 || formData.wishLevel > 3)) {
      newErrors.wishLevel = 'Wish level must be between 1 and 3';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Extract metadata from URL
  const handleExtractMetadata = async () => {
    if (!formData.url) {
      return;
    }

    setIsExtractingMetadata(true);

    try {
      const result = await wishesApi.extractMetadataWithDetails(formData.url);

      if (result.success) {
        const metadata = result.data;

        // Track if price extraction failed
        const priceWasFetched = metadata.price !== null && metadata.price !== undefined;
        setPriceFetchFailed(!priceWasFetched);

        // Only update fields that are empty
        setFormData((prev) => {
          const updated = {
            ...prev,
            title: prev.title || metadata.title || '',
            price: prev.price || metadata.price || undefined,
            imageUrl: prev.imageUrl || metadata.imageUrl || null,
          };
          return updated;
        });
      } else {
        // Handle extraction errors with specific messages
        const { type, partial } = result.error;

        // Fill in any partial data we got
        if (partial?.suggestedTitle) {
          setFormData((prev) => ({
            ...prev,
            title: prev.title || partial.suggestedTitle || '',
          }));
        }

        // Show user-friendly error message
        if (type === 'captcha_detected') {
          toast({
            title: 'Ah crap, fancy anti-bot tools detected',
            description: `${partial?.siteName || 'This site'} has security that blocks us. You'll need to enter the price and details yourself.`,
            variant: 'destructive',
            duration: 5000,
          });
        } else if (type === 'timeout') {
          toast({
            title: 'Site took too long to respond',
            description:
              "The website was really slow. You'll need to add the price and details manually.",
            variant: 'destructive',
            duration: 5000,
          });
        } else if (type === 'parse_error') {
          toast({
            title: "Couldn't read the page details",
            description: `We saved your link, but couldn't grab the price or description from ${partial?.siteName || 'this site'}. You can add those yourself.`,
            variant: 'destructive',
            duration: 5000,
          });
        } else if (type === 'network_error') {
          toast({
            title: "Couldn't reach that website",
            description:
              "The site might be down or blocking us. You'll need to add the price and details manually.",
            variant: 'destructive',
            duration: 5000,
          });
        } else if (type === 'invalid_url') {
          toast({
            title: 'Hmm, that URL looks weird',
            description: "We'll save it anyway - just add the price and details yourself.",
            variant: 'destructive',
            duration: 5000,
          });
        } else {
          toast({
            title: "Couldn't grab the details automatically",
            description:
              'Some sites block us from reading their pages. No worries - just enter the price and details yourself!',
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch {
      toast({
        title: 'Could not extract product details',
        description: 'Please enter the details manually - your URL is still saved!',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // At this point validateForm ensures title exists and is not empty
    const dataToSubmit = {
      ...formData,
      title: formData.title ?? '',
      wishLevel: formData.wishLevel || 1,
    } as WishCreateInput | WishUpdateInput;

    // Clean up empty strings and convert to null
    Object.keys(dataToSubmit).forEach((key) => {
      const typedKey = key as keyof typeof dataToSubmit;
      const value = dataToSubmit[typedKey];
      if (value === '') {
        (dataToSubmit as Record<string, unknown>)[typedKey] = null;
      }
    });

    if (isEditing) {
      await updateMutation.mutateAsync(dataToSubmit as WishUpdateInput);
    } else {
      await createMutation.mutateAsync(dataToSubmit as WishCreateInput);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-6"
    >
      {/* URL Field with Fetch Button */}
      <div className="space-y-2">
        <Label htmlFor="url">Product URL</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            name="url"
            type="url"
            inputMode="url"
            placeholder="https://example.com/product"
            value={formData.url ?? ''}
            onChange={handleChange}
            disabled={createMutation.isPending || updateMutation.isPending}
            aria-invalid={errors.url ? 'true' : 'false'}
            aria-describedby={errors.url ? 'url-error' : undefined}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExtractMetadata()}
            disabled={
              !formData.url ||
              isExtractingMetadata ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {isExtractingMetadata ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
          </Button>
        </div>
        {errors.url && (
          <p id="url-error" className="text-error-aa text-sm" aria-live="polite">
            {errors.url}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Paste a product URL and click &quot;Fetch&quot; to auto-fill details
        </p>
      </div>

      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          type="text"
          inputMode="text"
          placeholder="What do you want?"
          value={formData.title ?? ''}
          onChange={handleChange}
          disabled={createMutation.isPending || updateMutation.isPending}
          required
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-error-aa text-sm" aria-live="polite">
            {errors.title}
          </p>
        )}
      </div>

      {/* Price and Wish Level - Responsive Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Price Field */}
        <div className="space-y-2">
          <Label htmlFor="price">
            Price
            {priceFetchFailed && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                couldn&apos;t fetch price from site :(
              </span>
            )}
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={formData.price ?? ''}
            onChange={handleChange}
            disabled={createMutation.isPending || updateMutation.isPending}
            min="0"
            step="0.01"
            aria-invalid={errors.price ? 'true' : 'false'}
            aria-describedby={errors.price ? 'price-error' : undefined}
          />
          {errors.price && (
            <p id="price-error" className="text-error-aa text-sm" aria-live="polite">
              {errors.price}
            </p>
          )}
        </div>

        {/* Wish Level */}
        <div className="space-y-2">
          <Label htmlFor="wishLevel">Wish Level</Label>
          <div className="flex h-11 items-center">
            <StarRating
              value={formData.wishLevel || 1}
              onChange={handleWishLevelChange}
              size="3xl"
              ariaLabel="Wish level"
            />
          </div>
        </div>
      </div>

      {/* More Options Section - Always Visible */}
      <div className="space-y-4">
        {/* Image */}
        <div>
          <ImageInput
            label="Image"
            value={formData.imageUrl ?? ''}
            onChange={handleImageUrlChange}
            disabled={isPending}
          />
        </div>

        {/* Quantity, Color, Size Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={formData.quantity ?? ''}
              onChange={handleChange}
              disabled={createMutation.isPending || updateMutation.isPending}
              min="1"
              max="99"
              aria-invalid={errors.quantity ? 'true' : 'false'}
              aria-describedby={errors.quantity ? 'quantity-error' : undefined}
            />
            {errors.quantity && (
              <p id="quantity-error" className="text-error-aa text-sm" aria-live="polite">
                {errors.quantity}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              name="color"
              type="text"
              inputMode="text"
              placeholder="Red, Blue, etc."
              value={formData.color ?? ''}
              onChange={handleChange}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Input
              id="size"
              name="size"
              type="text"
              inputMode="text"
              placeholder="S, M, L, XL, etc."
              value={formData.size ?? ''}
              onChange={handleChange}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* List Selection - Multi-select with checkboxes */}
      {showListSelection && (
        <div className="space-y-2">
          <Label>Add to Lists</Label>
          {(isLoadingLists || wishListsQuery.isLoading) && (
            <p className="text-sm text-muted-foreground">Loading lists...</p>
          )}
          {listsData &&
            'items' in listsData &&
            Array.isArray(listsData.items) &&
            listsData.items.length > 0 &&
            (!wish?.id || !wishListsQuery.isLoading) && (
              <fieldset
                disabled={createMutation.isPending || updateMutation.isPending}
                className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3"
              >
                {listsData.items.map((list) => (
                  <div key={list.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`list-${list.id}`}
                      checked={selectedListIds.includes(list.id)}
                      onCheckedChange={(checked) => handleListToggle(list.id, checked as boolean)}
                    />
                    <Label
                      htmlFor={`list-${list.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {list.name} ({list._count.listWishes} wishes)
                    </Label>
                  </div>
                ))}
              </fieldset>
            )}
          {listsData &&
            'items' in listsData &&
            Array.isArray(listsData.items) &&
            listsData.items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No lists available. Create a list first.
              </p>
            )}
          {selectedListIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Selected {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <ThemeButton type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : isEditing ? (
            'Update Wish'
          ) : (
            'Create Wish'
          )}
        </ThemeButton>
      </div>
    </form>
  );
}
