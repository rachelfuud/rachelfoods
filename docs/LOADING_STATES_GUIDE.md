# Loading States System - Usage Guide

## Overview

This guide documents the standardized loading system for RachelFoods. All loading states should use these components for consistency.

## Components

### 1. LoadingSpinner

**Location**: `@/components/ui/LoadingSpinner`
**Use for**: Inline loading indicators, button loading states, section loading

```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Small inline spinner
<LoadingSpinner size="sm" />

// Medium spinner with text
<LoadingSpinner size="md" text="Loading products..." />

// Large centered spinner
<LoadingSpinner size="lg" text="Please wait..." centered />
```

**Sizes**:

- `sm`: 16px (buttons, inline elements)
- `md`: 32px (sections, cards)
- `lg`: 64px (full page, major sections)

### 2. PageLoader

**Location**: `@/components/ui/PageLoader`
**Use for**: Full-page loading states in client components

```tsx
import { PageLoader } from "@/components/ui/PageLoader";

// Simple full-page loader
if (loading) return <PageLoader />;

// With custom message
if (loading) return <PageLoader message="Loading your profile..." />;

// With Header/Footer layout
if (loading) return <PageLoader message="Loading orders..." withLayout />;

// With emoji icon
if (loading) return <PageLoader message="Loading..." icon="⏳" withLayout />;
```

**Props**:

- `message`: Loading text to display
- `icon`: Optional emoji/icon above spinner
- `withLayout`: Include Header and Footer components

### 3. SkeletonLoader

**Location**: `@/components/ui/SkeletonLoader`
**Use for**: Content placeholders, progressive loading

```tsx
import {
    Skeleton,
    ProductCardSkeleton,
    ProductGridSkeleton,
    TextSkeleton,
    StatCardSkeleton
} from '@/components/ui/SkeletonLoader';

// Base skeleton element
<Skeleton className="h-4 w-full" />

// Product card skeleton
<ProductCardSkeleton />

// Product grid (8 cards)
<ProductGridSkeleton count={8} />

// Text content
<TextSkeleton lines={3} />

// Admin stat card
<StatCardSkeleton />
```

## Migration Examples

### Before (Inconsistent)

```tsx
// Example 1: Custom spinner
<div className="text-center">
    <div className="animate-spin rounded-full h-16 w-16 border-primary"></div>
    <p>Loading...</p>
</div>

// Example 2: Emoji only
<div className="text-center py-20">
    <div className="text-4xl mb-4">⏳</div>
    <p>Loading orders...</p>
</div>

// Example 3: Text only
<div>Loading media...</div>
```

### After (Consistent)

```tsx
// Example 1: Use PageLoader for full page
<PageLoader message="Loading..." />

// Example 2: Use LoadingSpinner with emoji
<div className="text-center py-20">
    <div className="text-6xl mb-6">⏳</div>
    <LoadingSpinner size="lg" text="Loading orders..." centered />
</div>

// Example 3: Use LoadingSpinner for sections
<div className="p-4 text-center">
    <LoadingSpinner size="md" text="Loading media..." centered />
</div>
```

## Route-Level Loading (Next.js)

Use Next.js `loading.tsx` files for automatic loading states:

```tsx
// app/loading.tsx (root)
import { PageLoader } from "@/components/ui/PageLoader";
export default function Loading() {
  return <PageLoader />;
}

// app/products/[slug]/loading.tsx
import { PageLoader } from "@/components/ui/PageLoader";
export default function ProductsLoading() {
  return <PageLoader message="Loading product..." />;
}

// app/catalog/loading.tsx
import { ProductGridSkeleton } from "@/components/ui/SkeletonLoader";
export default function CatalogLoading() {
  return (
    <div className="min-h-screen">
      <Header />
      <ProductGridSkeleton count={8} />
      <Footer />
    </div>
  );
}
```

## Files Updated

### Pages

- ✅ `app/loading.tsx` - Root loading
- ✅ `app/catalog/loading.tsx` - Catalog skeleton
- ✅ `app/products/[slug]/loading.tsx` - Product loading
- ✅ `app/profile/page.tsx` - Profile loading
- ✅ `app/orders/page.tsx` - Orders loading
- ✅ `app/kitchen-refill/page.tsx` - Kitchen refill loading
- ✅ `app/admin/hero-slides/page.tsx` - Admin slides loading

### Components

- ✅ `components/HeroSlideshow.tsx` - Slideshow loading
- ✅ `components/ProductMediaManager.tsx` - Media loading
- ✅ `components/AdminRefillAnalytics.tsx` - Analytics loading
- ✅ `components/BuyAgainButton.tsx` - Button loading state
- ✅ `components/admin/StatCard.tsx` - Already had SkeletonCard (kept)

## Benefits

✅ **Consistency**: All loading states look and behave the same  
✅ **Maintainability**: Single source of truth for loading UI  
✅ **Accessibility**: Proper ARIA labels and semantic HTML  
✅ **Performance**: Reusable components reduce bundle size  
✅ **Developer Experience**: Easy to use, well-documented  
✅ **Theme Support**: Automatically adapts to light/dark mode

## Testing Checklist

When implementing loading states:

1. [ ] Verify loading state shows immediately
2. [ ] Check spinner animation is smooth
3. [ ] Confirm loading text is clear and descriptive
4. [ ] Test in both light and dark modes
5. [ ] Verify accessible with screen reader
6. [ ] Check mobile responsiveness
7. [ ] Ensure no layout shift when content loads

## Common Patterns

### Client Component Loading

```tsx
"use client";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then((data) => {
      setData(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader message="Loading..." withLayout />;

  return <div>{/* content */}</div>;
}
```

### Button Loading State

```tsx
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

<button disabled={loading}>
  {loading ? (
    <>
      <LoadingSpinner size="sm" className="mr-2 border-t-white border-b-white" />
      Processing...
    </>
  ) : (
    "Submit"
  )}
</button>;
```

### Section Loading

```tsx
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

{
  loading ? (
    <LoadingSpinner size="md" text="Loading analytics..." centered />
  ) : (
    <AnalyticsChart data={data} />
  );
}
```

## Future Enhancements

- [ ] Add progress indicators for multi-step processes
- [ ] Implement skeleton loaders for more complex layouts
- [ ] Add loading state animations/transitions
- [ ] Create loading state Storybook documentation
- [ ] Add unit tests for loading components

---

**Last Updated**: January 29, 2026  
**Maintained by**: Development Team
