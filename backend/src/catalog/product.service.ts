import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new product
     */
    async create(createProductDto: CreateProductDto, userId: string) {
        // Check if slug already exists
        const existing = await this.prisma.products.findUnique({
            where: { slug: createProductDto.slug },
        });

        if (existing) {
            throw new ConflictException(`Product with slug '${createProductDto.slug}' already exists`);
        }

        // Validate category exists if provided
        if (createProductDto.categoryId) {
            const category = await this.prisma.categories.findUnique({
                where: { id: createProductDto.categoryId },
            });

            if (!category || category.deletedAt) {
                throw new NotFoundException(`Category with id '${createProductDto.categoryId}' not found`);
            }
        }

        return this.prisma.products.create({
            data: {
                id: crypto.randomUUID(),
                name: createProductDto.name,
                slug: createProductDto.slug,
                description: createProductDto.description,
                price: new Decimal(createProductDto.price),
                unit: createProductDto.unit,
                weight: new Decimal(createProductDto.weight),
                stock: createProductDto.stock ?? 0,
                perishable: createProductDto.perishable ?? false,
                categoryId: createProductDto.categoryId,
                images: createProductDto.images ?? [],
                createdBy: userId,
                updatedAt: new Date(),
            },
            include: {
                category: true,
            },
        });
    }

    /**
     * Find all products (only active ones by default for buyers)
     */
    async findAll(includeDisabled = false, includeArchived = false) {
        const statusFilter: ('DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED')[] = [];

        if (includeDisabled || includeArchived) {
            // Admin/Store Owner view
            if (!includeArchived) {
                statusFilter.push('DRAFT', 'ACTIVE', 'DISABLED');
            } else {
                statusFilter.push('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');
            }
        } else {
            // Buyer view
            statusFilter.push('ACTIVE');
        }

        return this.prisma.products.findMany({
            where: {
                deletedAt: null,
                status: { in: statusFilter },
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: [{ createdAt: 'desc' }],
        });
    }

    /**
     * Find products by category
     */
    async findByCategory(categoryId: string, includeDisabled = false) {
        const statusFilter: ('DRAFT' | 'ACTIVE' | 'DISABLED')[] = includeDisabled
            ? ['DRAFT', 'ACTIVE', 'DISABLED']
            : ['ACTIVE'];

        return this.prisma.products.findMany({
            where: {
                categoryId,
                deletedAt: null,
                status: { in: statusFilter },
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: [{ name: 'asc' }],
        });
    }

    /**
     * Find product by ID
     */
    async findOne(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return product;
    }

    /**
     * Find product by slug
     */
    async findBySlug(slug: string) {
        const product = await this.prisma.products.findUnique({
            where: { slug },
            include: {
                category: true,
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with slug '${slug}' not found`);
        }

        return product;
    }

    /**
     * Update a product
     */
    async update(id: string, updateProductDto: UpdateProductDto) {
        // Check if product exists
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        // Check if slug is unique (if being updated)
        if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
            const existing = await this.prisma.products.findUnique({
                where: { slug: updateProductDto.slug },
            });

            if (existing) {
                throw new ConflictException(`Product with slug '${updateProductDto.slug}' already exists`);
            }
        }

        // Validate category exists if provided
        if (updateProductDto.categoryId) {
            const category = await this.prisma.categories.findUnique({
                where: { id: updateProductDto.categoryId },
            });

            if (!category || category.deletedAt) {
                throw new NotFoundException(`Category with id '${updateProductDto.categoryId}' not found`);
            }
        }

        // Convert numbers to Decimal if provided
        const data: any = { ...updateProductDto };
        if (updateProductDto.price !== undefined) {
            data.price = new Decimal(updateProductDto.price);
        }
        if (updateProductDto.weight !== undefined) {
            data.weight = new Decimal(updateProductDto.weight);
        }

        return this.prisma.products.update({
            where: { id },
            data,
            include: {
                category: true,
            },
        });
    }

    /**
     * Disable a product (hide from buyers, mark as out of stock)
     */
    async disable(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.prisma.products.update({
            where: { id },
            data: { status: 'DISABLED' },
        });
    }

    /**
     * Enable a product (make visible to buyers)
     */
    async enable(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.prisma.products.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });
    }

    /**
     * Archive a product (historical reference only)
     */
    async archive(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.prisma.products.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });
    }

    /**
     * Soft delete a product
     */
    async remove(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        // Soft delete the product
        return this.prisma.products.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'ARCHIVED',
            },
        });
    }

    /**
     * Update product stock
     */
    async updateStock(id: string, quantity: number) {
        if (quantity < 0) {
            throw new BadRequestException('Stock quantity cannot be negative');
        }

        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.prisma.products.update({
            where: { id },
            data: { stock: quantity },
        });
    }

    /**
     * Add images to a product
     */
    async addImages(id: string, imageUrls: string[]) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const updatedImages = [...product.images, ...imageUrls];

        return this.prisma.products.update({
            where: { id },
            data: { images: updatedImages },
        });
    }

    /**
     * Remove an image from a product
     */
    async removeImage(id: string, imageUrl: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const updatedImages = product.images.filter((img) => img !== imageUrl);

        return this.prisma.products.update({
            where: { id },
            data: { images: updatedImages },
        });
    }

    /**
     * Search products by name or description
     */
    async search(query: string, includeDisabled = false) {
        const statusFilter: ('DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED')[] = includeDisabled
            ? ['DRAFT', 'ACTIVE', 'DISABLED']
            : ['ACTIVE'];

        return this.prisma.products.findMany({
            where: {
                deletedAt: null,
                status: { in: statusFilter },
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: {
                categories: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: [{ name: 'asc' }],
        });
    }
}
