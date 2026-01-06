import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
    constructor(private prisma: PrismaService) { }


    /**
     * Create a new category
     */
    async create(createCategoryDto: CreateCategoryDto) {
        // Check if slug already exists
        const existing = await this.prisma.categories.findUnique({
            where: { slug: createCategoryDto.slug },
        });

        if (existing) {
            throw new ConflictException(`Category with slug '${createCategoryDto.slug}' already exists`);
        }

        // Validate parent exists if provided
        if (createCategoryDto.parentId) {
            const parent = await this.prisma.categories.findUnique({
                where: { id: createCategoryDto.parentId },
            });

            if (!parent) {
                throw new NotFoundException(`Parent category with id '${createCategoryDto.parentId}' not found`);
            }
        }

        return this.prisma.categories.create({
            data: {
                id: crypto.randomUUID(),
                name: createCategoryDto.name,
                slug: createCategoryDto.slug,
                description: createCategoryDto.description,
                parentId: createCategoryDto.parentId,
                displayOrder: createCategoryDto.displayOrder ?? 0,
                imageUrl: createCategoryDto.imageUrl,
                updatedAt: new Date(),
            },
            include: {
                categories: true,
                other_categories: true,
            },
        });
    }

    /**
     * Find all categories (only active ones by default)
     */
    async findAll(includeDisabled = false) {
        return this.prisma.categories.findMany({
            where: {
                deletedAt: null,
                ...(includeDisabled ? {} : { status: 'ACTIVE' }),
            },
            include: {
                categories: true,
                other_categories: {
                    where: {
                        deletedAt: null,
                        ...(includeDisabled ? {} : { status: 'ACTIVE' }),
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
            orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        });
    }

    /**
     * Find category by ID
     */
    async findOne(id: string) {
        const category = await this.prisma.categories.findUnique({
            where: { id },
            include: {
                categories: true,
                other_categories: {
                    where: { deletedAt: null },
                },
                products: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        status: true,
                    },
                },
            },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category with id '${id}' not found`);
        }

        return category;
    }

    /**
     * Find category by slug
     */
    async findBySlug(slug: string) {
        const category = await this.prisma.categories.findUnique({
            where: { slug },
            include: {
                categories: true,
                other_categories: {
                    where: { deletedAt: null, status: 'ACTIVE' },
                },
                products: {
                    where: { deletedAt: null, status: 'ACTIVE' },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        price: true,
                        unit: true,
                        images: true,
                    },
                },
            },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category with slug '${slug}' not found`);
        }

        return category;
    }

    /**
     * Update a category
     */
    async update(id: string, updateCategoryDto: UpdateCategoryDto) {
        // Check if category exists
        const category = await this.prisma.categories.findUnique({
            where: { id },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category with id '${id}' not found`);
        }

        // Check if slug is unique (if being updated)
        if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
            const existing = await this.prisma.categories.findUnique({
                where: { slug: updateCategoryDto.slug },
            });

            if (existing) {
                throw new ConflictException(`Category with slug '${updateCategoryDto.slug}' already exists`);
            }
        }

        // Validate parent exists if provided
        if (updateCategoryDto.parentId) {
            // Prevent circular references
            if (updateCategoryDto.parentId === id) {
                throw new BadRequestException('A category cannot be its own parent');
            }

            const parent = await this.prisma.categories.findUnique({
                where: { id: updateCategoryDto.parentId },
            });

            if (!parent) {
                throw new NotFoundException(`Parent category with id '${updateCategoryDto.parentId}' not found`);
            }

            // Check if the parent is a descendant of this category
            const isDescendant = await this.isDescendant(id, updateCategoryDto.parentId);
            if (isDescendant) {
                throw new BadRequestException('Cannot set a descendant as parent (circular reference)');
            }
        }

        return this.prisma.categories.update({
            where: { id },
            data: updateCategoryDto,
            include: {
                categories: true,
                other_categories: true,
            },
        });
    }

    /**
     * Disable a category (hide from buyers)
     */
    async disable(id: string) {
        const category = await this.prisma.categories.findUnique({
            where: { id },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category with id '${id}' not found`);
        }

        return this.prisma.categories.update({
            where: { id },
            data: { status: 'DISABLED' },
        });
    }

    /**
     * Enable a category
     */
    async enable(id: string) {
        const category = await this.prisma.categories.findUnique({
            where: { id },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category with id '${id}' not found`);
        }

        return this.prisma.categories.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });
    }

    /**
     * Soft delete a category
     */
    async remove(id: string) {
        const category = await this.prisma.categories.findUnique({
            where: { id },
            include: {
                other_categories: true,
                products: true,
            },
        });

        if (!category || category.deletedAt) {
            throw new NotFoundException(`Category with id '${id}' not found`);
        }

        // Check if category has children
        if (category.other_categories.length > 0) {
            throw new BadRequestException('Cannot delete category with child categories. Delete children first.');
        }

        // Soft delete the category
        return this.prisma.categories.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'DISABLED',
            },
        });
    }

    /**
     * Get category hierarchy (tree structure)
     */
    async getHierarchy() {
        const categories = await this.prisma.categories.findMany({
            where: {
                deletedAt: null,
                status: 'ACTIVE',
            },
            include: {
                other_categories: {
                    where: { deletedAt: null, status: 'ACTIVE' },
                    include: {
                        other_categories: {
                            where: { deletedAt: null, status: 'ACTIVE' },
                        },
                    },
                },
            },
            orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        });

        // Return only root categories (no parent)
        return categories.filter((cat) => !cat.parentId);
    }

    /**
     * Helper: Check if targetId is a descendant of categoryId
     */
    private async isDescendant(categoryId: string, targetId: string): Promise<boolean> {
        const target = await this.prisma.categories.findUnique({
            where: { id: targetId },
            include: { categories: true },
        });

        if (!target) return false;
        if (!target.parentId) return false;
        if (target.parentId === categoryId) return true;

        // Recursively check parent
        return this.isDescendant(categoryId, target.parentId);
    }
}
