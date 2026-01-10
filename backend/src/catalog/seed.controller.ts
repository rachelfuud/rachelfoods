import { Controller, Post, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus, CategoryStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Controller('api/seed')
export class SeedController {
    constructor(private prisma: PrismaService) { }

    @Post('catalog')
    async seedCatalog() {
        // PRODUCTION LOCKDOWN: Prevent catalog seeding in production environments
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Catalog seeding is disabled in production environments.');
        }

        const createSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        const CATEGORIES = [
            { name: 'Grains & Staples', description: 'Essential grains and staple foods' },
            { name: 'Proteins', description: 'Fresh proteins including fish and meat' },
            { name: 'Spices & Ingredients', description: 'Traditional spices and cooking ingredients' },
            { name: 'Ready Mixes', description: 'Ready-to-cook traditional meal mixes' },
            { name: 'Custom Requests', description: 'Special requested items' }
        ];

        const PRODUCTS = [
            { name: 'Cray Fish', category: 'Spices & Ingredients', price: 10, unit: 'pack', weight: 0.2, description: 'Ground crayfish' },
            { name: 'Fresh Ogi', category: 'Grains & Staples', price: 7, unit: 'wrap / pack', weight: 0.5, description: 'Fermented cereal pudding' },
            { name: 'Kilishi', category: 'Proteins', price: 10, unit: 'pack', weight: 0.3, description: 'Traditional spiced dried meat' },
            { name: 'Iru / Locust Beans', category: 'Spices & Ingredients', price: 5, unit: 'pack', weight: 0.2, description: 'Fermented locust beans' },
            { name: 'Fufu', category: 'Grains & Staples', price: 10, unit: '5 pieces', weight: 0.5, description: 'Traditional fufu flour' },
            { name: 'Egusi', category: 'Spices & Ingredients', price: 10, unit: 'pack', weight: 0.5, description: 'Melon seeds (Egusi)' },
            { name: 'Panla', category: 'Proteins', price: 20, unit: 'pack', weight: 1.0, description: 'Dried Hake fish (Panla)', perishable: true },
            { name: 'Ewa Aganyin Mix', category: 'Ready Mixes', price: 10, unit: 'pack', weight: 0.5, description: 'Ewa Aganyin beans sauce mix', perishable: true },
            { name: 'Ofada Mix', category: 'Ready Mixes', price: 10, unit: 'pack', weight: 0.5, description: 'Complete Ofada sauce ingredients', perishable: true },
            { name: 'Pomo', category: 'Proteins', price: 20, unit: 'pack', weight: 1.0, description: 'Cow skin (Pomo)', perishable: true },
            { name: 'Cat Fish', category: 'Proteins', price: 30, unit: 'pack', weight: 1.0, description: 'Fresh catfish', perishable: true },
            { name: 'Ayamase Mix', category: 'Ready Mixes', price: 10, unit: 'pack', weight: 0.5, description: 'Traditional Ayamase sauce ingredients', perishable: true },
            { name: 'Pepper Soup Ingredient', category: 'Spices & Ingredients', price: 10, unit: 'pack', weight: 0.3, description: 'Complete pepper soup spice mix' },
            { name: 'Tapioca', category: 'Grains & Staples', price: 10, unit: 'pack', weight: 1.0, description: 'Fresh tapioca' }
        ];

        const categoryMap = {};

        for (const cat of CATEGORIES) {
            const existing = await this.prisma.categories.findFirst({ where: { name: cat.name } });
            if (existing) {
                categoryMap[cat.name] = existing.id;
            } else {
                const created = await this.prisma.categories.create({
                    data: { id: uuidv4(), name: cat.name, slug: createSlug(cat.name), description: cat.description, status: CategoryStatus.ACTIVE, updatedAt: new Date() }
                });
                categoryMap[cat.name] = created.id;
            }
        }

        let created = 0;
        for (const product of PRODUCTS) {
            const exists = await this.prisma.products.findFirst({ where: { slug: createSlug(product.name) } });
            if (!exists) {
                const slug = createSlug(product.name);
                const productId = uuidv4();

                // Create product
                await this.prisma.products.create({
                    data: {
                        id: productId,
                        name: product.name,
                        slug: slug,
                        description: product.description,
                        price: product.price,
                        unit: product.unit,
                        weight: product.weight,
                        stock: 50,
                        perishable: product.perishable || false,
                        categoryId: categoryMap[product.category],
                        status: ProductStatus.ACTIVE,
                        images: [`/products/${slug}.svg`],
                        updatedAt: new Date()
                    }
                });

                // Create default variant for the product
                await this.prisma.product_variants.create({
                    data: {
                        id: uuidv4(),
                        productId: productId,
                        name: `1 ${product.unit}`,
                        sku: `${slug}-default`,
                        price: product.price,
                        stock: 50,
                        isDefault: true,
                        isActive: true,
                        updatedAt: new Date(),
                    }
                });

                created++;
            }
        }

        return { success: true, categoriesCount: Object.keys(categoryMap).length, productsCreated: created };
    }
}
