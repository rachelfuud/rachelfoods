import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductImageDto, ProductVideoDto } from './dto/update-product.dto';

@Injectable()
export class ProductMediaService {
    constructor(private prisma: PrismaService) { }

    // ========================================
    // Product Images
    // ========================================

    async addProductImages(productId: string, images: ProductImageDto[]) {
        // Verify product exists
        const product = await this.prisma.products.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException(`Product with id ${productId} not found`);
        }

        // Get current max display order
        const maxOrder = await this.prisma.product_images.findFirst({
            where: { productId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
        });

        const startOrder = maxOrder ? maxOrder.displayOrder + 1 : 0;

        // Create images
        const createdImages = await Promise.all(
            images.map((image, index) =>
                this.prisma.product_images.create({
                    data: {
                        productId,
                        url: image.url,
                        altText: image.altText,
                        displayOrder: image.displayOrder ?? startOrder + index,
                        isPrimary: image.isPrimary ?? false,
                    },
                }),
            ),
        );

        // If any image is marked as primary, ensure only one primary exists
        if (images.some((img) => img.isPrimary)) {
            await this.ensureSinglePrimaryImage(productId, createdImages[0].id);
        }

        return createdImages;
    }

    async updateProductImage(productId: string, imageId: string, image: ProductImageDto) {
        const existingImage = await this.prisma.product_images.findFirst({
            where: { id: imageId, productId },
        });

        if (!existingImage) {
            throw new NotFoundException(`Image ${imageId} not found for product ${productId}`);
        }

        const updatedImage = await this.prisma.product_images.update({
            where: { id: imageId },
            data: {
                url: image.url,
                altText: image.altText,
                displayOrder: image.displayOrder,
                isPrimary: image.isPrimary,
            },
        });

        // Ensure only one primary image
        if (image.isPrimary) {
            await this.ensureSinglePrimaryImage(productId, imageId);
        }

        return updatedImage;
    }

    async deleteProductImage(productId: string, imageId: string) {
        const image = await this.prisma.product_images.findFirst({
            where: { id: imageId, productId },
        });

        if (!image) {
            throw new NotFoundException(`Image ${imageId} not found for product ${productId}`);
        }

        await this.prisma.product_images.delete({
            where: { id: imageId },
        });

        // If deleted image was primary, make first remaining image primary
        if (image.isPrimary) {
            const firstImage = await this.prisma.product_images.findFirst({
                where: { productId },
                orderBy: { displayOrder: 'asc' },
            });

            if (firstImage) {
                await this.prisma.product_images.update({
                    where: { id: firstImage.id },
                    data: { isPrimary: true },
                });
            }
        }
    }

    async reorderProductImages(productId: string, imageIds: string[]) {
        // Update display order for all images
        await Promise.all(
            imageIds.map((id, index) =>
                this.prisma.product_images.updateMany({
                    where: { id, productId },
                    data: { displayOrder: index },
                }),
            ),
        );

        return await this.prisma.product_images.findMany({
            where: { productId },
            orderBy: { displayOrder: 'asc' },
        });
    }

    private async ensureSinglePrimaryImage(productId: string, primaryImageId: string) {
        // Set all other images to non-primary
        await this.prisma.product_images.updateMany({
            where: {
                productId,
                id: { not: primaryImageId },
            },
            data: { isPrimary: false },
        });
    }

    // ========================================
    // Product Videos
    // ========================================

    async addProductVideos(productId: string, videos: ProductVideoDto[]) {
        const product = await this.prisma.products.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException(`Product with id ${productId} not found`);
        }

        const maxOrder = await this.prisma.product_videos.findFirst({
            where: { productId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
        });

        const startOrder = maxOrder ? maxOrder.displayOrder + 1 : 0;

        const createdVideos = await Promise.all(
            videos.map((video, index) =>
                this.prisma.product_videos.create({
                    data: {
                        productId,
                        url: video.url,
                        title: video.title,
                        description: video.description,
                        thumbnail: video.thumbnail,
                        duration: video.duration,
                        displayOrder: video.displayOrder ?? startOrder + index,
                    },
                }),
            ),
        );

        return createdVideos;
    }

    async updateProductVideo(productId: string, videoId: string, video: ProductVideoDto) {
        const existingVideo = await this.prisma.product_videos.findFirst({
            where: { id: videoId, productId },
        });

        if (!existingVideo) {
            throw new NotFoundException(`Video ${videoId} not found for product ${productId}`);
        }

        return await this.prisma.product_videos.update({
            where: { id: videoId },
            data: {
                url: video.url,
                title: video.title,
                description: video.description,
                thumbnail: video.thumbnail,
                duration: video.duration,
                displayOrder: video.displayOrder,
            },
        });
    }

    async deleteProductVideo(productId: string, videoId: string) {
        const video = await this.prisma.product_videos.findFirst({
            where: { id: videoId, productId },
        });

        if (!video) {
            throw new NotFoundException(`Video ${videoId} not found for product ${productId}`);
        }

        await this.prisma.product_videos.delete({
            where: { id: videoId },
        });
    }

    async reorderProductVideos(productId: string, videoIds: string[]) {
        await Promise.all(
            videoIds.map((id, index) =>
                this.prisma.product_videos.updateMany({
                    where: { id, productId },
                    data: { displayOrder: index },
                }),
            ),
        );

        return await this.prisma.product_videos.findMany({
            where: { productId },
            orderBy: { displayOrder: 'asc' },
        });
    }

    // ========================================
    // Helper Methods
    // ========================================

    async getProductMedia(productId: string) {
        const [images, videos] = await Promise.all([
            this.prisma.product_images.findMany({
                where: { productId },
                orderBy: { displayOrder: 'asc' },
            }),
            this.prisma.product_videos.findMany({
                where: { productId },
                orderBy: { displayOrder: 'asc' },
            }),
        ]);

        return { images, videos };
    }
}
