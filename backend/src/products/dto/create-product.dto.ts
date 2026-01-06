export class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    categoryId?: string;
    weight?: number;
    unit?: string;
    isPerishable?: boolean;
}
