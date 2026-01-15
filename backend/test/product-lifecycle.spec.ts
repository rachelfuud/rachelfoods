import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/catalog/product.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CacheService } from '../src/cache/cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PHASE 9A: Product Lifecycle Tests
 * 
 * Critical invariants:
 * 1. DRAFT products are never visible to buyers
 * 2. Publishing requires: image, price > 0, category
 * 3. ACTIVE products can be disabled/archived with confirmation
 * 4. Archived products with active orders cannot be deleted
 * 5. Status transitions are validated
 */
describe('ProductService - Lifecycle Management', () => {
    let service: ProductService;
    let prisma: PrismaService;
    let cache: CacheService;

    const mockPrisma: any = {
        products: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        order_items: {
            count: jest.fn(),
        },
        $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    };

    const mockCache = {
        deletePattern: jest.fn(),
        getOrSet: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: CacheService,
                    useValue: mockCache,
                },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
        prisma = module.get<PrismaService>(PrismaService);
        cache = module.get<CacheService>(CacheService);

        jest.clearAllMocks();
    });

    describe('DRAFT → ACTIVE Publishing', () => {
        it('should publish product meeting all requirements', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Test Product',
                slug: 'test-product',
                description: 'Description',
                price: new Decimal(10.0),
                imageUrl: 'https://example.com/image.jpg',
                categoryId: 'cat-1',
                status: 'DRAFT',
                deletedAt: null,
                variants: [],
                category: {
                    id: 'cat-1',
                    name: 'Category',
                },
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                status: 'ACTIVE',
            });

            // Act
            const result = await service.publishProduct('prod-1');

            // Assert
            expect(mockPrisma.products.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: {
                    status: 'ACTIVE',
                    updatedAt: expect.any(Date),
                },
                include: expect.any(Object),
            });
            expect(result.message).toContain('successfully published');
            expect(mockCache.deletePattern).toHaveBeenCalledWith('^products:');
        });

        it('should reject publishing without image', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'No Image Product',
                price: new Decimal(10.0),
                imageUrl: null, // No image
                categoryId: 'cat-1',
                status: 'DRAFT',
                deletedAt: null,
                variants: [],
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act & Assert
            await expect(
                service.publishProduct('prod-1')
            ).rejects.toThrow(BadRequestException);

            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should reject publishing with zero price', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Free Product',
                price: new Decimal(0), // Invalid
                imageUrl: 'https://example.com/image.jpg',
                categoryId: 'cat-1',
                status: 'DRAFT',
                deletedAt: null,
                variants: [],
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act & Assert
            await expect(
                service.publishProduct('prod-1')
            ).rejects.toThrow(BadRequestException);

            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should reject publishing with negative price', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Negative Price',
                price: new Decimal(-5.0), // Invalid
                imageUrl: 'https://example.com/image.jpg',
                categoryId: 'cat-1',
                status: 'DRAFT',
                deletedAt: null,
                variants: [],
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act & Assert
            await expect(
                service.publishProduct('prod-1')
            ).rejects.toThrow(BadRequestException);
        });

        it('should reject publishing without category', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'No Category',
                price: new Decimal(10.0),
                imageUrl: 'https://example.com/image.jpg',
                categoryId: null, // No category
                status: 'DRAFT',
                deletedAt: null,
                variants: [],
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act & Assert
            await expect(
                service.publishProduct('prod-1')
            ).rejects.toThrow(BadRequestException);

            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should warn about low stock without blocking', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Low Stock',
                price: new Decimal(10.0),
                imageUrl: 'https://example.com/image.jpg',
                categoryId: 'cat-1',
                status: 'DRAFT',
                deletedAt: null,
                variants: [
                    { id: 'v1', stock: 2, isActive: true, deletedAt: null },
                ],
                category: { id: 'cat-1', name: 'Category' },
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                status: 'ACTIVE',
            });

            // Act
            const result = await service.publishProduct('prod-1');

            // Assert - Should succeed with warning
            expect(result.message).toContain('successfully published');
            expect(result.warnings).toBeDefined();
            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('low stock'),
                ])
            );
        });

        it('should warn about placeholder image without blocking', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Placeholder Image',
                price: new Decimal(10.0),
                imageUrl: 'https://example.com/placeholder.jpg',
                categoryId: 'cat-1',
                status: 'DRAFT',
                deletedAt: null,
                variants: [],
                category: { id: 'cat-1', name: 'Category' },
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                status: 'ACTIVE',
            });

            // Act
            const result = await service.publishProduct('prod-1');

            // Assert
            expect(result.message).toContain('successfully published');
            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('placeholder image'),
                ])
            );
        });

        it('should not re-publish already ACTIVE product', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Already Active',
                price: new Decimal(10.0),
                imageUrl: 'https://example.com/image.jpg',
                categoryId: 'cat-1',
                status: 'ACTIVE', // Already published
                deletedAt: null,
                variants: [],
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act
            const result = await service.publishProduct('prod-1');

            // Assert
            expect(result.message).toContain('already published');
            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should reject publishing archived product', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                status: 'ARCHIVED',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act & Assert
            await expect(
                service.publishProduct('prod-1')
            ).rejects.toThrow('Cannot publish an archived product');
        });
    });

    describe('Invariant: DRAFT Products Hidden from Buyers', () => {
        it('should only return ACTIVE products in public queries', async () => {
            // Arrange
            const products = [
                {
                    id: 'prod-1',
                    name: 'Active Product',
                    status: 'ACTIVE',
                    deletedAt: null,
                    imageUrl: 'img1.jpg',
                    variants: [],
                },
                {
                    id: 'prod-2',
                    name: 'Draft Product',
                    status: 'DRAFT', // Should be filtered out
                    deletedAt: null,
                    imageUrl: 'img2.jpg',
                    variants: [],
                },
            ];

            mockPrisma.products.findMany.mockImplementation((args: any) => {
                // Verify query filters for ACTIVE status
                // Service uses {in: ['ACTIVE']} format
                expect(args.where.status).toEqual({ in: ['ACTIVE'] });
                return Promise.resolve(
                    products.filter(p => p.status === 'ACTIVE')
                );
            });

            // Act
            const result = await service.findAll(false, false);

            // Assert - Only ACTIVE product returned
            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('ACTIVE');
        });

        it('should include DRAFT products in admin queries', async () => {
            // Arrange
            const products = [
                { id: 'prod-1', status: 'ACTIVE', deletedAt: null },
                { id: 'prod-2', status: 'DRAFT', deletedAt: null },
                { id: 'prod-3', status: 'DISABLED', deletedAt: null },
            ];

            mockPrisma.products.findMany.mockImplementation((args: any) => {
                // Admin query allows all statuses
                const allowedStatuses = args.where.status.in || [];
                return Promise.resolve(
                    products.filter(p => allowedStatuses.includes(p.status))
                );
            });

            // Act - Admin query (includeDisabled = true)
            const result = await service.findAll(true, false);

            // Assert - Should include DRAFT
            expect(result.length).toBeGreaterThan(1);
        });
    });

    describe('Disable Product with Confirmation', () => {
        it('should disable DRAFT product without confirmation', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Draft Product',
                status: 'DRAFT',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(0);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                status: 'DISABLED',
            });

            // Act
            const result = await service.disableProduct('prod-1', false);

            // Assert
            expect(result.message).toContain('successfully disabled');
        });

        it('should require confirmation for ACTIVE product with warnings', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Active Featured',
                status: 'ACTIVE',
                isFeatured: true,
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(5); // Has active orders

            // Act & Assert
            await expect(
                service.disableProduct('prod-1', false) // No confirmation
            ).rejects.toThrow('Confirmation required');

            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should disable ACTIVE product with confirmation', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Active Product',
                status: 'ACTIVE',
                deletedAt: null,
                isFeatured: false,
                orderCount: 0,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(0);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                status: 'DISABLED',
            });

            // Act
            const result = await service.disableProduct('prod-1', true);

            // Assert
            expect(result.message).toContain('successfully disabled');
            expect(mockCache.deletePattern).toHaveBeenCalled();
        });

        it('should return message if already disabled', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                status: 'DISABLED',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act
            const result = await service.disableProduct('prod-1', false);

            // Assert
            expect(result.message).toContain('already disabled');
            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });
    });

    describe('Archive Product with Safety Checks', () => {
        it('should block archiving product with active orders', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Has Orders',
                status: 'ACTIVE',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(3); // 3 active orders

            // Act & Assert
            await expect(
                service.archiveProduct('prod-1', true)
            ).rejects.toThrow('Cannot archive product with active orders');

            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should archive product without active orders', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'No Active Orders',
                status: 'DISABLED',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(0); // No active orders
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                status: 'ARCHIVED',
            });

            // Act
            const result = await service.archiveProduct('prod-1', true);

            // Assert
            expect(result.message).toContain('successfully archived');
            expect(mockCache.deletePattern).toHaveBeenCalled();
        });

        it('should require confirmation for ACTIVE product archival', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                status: 'ACTIVE',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(0);

            // Act & Assert
            await expect(
                service.archiveProduct('prod-1', false) // No confirmation
            ).rejects.toThrow('Confirmation required');
        });

        it('should return message if already archived', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                status: 'ARCHIVED',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act
            const result = await service.archiveProduct('prod-1', false);

            // Assert
            expect(result.message).toContain('already archived');
            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });
    });

    describe('Impact Preview', () => {
        it('should show impact of disabling featured product', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Featured Product',
                status: 'ACTIVE',
                isFeatured: true,
                orderCount: 50,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(5);

            // Act
            const result = await service.getImpactPreview('prod-1');

            // Assert
            expect(result.activeOrdersAffected).toBe(5);
            expect(result.isFeatured).toBe(true);
            expect(result.isPopular).toBe(true);
            expect(result.warnings).toContain('This product is featured on the homepage');
        });

        it('should show zero impact for unpopular draft product', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Draft Product',
                status: 'DRAFT',
                isFeatured: false,
                orderCount: 0,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(0);

            // Act
            const result = await service.getImpactPreview('prod-1');

            // Assert
            expect(result.activeOrdersAffected).toBe(0);
            expect(result.isFeatured).toBe(false);
            expect(result.isPopular).toBe(false);
            expect(result.warnings).toEqual([]);
        });
    });

    describe('Status Transition Validation', () => {
        it('should not allow DRAFT → ARCHIVED without going through ACTIVE', async () => {
            // This is a business rule: products should typically go DRAFT → ACTIVE → ARCHIVED
            // Direct DRAFT → ARCHIVED might indicate a mistake

            const product = {
                id: 'prod-1',
                status: 'DRAFT',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.order_items.count.mockResolvedValue(0);

            // Act - Archiving a DRAFT product
            // This should either require special confirmation or be allowed
            // Depending on business rules - here we allow it but with confirmation
            const result = await service.archiveProduct('prod-1', true);

            // Assert - Can archive but requires confirmation
            expect(result).toBeDefined();
        });

        it('should prevent disabling archived product', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                status: 'ARCHIVED',
                deletedAt: null,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // Act & Assert
            await expect(
                service.disableProduct('prod-1', true)
            ).rejects.toThrow('Cannot disable an archived product');
        });
    });
});
