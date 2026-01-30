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
    buyerId?: string;  // Backend field name
    userId?: string;  // Legacy/alias
    status: string;
    paymentStatus?: string;
    paymentMethod?: string;
    totalAmount?: number;  // May not always be present
    totalCost?: number;  // Backend uses this field name
    subtotal?: number;
    shippingCost?: number;
    discountAmount?: number;
    walletUsed?: number;
    couponCode?: string;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryState?: string;
    deliveryZipCode?: string;
    deliveryPhone?: string;
    deliveryNotes?: string;
    createdAt: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    items?: OrderItem[];  // Legacy/alias - backend returns order_items
    order_items?: OrderItem[];  // Backend field name
    custom_order_items?: CustomOrderItem[];
    users?: {  // Backend returns buyer info as 'users'
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
    _count?: {
        order_items?: number;
        custom_order_items?: number;
    };
}

export interface OrderItem {
    id: string;
    productId: string;
    variantId?: string;
    productName: string;
    variantName?: string;
    productPrice: number;
    quantity: number;
    subtotal: number;
    product?: Product;
    products?: Product;  // Backend may use this field name
    categories?: Category;
}

export interface CustomOrderItem {
    id: string;
    orderId: string;
    itemName: string;
    description?: string;
    quantity: number;
    unit: string;
    estimatedPrice?: number;
    approvedPrice?: number;
    status: string;
}
