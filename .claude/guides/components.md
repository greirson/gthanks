# Component Architecture & UI Patterns

## Component Organization

```
src/components/
├── ui/                     # Radix UI primitive wrappers
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── toast.tsx
│   └── ...
├── wishes/                 # Wish-specific components
│   ├── WishCard.tsx
│   ├── WishForm.tsx
│   ├── WishList.tsx
│   └── WishPriorityBadge.tsx
├── lists/                  # List-specific components
│   ├── ListCard.tsx
│   ├── ListForm.tsx
│   ├── ListShareDialog.tsx
│   └── ListVisibilityBadge.tsx
├── groups/                 # Group-specific components
│   ├── GroupCard.tsx
│   ├── GroupForm.tsx
│   ├── GroupMemberList.tsx
│   └── GroupInviteDialog.tsx
├── admin/                  # Admin-specific components
│   ├── UserTable.tsx
│   └── AdminNav.tsx
└── common/                 # Shared components
    ├── Header.tsx
    ├── Nav.tsx
    ├── Footer.tsx
    ├── LoadingSpinner.tsx
    └── ErrorBoundary.tsx
```

## UI Component Library (Radix UI)

### Why Radix UI

- **Unstyled primitives** - Full control over styling with Tailwind
- **Accessibility** - WAI-ARIA compliant out of the box
- **Composable** - Build complex components from simple primitives
- **Keyboard navigation** - All components support keyboard shortcuts
- **Screen reader support** - Proper ARIA labels and roles

### Radix UI Components Used

| Component     | Purpose             | Key Features                      |
| ------------- | ------------------- | --------------------------------- |
| Dialog        | Modals and overlays | Focus trap, ESC to close          |
| Dropdown Menu | Action menus        | Keyboard navigation, nested menus |
| Toast         | Notifications       | Auto-dismiss, swipe to dismiss    |
| Select        | Dropdowns           | Searchable, keyboard navigation   |
| Checkbox      | Multiple choice     | Indeterminate state               |
| Radio Group   | Single choice       | Keyboard navigation               |
| Switch        | Toggle settings     | Accessible label association      |
| Slider        | Range inputs        | Multi-thumb support               |
| Progress      | Loading indicators  | Determinate/indeterminate         |
| Tabs          | Content switching   | Keyboard navigation               |
| Avatar        | User images         | Fallback initials                 |

### Example: Button Component

```typescript
// src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

## Tailwind CSS Patterns

### Utility-First Styling

Use Tailwind utilities for most styling:

```tsx
<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
  <h3 className="text-lg font-semibold text-gray-900">Wish Title</h3>
  <span className="text-sm text-gray-500">$299.99</span>
</div>
```

### Component Composition

Extract repeated patterns into components, not custom CSS:

```tsx
// ✅ Good - Reusable component
<Card>
  <CardHeader>
    <CardTitle>Wish Title</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>

// ❌ Avoid - Custom CSS classes
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Wish Title</h3>
  </div>
</div>
```

### Responsive Design

Mobile-first responsive utilities:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {wishes.map((wish) => (
    <WishCard key={wish.id} wish={wish} />
  ))}
</div>
```

### Dark Mode Support

Use next-themes for dark mode:

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <h1 className="text-2xl font-bold">My Wishes</h1>
</div>
```

## Form Handling

### React Hook Form + Zod

Use react-hook-form with Zod schemas for type-safe forms:

```typescript
// lib/schemas/wish.ts
import { z } from 'zod';

export const wishSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  url: z.string().url().optional().or(z.literal('')),
  price: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(1000).optional(),
  wishLevel: z.number().int().min(1).max(3).default(1),
  quantity: z.number().int().positive().default(1),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
});

export type WishFormData = z.infer<typeof wishSchema>;
```

```typescript
// components/wishes/WishForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { wishSchema, type WishFormData } from '@/lib/schemas/wish';

export function WishForm({ wish, onSubmit }: WishFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WishFormData>({
    resolver: zodResolver(wishSchema),
    defaultValues: wish,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">What do you want?</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="New bike, red color"
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="url">Link (optional)</Label>
          <Input
            id="url"
            type="url"
            {...register('url')}
            placeholder="https://amazon.com/..."
          />
          {errors.url && (
            <p className="text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price (optional)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              placeholder="299.99"
            />
          </div>

          <div>
            <Label htmlFor="wishLevel">Priority</Label>
            <Select {...register('wishLevel', { valueAsNumber: true })}>
              <option value="1">⭐ Nice to have</option>
              <option value="2">⭐⭐ Really want</option>
              <option value="3">⭐⭐⭐ Must have!</option>
            </Select>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Wish'}
        </Button>
      </div>
    </form>
  );
}
```

## Accessibility Guidelines

### Semantic HTML

Always use semantic HTML elements:

```tsx
// ✅ Good
<nav>
  <ul>
    <li><a href="/wishes">My Wishes</a></li>
    <li><a href="/lists">My Lists</a></li>
  </ul>
</nav>

// ❌ Bad
<div className="nav">
  <div className="nav-item">My Wishes</div>
  <div className="nav-item">My Lists</div>
</div>
```

### ARIA Labels

Provide ARIA labels for screen readers:

```tsx
<button aria-label="Delete wish" onClick={() => deleteWish(wish.id)}>
  <TrashIcon />
</button>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

### Focus Management

Manage focus for modals and dialogs:

```tsx
import { useEffect, useRef } from 'react';

export function Dialog({ isOpen, onClose, children }: DialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onClose}>
      <RadixDialog.Content>
        {children}
        <RadixDialog.Close ref={closeButtonRef}>Close</RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Root>
  );
}
```

## Loading States

### Skeleton Loaders

Use skeleton loaders for initial page loads:

```tsx
export function WishListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-48 rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
          <div className="mt-1 h-4 w-1/2 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
```

### Spinner for Actions

Use spinners for button/action loading:

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Spinner className="mr-2 h-4 w-4" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</Button>
```

## Error States

### Inline Error Messages

Show validation errors inline:

```tsx
<div>
  <Input
    {...register('email')}
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <p id="email-error" className="mt-1 text-sm text-red-600">
      {errors.email.message}
    </p>
  )}
</div>
```

### Error Boundaries

Catch component errors with error boundaries:

```tsx
// components/common/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to Sentry in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-gray-600">Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Component Best Practices

### 1. Single Responsibility

Each component should do one thing well:

```tsx
// ✅ Good - Separate concerns
<WishCard wish={wish} />
<WishCardMenu wish={wish} onEdit={...} onDelete={...} />

// ❌ Bad - Too many responsibilities
<WishCard wish={wish} showMenu showActions enableDrag enableResize />
```

### 2. Prop Drilling Prevention

Use composition over prop drilling:

```tsx
// ✅ Good - Composition
<WishList>
  <WishCard wish={wish}>
    <WishCardImage src={wish.imageUrl} />
    <WishCardTitle>{wish.title}</WishCardTitle>
    <WishCardPrice>{wish.price}</WishCardPrice>
  </WishCard>
</WishList>

// ❌ Bad - Prop drilling
<WishList showImage showTitle showPrice imageSize="lg" titleSize="xl" />
```

### 3. Server vs Client Components

Use Server Components by default, Client Components only when needed:

```tsx
// ✅ Server Component (default)
export default async function WishesPage() {
  const wishes = await db.wish.findMany();
  return <WishList wishes={wishes} />;
}

// ✅ Client Component (interactive)
('use client');

export function WishForm({ wish }: WishFormProps) {
  const [title, setTitle] = useState(wish?.title ?? '');
  // ...
}
```

### 4. TypeScript Props

Always type component props:

```tsx
interface WishCardProps {
  wish: {
    id: string;
    title: string;
    price?: number;
    imageUrl?: string;
    wishLevel: 1 | 2 | 3;
  };
  onReserve?: (wishId: string) => void;
  showReserveButton?: boolean;
}

export function WishCard({ wish, onReserve, showReserveButton = true }: WishCardProps) {
  // ...
}
```

### 5. Data Attributes for Testing

Use data-testid for E2E tests:

```tsx
<button data-testid={`delete-wish-${wish.id}`} onClick={handleDelete}>
  Delete
</button>
```
