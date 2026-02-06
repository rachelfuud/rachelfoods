export class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    categoryId?: string;
    weight?: number;
    unit?: string;
    isPerishable?: boolean;
    images?: ProductImageDto[];
    videos?: ProductVideoDto[];
}

export class ProductImageDto {
    url: string;
    altText?: string;
    displayOrder?: number;
    isPrimary?: boolean;
}

export class ProductVideoDto {
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    displayOrder?: number;
}
