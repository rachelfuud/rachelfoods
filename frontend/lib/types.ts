export interface ThemeConfig {
    id: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    defaultMode: 'light' | 'dark';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        fullName: string;
    };
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    displayOrder: number;
}

export interface ProductVariant {
    id: string;
    productId: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    isDefault: boolean;
    isActive: boolean;
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';

export interface Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    categoryId: string;
    category?: Category;
    imageUrl?: string;
    stock: number;
    unit: string;
    isAvailable: boolean;
    isFeatured: boolean;
    supportsRefill?: boolean;
    orderCount?: number;
    variants?: ProductVariant[];
    status?: ProductStatus;
    totalStock?: number;
}

export interface CartItem {
    productId: string;
    variantId?: string;
    product: Product;
    variant?: ProductVariant;
    quantity: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items?: OrderItem[];  // Optional - backend returns order_items
    order_items?: OrderItem[];  // Backend uses this field name
}

export interface OrderItem {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
}
