'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Clock,
  Edit,
  ExternalLink,
  ListPlus,
  Menu,
  MoreVertical,
  ShoppingCart,
  Trash,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SelectionCheckbox } from '@/components/ui/selection-checkbox';
import { StarRating } from '@/components/ui/star-rating';
import { AddToListDialog } from '@/components/lists/add-to-list-dialog';
import { ReserveDialog } from '@/components/reservations/reserve-dialog';
import { formatPrice } from '@/lib/utils/currency';
import { getWishImageSrc, isWishImageProcessing, hasWishImage } from '@/lib/utils/wish-images';
import { safeOpenUrl } from '@/lib/utils/url-validation';
import { type Wish } from '@/lib/validators/api-responses/wishes';

interface UnifiedWishCardProps {
  // Layout variant (replaces 3 separate components)
  variant: 'comfortable' | 'compact' | 'list';

  // Shared props (ALL THREE USE IDENTICAL INTERFACE)
  wish: Wish & { isOwner?: boolean };
  onEdit?: (wish: Wish) => void;
  onDelete?: (wish: Wish) => void;
  onReserve?: (wish: Wish) => void;
  onAddToList?: (wish: Wish) => void;
  isReserved?: boolean;
  showAddToList?: boolean;
  priority?: boolean;

  // Selection props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (
    wishId: string,
    event?: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent
  ) => void;
}

// Variant configuration for different layouts
const variantConfig = {
  comfortable: {
    layout: 'vertical' as const,
    cardClassName: 'relative overflow-hidden transition-shadow duration-150 hover:shadow-lg',
    imageAspect: 'aspect-square sm:aspect-video',
    imageSizes:
      '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw',
    contentPadding: 'p-4',
    titleSize: 'text-lg',
    titleClamp: 'line-clamp-2',
    priceSize: 'text-xl sm:text-2xl',
    showNotes: true,
    notesClamp: 'line-clamp-3',
    reserveText: "I'm getting this",
    reserveTextFull: "I'm getting this",
    reserveTextShort: 'Reserve',
    processingText: 'Optimizing...',
    processingBadge: 'px-2.5 py-1.5',
    processingIcon: 'h-3.5 w-3.5',
    processingTextClass: 'text-xs font-medium',
    hasFooter: true,
    externalLinkInFooter: true,
    useSelectionCheckbox: true,
    menuIconSize: 'h-4 w-4',
    buttonSize: 'default' as const,
    badgeSize: 'default' as const,
    showMetadataLabels: true,
    includeDataAttributes: true,
  },
  compact: {
    layout: 'vertical' as const,
    cardClassName: 'relative overflow-hidden transition-shadow duration-150 hover:shadow-md',
    imageAspect: 'aspect-square',
    imageSizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw',
    contentPadding: 'p-3',
    titleSize: 'text-sm',
    titleClamp: 'line-clamp-2',
    priceSize: 'text-base',
    showNotes: false,
    notesClamp: 'line-clamp-1',
    reserveText: 'Reserve',
    reserveTextFull: 'Reserve',
    reserveTextShort: 'Reserve',
    processingText: '...',
    processingBadge: 'px-2 py-1',
    processingIcon: 'h-3 w-3',
    processingTextClass: 'text-xs',
    hasFooter: true,
    externalLinkInFooter: false,
    useSelectionCheckbox: true,
    menuIconSize: 'h-3 w-3',
    buttonSize: 'sm' as const,
    badgeSize: 'sm' as const,
    showMetadataLabels: false,
    includeDataAttributes: false,
  },
  list: {
    layout: 'horizontal' as const,
    cardClassName: 'overflow-hidden transition-colors hover:bg-muted/50',
    imageSize: 'h-16 w-16 sm:h-20 sm:w-20',
    imageSizes: '80px',
    contentPadding: 'p-4',
    titleSize: 'text-sm',
    titleClamp: 'line-clamp-2',
    priceSize: 'text-sm',
    showNotes: false,
    notesClamp: 'line-clamp-2 sm:line-clamp-1',
    reserveTextFull: "I'm getting this",
    reserveTextShort: 'Reserve',
    hasFooter: false,
    externalLinkInFooter: false,
    useSelectionCheckbox: false,
    menuIconSize: 'h-3.5 w-3.5',
    buttonSize: 'sm' as const,
    badgeSize: 'default' as const,
    showMetadataLabels: true,
    includeDataAttributes: true,
  },
};

export function UnifiedWishCard({
  variant,
  wish,
  onEdit,
  onDelete,
  onReserve: _onReserve,
  onAddToList: _onAddToList,
  isReserved = false,
  showAddToList = false,
  priority = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: UnifiedWishCardProps) {
  const config = variantConfig[variant];
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showReserveDialog, setShowReserveDialog] = useState(false);

  // Shared logic
  const imageSrc = getWishImageSrc(wish);
  const isImageProcessing = isWishImageProcessing(wish);
  const hasImage = hasWishImage(wish);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open link if clicking on buttons, dropdown menu, dialog content, or checkbox
    if (
      e.target instanceof Element &&
      (e.target.closest('button') ||
        e.target.closest('[role="checkbox"]') ||
        e.target.closest('[role="menuitem"]') ||
        e.target.closest('[data-radix-popper-content-wrapper]') ||
        e.target.closest('[role="dialog"]') ||
        e.target.closest('[data-radix-dialog-content]') ||
        e.target.closest('label'))
    ) {
      return;
    }

    // Open external link if available
    if (wish.url) {
      safeOpenUrl(wish.url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && wish.url) {
      e.preventDefault();
      safeOpenUrl(wish.url);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete?.(wish);
    setIsDeleteDialogOpen(false);
  };

  const handleReserve = () => {
    setShowReserveDialog(true);
  };

  // Render horizontal layout (list variant)
  if (config.layout === 'horizontal') {
    return (
      <>
        <Card
          className={`group border-0 shadow-none ${config.cardClassName} ${wish.url ? 'cursor-pointer' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
          onClick={handleCardClick}
          onKeyDown={handleKeyDown}
          tabIndex={wish.url ? 0 : undefined}
          data-testid={config.includeDataAttributes ? 'wish-item' : undefined}
          data-wish-item={config.includeDataAttributes ? true : undefined}
          data-wish-level={config.includeDataAttributes ? wish.wishLevel || 0 : undefined}
          data-cost={config.includeDataAttributes ? wish.price || 0 : undefined}
        >
          <CardContent className={config.contentPadding}>
            <div className="flex gap-4">
              {/* Image - Fixed size on left */}
              <div className="flex-shrink-0">
                {(hasImage || wish.imageStatus === 'FAILED') && (
                  <div className={`relative rounded bg-muted ${config.imageSize}`}>
                    {/* Skeleton loader */}
                    {!imageLoaded && hasImage && !imageError && (
                      <div className="absolute inset-0 animate-pulse rounded bg-muted" />
                    )}

                    {hasImage && !imageError && (
                      <Image
                        src={imageSrc || ''}
                        alt={wish.title}
                        fill
                        sizes={config.imageSizes}
                        className={`rounded object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        unoptimized={isImageProcessing}
                        priority={priority}
                      />
                    )}

                    {/* Processing overlay */}
                    {isImageProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center rounded bg-blue-600/20">
                        <Clock className="h-3 w-3 animate-spin text-blue-600" />
                      </div>
                    )}

                    {/* Failed state */}
                    {wish.imageStatus === 'FAILED' && (
                      <div className="flex h-full items-center justify-center rounded">
                        <span className="text-lg">📷</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content - Flexible */}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {/* Title and Actions Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2 pr-2">
                    <h3 className={`${config.titleClamp} font-medium ${config.titleSize}`}>
                      {wish.title}
                    </h3>
                    {/* Reserved Badge - Backend already filters based on ownership */}
                    {isReserved && (
                      <span
                        className="reserved-badge inline-flex flex-shrink-0 items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                        data-testid={`reserved-indicator-${wish.id}`}
                        data-reserved="true"
                      >
                        Reserved
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-3">
                  {/* Price */}
                  {wish.price && (
                    <p className={`font-semibold text-muted-foreground ${config.priceSize}`}>
                      {formatPrice(wish.price)}
                    </p>
                  )}

                  {/* Wish Level */}
                  {wish.wishLevel && (
                    <div className="flex items-center gap-1">
                      <StarRating
                        value={wish.wishLevel}
                        readonly
                        size="sm"
                        ariaLabel={`Wish level: ${wish.wishLevel} stars`}
                      />
                    </div>
                  )}

                  {/* Metadata badges */}
                  {wish.quantity && wish.quantity > 1 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      Qty: {wish.quantity}
                    </Badge>
                  )}
                  {wish.size && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      Size: {wish.size}
                    </Badge>
                  )}
                  {wish.color && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      Color: {wish.color}
                    </Badge>
                  )}
                  {wish.imageStatus === 'FAILED' && (
                    <Badge variant="destructive" className="h-5 text-xs">
                      Image failed
                    </Badge>
                  )}

                  {/* Reserve button for non-owners */}
                  {!wish.isOwner && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReserve();
                      }}
                      disabled={isReserved}
                      variant={isReserved ? 'secondary' : 'default'}
                      size={config.buttonSize}
                      className="ml-auto flex-shrink-0"
                      data-testid={`reserve-${wish.id}`}
                    >
                      <ShoppingCart className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">
                        {isReserved ? 'Reserved' : config.reserveTextFull}
                      </span>
                      <span className="sm:hidden">
                        {isReserved ? 'Reserved' : config.reserveTextShort}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          {/* Selection checkbox or menu button - bottom right */}
          {isSelectionMode ? (
            <label
              htmlFor={`select-wish-${wish.id}`}
              className="absolute bottom-2 right-2 z-10 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md border border-border/40 bg-background/95 shadow-sm transition-colors hover:bg-accent"
            >
              <input
                id={`select-wish-${wish.id}`}
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onToggleSelection?.(wish.id, e)}
                className="h-5 w-5 rounded border"
                aria-label={`Select ${wish.title}`}
              />
            </label>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-2 right-2 z-10 min-h-[44px] min-w-[44px] border border-border/40 bg-background/95 shadow-sm"
                  aria-label="More options"
                >
                  <Menu className={config.menuIconSize} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(wish)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {wish.url && (
                  <DropdownMenuItem asChild>
                    <a
                      href={wish.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Product
                    </a>
                  </DropdownMenuItem>
                )}
                {showAddToList && (
                  <DropdownMenuItem onClick={() => setShowAddToListDialog(true)}>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add to List
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </Card>

        {/* Add to List Dialog */}
        {showAddToList && (
          <AddToListDialog
            wishId={wish.id}
            open={showAddToListDialog}
            onOpenChange={setShowAddToListDialog}
          />
        )}

        {/* Reserve Dialog */}
        <ReserveDialog
          wish={{ id: wish.id, title: wish.title }}
          open={showReserveDialog}
          onOpenChange={setShowReserveDialog}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete wish?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{wish.title}&quot;? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Render vertical layout (comfortable/compact variants)
  return (
    <>
      <Card
        className={`${config.cardClassName} ${wish.url ? 'cursor-pointer' : ''} ${
          isSelected ? 'scale-[1.02] transform ring-2 ring-primary' : ''
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={wish.url ? 0 : undefined}
        data-testid={config.includeDataAttributes ? 'wish-item' : undefined}
        data-wish-item={config.includeDataAttributes ? true : undefined}
        data-wish-level={config.includeDataAttributes ? wish.wishLevel || 0 : undefined}
        data-cost={config.includeDataAttributes ? wish.price || 0 : undefined}
      >
        {/* Image */}
        {(hasImage || wish.imageStatus === 'FAILED') && (
          <div className={`relative bg-muted ${config.imageAspect}`}>
            {/* Skeleton loader */}
            {!imageLoaded && hasImage && !imageError && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}

            {hasImage && !imageError && (
              <Image
                src={imageSrc || ''}
                alt={wish.title}
                fill
                sizes={config.imageSizes}
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                unoptimized={isImageProcessing}
                priority={priority}
              />
            )}

            {/* Processing overlay */}
            {isImageProcessing && (
              <div
                className={`absolute inset-0 flex items-start justify-end ${variant === 'compact' ? 'p-2' : 'p-3'}`}
              >
                <div
                  className={`flex items-center gap-1.5 rounded-full bg-blue-600/90 text-white shadow-lg ${config.processingBadge}`}
                >
                  <Clock className={`animate-spin ${config.processingIcon}`} />
                  <span className={config.processingTextClass}>{config.processingText}</span>
                </div>
              </div>
            )}

            {/* Failed state */}
            {wish.imageStatus === 'FAILED' && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className={variant === 'compact' ? 'text-2xl' : 'mb-1 text-lg'}>📷</div>
                  {variant === 'comfortable' && <div className="text-sm">Image unavailable</div>}
                </div>
              </div>
            )}
          </div>
        )}

        <CardContent className={config.contentPadding}>
          {/* Title and Actions */}
          <div
            className={`${variant === 'compact' ? 'flex items-start justify-between gap-1' : 'mb-2 flex items-start justify-between'}`}
          >
            <div className="flex flex-1 items-center gap-2 pr-2">
              <h3
                className={`${config.titleClamp} font-semibold ${config.titleSize}`}
                title={variant === 'compact' ? wish.title : undefined}
              >
                {wish.title}
              </h3>
              {/* Reserved Badge - Backend already filters based on ownership */}
              {isReserved && (
                <span
                  className="reserved-badge inline-flex flex-shrink-0 items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  data-testid={`reserved-indicator-${wish.id}`}
                  data-reserved="true"
                >
                  Reserved
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          {wish.price && (
            <p
              className={`${variant === 'compact' ? 'mt-1' : 'mb-2'} font-bold text-green-600 ${config.priceSize}`}
            >
              {formatPrice(wish.price)}
            </p>
          )}

          {/* Wish Level */}
          {wish.wishLevel && (
            <div className={variant === 'compact' ? 'mt-1' : 'mb-2 flex items-center gap-2'}>
              <StarRating
                value={wish.wishLevel}
                readonly
                size="sm"
                ariaLabel={`Wish level: ${wish.wishLevel} stars`}
              />
            </div>
          )}

          {/* Metadata badges */}
          <div
            className={`flex flex-wrap gap-${variant === 'compact' ? '1' : '2'} ${variant === 'compact' ? 'mt-2' : ''}`}
          >
            {wish.quantity && wish.quantity > 1 && (
              <Badge
                variant="secondary"
                className={variant === 'compact' ? 'px-1 py-0 text-xs' : ''}
              >
                {config.showMetadataLabels ? `Qty: ${wish.quantity}` : wish.quantity}
              </Badge>
            )}
            {wish.size && (
              <Badge
                variant="secondary"
                className={variant === 'compact' ? 'px-1 py-0 text-xs' : ''}
              >
                {config.showMetadataLabels ? `Size: ${wish.size}` : wish.size}
              </Badge>
            )}
            {wish.color && (
              <Badge
                variant="secondary"
                className={variant === 'compact' ? 'px-1 py-0 text-xs' : ''}
              >
                {config.showMetadataLabels ? `Color: ${wish.color}` : wish.color}
              </Badge>
            )}
            {variant === 'comfortable' && wish.imageStatus === 'FAILED' && (
              <Badge variant="destructive">Image failed to load</Badge>
            )}
          </div>
        </CardContent>

        {config.hasFooter && (
          <CardFooter
            className={`flex ${variant === 'compact' ? 'gap-1 p-3 pt-0' : 'flex-col gap-3 p-4 pt-0 sm:flex-row sm:gap-2'}`}
          >
            {/* Reserve button (for non-owners) */}
            {!wish.isOwner && (
              <Button
                onClick={handleReserve}
                disabled={isReserved}
                variant={isReserved ? 'secondary' : 'default'}
                size={config.buttonSize}
                className={variant === 'compact' ? 'flex-1 text-xs' : 'w-full sm:flex-1'}
                data-testid={`reserve-${wish.id}`}
              >
                <ShoppingCart className={variant === 'compact' ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} />
                {isReserved ? 'Reserved' : config.reserveText}
              </Button>
            )}

            {/* View product link - only in comfortable variant footer */}
            {config.externalLinkInFooter && wish.url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={wish.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                  aria-label={`View ${wish.title} on external site`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </CardFooter>
        )}

        {/* Selection checkbox or menu button - bottom right */}
        {isSelectionMode ? (
          <label
            htmlFor={`select-wish-${wish.id}`}
            className="absolute bottom-2 right-2 z-10 flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md border border-border/40 bg-background/95 shadow-sm transition-colors hover:bg-accent"
          >
            <input
              id={`select-wish-${wish.id}`}
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onToggleSelection?.(wish.id, e)}
              className="h-5 w-5 rounded border"
              aria-label={`Select ${wish.title}`}
            />
          </label>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 z-10 min-h-[44px] min-w-[44px] border border-border/40 bg-background/95 shadow-sm"
                aria-label="Wish options"
              >
                <Menu className={config.menuIconSize} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Compact variant has different menu order */}
              {variant === 'compact' ? (
                <>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(wish)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {wish.url && (
                    <DropdownMenuItem asChild>
                      <a
                        href={wish.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Product
                      </a>
                    </DropdownMenuItem>
                  )}
                  {showAddToList && (
                    <DropdownMenuItem onClick={() => setShowAddToListDialog(true)}>
                      <ListPlus className="mr-2 h-4 w-4" />
                      Add to List
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <>
                  {showAddToList && (
                    <DropdownMenuItem onClick={() => setShowAddToListDialog(true)}>
                      <ListPlus className="mr-2 h-4 w-4" />
                      Add to List
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(wish)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </Card>

      {/* Add to List Dialog */}
      {showAddToList && (
        <AddToListDialog
          wishId={wish.id}
          open={showAddToListDialog}
          onOpenChange={setShowAddToListDialog}
        />
      )}

      {/* Reserve Dialog */}
      <ReserveDialog
        wish={{ id: wish.id, title: wish.title }}
        open={showReserveDialog}
        onOpenChange={setShowReserveDialog}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete wish?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{wish.title}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
