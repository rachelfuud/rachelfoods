# React Query + Zustand Architecture

## Overview

RachelFoods now uses a modern, enterprise-standard architecture based on **React Query** (TanStack Query) and **Zustand** for state management. This replaces the previous manual state management approach with automatic caching, request deduplication, and consistent error handling.

## Architecture Components

### 1. **Axios API Client** (`lib/api/client.ts`)

Centralized HTTP client with:
- Automatic auth token injection from localStorage
- Global error handling with user-friendly messages
- Request/response logging in development
- Automatic redirect to login on 401 errors
- 30-second timeout
- Base URL from `NEXT_PUBLIC_API_URL` environment variable

**Example:**
```typescript
import apiClient from '@/lib/api/client';

// Automatically includes auth token and handles errors
const response = await apiClient.get('/admin/products');
```

### 2. **API Endpoint Files** (`lib/api/endpoints/`)

Organized by feature domain:
- `auth.ts` - Authentication endpoints (login, register, profile)
- `products.ts` - Product CRUD operations (public + admin)
- `orders.ts` - Order management (user + admin)
- `cms.ts` - Content management system
- `admin.ts` - System metrics and business intelligence

**Benefits:**
- Type-safe with TypeScript interfaces
- Clear separation of concerns
- Easy to find and update endpoints
- Consistent error handling

**Example:**
```typescript
import { productsEndpoints } from '@/lib/api/endpoints/products';

const products = await productsEndpoints.getAdminProducts({ page: 1, limit: 20 });
```

### 3. **React Query Hooks** (`lib/hooks/`)

Custom hooks wrapping React Query:
- `useProducts.ts` - Product queries and mutations
- `useOrders.ts` - Order queries and mutations
- `useCMS.ts` - CMS content queries and mutations
- `useAdmin.ts` - Admin metrics and system health
- `useAuth.ts` - Auth operations (login, register, logout)

**Benefits:**
- **Automatic Caching**: Data fetched once is reused across components
- **Smart Refetching**: Stale data is refetched automatically
- **Loading States**: Built-in `isLoading`, `error`, `data` states
- **Mutations**: `mutateAsync()` with automatic cache invalidation

**Example:**
```typescript
import { useAdminProducts, useDeleteProduct } from '@/lib/hooks/useProducts';

function ProductsPage() {
    const { data, isLoading, error } = useAdminProducts({ page: 1, limit: 20 });
    const deleteMutation = useDeleteProduct();
    
    const handleDelete = async (id: string) => {
        await deleteMutation.mutateAsync(id);
        // Cache automatically refetches products list!
    };
    
    if (isLoading) return <LoadingSpinner />;
    if (error) return <Error message={error.message} />;
    
    return <ProductsList products={data?.data || []} />;
}
```

### 4. **Zustand Auth Store** (`lib/store/auth.ts`)

Replaces AuthProvider context with lightweight state management:
- Persists to localStorage automatically
- No React Context re-renders
- TypeScript support
- Multiple selector hooks

**Benefits:**
- **Performance**: No unnecessary re-renders
- **Simplicity**: Direct state access, no prop drilling
- **Type-Safe**: Full TypeScript integration

**Example:**
```typescript
import { useAuthStore, useIsAdmin } from '@/lib/store/auth';

function AdminButton() {
    const isAdmin = useIsAdmin(); // Only re-renders when isAdmin changes
    
    if (!isAdmin) return null;
    return <button>Admin Panel</button>;
}

function LoginForm() {
    const setAuth = useAuthStore((state) => state.setAuth);
    
    const handleLogin = async (email, password) => {
        const { user, token } = await authEndpoints.login({ email, password });
        setAuth(user, token); // Automatically persists and updates isAdmin
    };
}
```

### 5. **QueryClientProvider** (`components/QueryClientProvider.tsx`)

Wraps the app with React Query context:
- Configured in `app/layout.tsx`
- Global cache settings:
  - **Stale Time**: 1 minute (queries remain fresh)
  - **GC Time**: 5 minutes (unused cache is garbage collected)
  - **Retry**: 1 time for failed requests
  - **Refetch on Window Focus**: Disabled (prevents unnecessary refetches)
- React Query DevTools in development mode

## Migration Status

### ✅ Completed

- [x] Axios API client with interceptors
- [x] All endpoint files (auth, products, orders, cms, admin)
- [x] All React Query hooks
- [x] Zustand auth store
- [x] QueryClientProvider in layout
- [x] Products pages (`/admin/products`, `/admin/products/new`)
- [x] CMS Pages (`/admin/cms/pages`)

### ⏳ In Progress

- [ ] Dashboard (`/admin/dashboard`)
- [ ] Business Intelligence (`/admin/analytics`)
- [ ] CMS Media (`/admin/cms/media`)
- [ ] CMS Header/Footer (`/admin/cms/header`, `/admin/cms/footer`)
- [ ] Orders pages (`/admin/orders`)

### 📋 To Do

- [ ] Replace all AuthProvider usage with Zustand
- [ ] Remove old `lib/api.ts` (after all migrations)
- [ ] Add ESLint rule to prevent direct `fetch()` calls
- [ ] Update documentation

## Key Benefits

### 1. **Automatic Caching**

```typescript
// Component A fetches products
const { data } = useAdminProducts({ page: 1 });

// Component B reuses cached data - NO extra API call!
const { data } = useAdminProducts({ page: 1 });
```

### 2. **Request Deduplication**

```typescript
// Multiple components request same data simultaneously
<ProductList />  // useAdminProducts({ page: 1 })
<ProductCount /> // useAdminProducts({ page: 1 })
<ProductStats /> // useAdminProducts({ page: 1 })

// Result: Only 1 API call made, all components get same data
```

### 3. **Optimistic Updates**

```typescript
const deleteMutation = useDeleteProduct();

await deleteMutation.mutateAsync(productId);
// Cache invalidated automatically
// Products list refetches from server
// UI updates without manual refresh
```

### 4. **Error Boundaries**

```typescript
// Axios interceptor handles all errors centrally
try {
    await productsEndpoints.deleteProduct(id);
} catch (error) {
    // Already transformed to user-friendly message:
    // "The requested resource was not found." (404)
    // "Your session has expired. Please log in again." (401)
    alert(error.message);
}
```

### 5. **Type Safety**

```typescript
// TypeScript ensures correct types everywhere
const { data } = useAdminProducts({ page: 1, limit: 20 });
// data is ProductsResponse | undefined
// data.data is Product[]
// Product has id, name, price, etc. (autocomplete works!)
```

## API Call Patterns

### ❌ Old Pattern (Manual State Management)

```typescript
const [products, setProducts] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getAdminProducts({ page: 1 });
            setProducts(data.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
}, []);
```

### ✅ New Pattern (React Query)

```typescript
const { data, isLoading, error } = useAdminProducts({ page: 1 });

// That's it! Loading, error, caching all handled automatically
```

## Cache Configuration

### Query Defaults (`components/QueryClientProvider.tsx`)

```typescript
{
  queries: {
    staleTime: 60 * 1000,          // 1 minute - data stays fresh
    gcTime: 5 * 60 * 1000,         // 5 minutes - unused cache cleaned up
    retry: 1,                       // Retry failed requests once
    refetchOnWindowFocus: false,    // Don't refetch when tab regains focus
    refetchOnReconnect: true,       // Refetch when internet reconnects
  },
  mutations: {
    retry: 0,                       // Never retry mutations (create/update/delete)
  },
}
```

### Per-Hook Overrides

```typescript
// Admin data: Shorter stale time (fresher data)
export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => productsEndpoints.getAdminProducts(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Public data: Longer stale time (can be slightly stale)
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productsEndpoints.getProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// CMS config: Very long stale time (rarely changes)
export function useCMSConfig(key: string) {
  return useQuery({
    queryKey: ['cms', 'config', key],
    queryFn: () => cmsEndpoints.getConfig(key),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

## Auth Flow

### Old: Context + useState

```typescript
// AuthProvider.tsx (50+ lines)
const [user, setUser] = useState(null);
const [token, setToken] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    // ... manual sync logic
}, []);

const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
};
```

### New: Zustand

```typescript
// lib/store/auth.ts (automatically persists)
export const useAuthStore = create(persist(
    (set) => ({
        user: null,
        token: null,
        setAuth: (user, token) => set({ user, token }),
        logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
));

// Usage
const setAuth = useAuthStore((state) => state.setAuth);
const { user, token } = await authEndpoints.login({ email, password });
setAuth(user, token); // Auto-persists to localStorage!
```

## Troubleshooting

### Issue: "React Query hooks not working"

**Solution**: Ensure `QueryClientProvider` wraps your app in `layout.tsx`

```tsx
<QueryClientProvider>
    <AuthProvider>
        {children}
    </AuthProvider>
</QueryClientProvider>
```

### Issue: "401 Unauthorized errors"

**Check**: Axios client auto-injects token from localStorage. Verify token exists:

```typescript
const token = localStorage.getItem('token');
console.log('Token:', token);
```

### Issue: "Cache not updating after mutation"

**Solution**: Ensure you're invalidating queries in mutation `onSuccess`:

```typescript
export function useCreateProduct() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data) => productsEndpoints.createProduct(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        },
    });
}
```

## Next Steps

1. **Migrate remaining pages**: Dashboard, Orders, CMS components
2. **Remove AuthProvider**: Replace with Zustand everywhere
3. **Delete old `lib/api.ts`**: Once all files migrated
4. **Add ESLint rule**: Prevent direct `fetch()` calls in admin/
5. **Update docs**: Reflect new architecture in README

## Resources

- **React Query Docs**: https://tanstack.com/query/latest/docs/react/overview
- **Zustand Docs**: https://zustand-demo.pmnd.rs/
- **Axios Docs**: https://axios-http.com/docs/intro

## Benefits Summary

| Feature | Old Approach | New Approach |
|---------|-------------|--------------|
| **State Management** | Manual useState + useEffect | React Query (automatic) |
| **Caching** | None (refetch every time) | 1-10 minute cache (configurable) |
| **Loading States** | Manual setLoading(true/false) | Built-in isLoading |
| **Error Handling** | Try/catch in every component | Centralized in Axios interceptor |
| **Auth Token** | Manual in every fetch() | Auto-injected by Axios |
| **Type Safety** | Partial (manual interfaces) | Full (TypeScript end-to-end) |
| **Code Volume** | 50-100 lines per page | 10-20 lines per page |
| **Performance** | Unnecessary re-renders | Optimized with selectors |
| **Developer Experience** | Repetitive boilerplate | DRY (Don't Repeat Yourself) |

---

**Status**: ✅ Foundation Complete, Migration 60% Done  
**Next**: Migrate dashboard and orders, deploy to Railway
