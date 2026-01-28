import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AddProductImageDto {
    url: string;
    altText?: string;
    displayOrder?: number;
    isPrimary?: boolean;
}

export interface AddProductVideoDto {
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    displayOrder?: number;
}

@Injectable()
export class ProductMediaService {
    constructor(private prisma: PrismaService) { }

    // ============================================
    // PRODUCT IMAGES
    // ============================================

    /**
     * Add multiple images to a product
     */
    async addImages(productId: string, images: AddProductImageDto[]) {
        const product = await this.prisma.products.findUnique({
            where: { id: productId },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${productId}' not found`);
        }

        // If marking an image as primary, unset other primary images
        const hasPrimary = images.some(img => img.isPrimary);
        if (hasPrimary) {
            await this.prisma.product_images.updateMany({
                where: { productId },
                data: { isPrimary: false },
            });
        }

        // Create all images
        const created = await Promise.all(
            images.map((img, index) =>
                this.prisma.product_images.create({
                    data: {
                        productId,
                        url: img.url,
                        altText: img.altText,
                        displayOrder: img.displayOrder ?? index,
                        isPrimary: img.isPrimary ?? (index === 0 && !hasPrimary),
                    },
                })
            )
        );

        // Update product's imageUrl to primary image or first image
        const primaryImage = created.find(img => img.isPrimary) || created[0];
        if (primaryImage) {
            await this.prisma.products.update({
                where: { id: productId },
                data: { imageUrl: primaryImage.url },
            });
        }

        return created;
    }

    /**
     * Get all images for a product
     */
    async getImages(productId: string) {
        return this.prisma.product_images.findMany({
            where: { productId },
            orderBy: [
                { isPrimary: 'desc' },
                { displayOrder: 'asc' },
            ],
        });
    }

    /**
     * Update a specific image
     */
    async updateImage(imageId: string, data: Partial<AddProductImageDto>) {
        const image = await this.prisma.product_images.findUnique({
            where: { id: imageId },
        });

        if (!image) {
            throw new NotFoundException(`Image with id '${imageId}' not found`);
        }

        // If setting as primary, unset other primary images for this product
        if (data.isPrimary) {
            await this.prisma.product_images.updateMany({
                where: {
                    productId: image.productId,
                    id: { not: imageId },
                },
                data: { isPrimary: false },
            });

            // Update product's imageUrl
            await this.prisma.products.update({
                where: { id: image.productId },
                data: { imageUrl: data.url || image.url },
            });
        }

        return this.prisma.product_images.update({
            where: { id: imageId },
            data: {
                url: data.url,
                altText: data.altText,
                displayOrder: data.displayOrder,
                isPrimary: data.isPrimary,
            },
        });
    }

    /**
     * Delete a specific image
     */
    async deleteImage(imageId: string) {
        const image = await this.prisma.product_images.findUnique({
            where: { id: imageId },
        });

        if (!image) {
            throw new NotFoundException(`Image with id '${imageId}' not found`);
        }

        await this.prisma.product_images.delete({
            where: { id: imageId },
        });

        // If deleted image was primary, set another image as primary
        if (image.isPrimary) {
            const nextImage = await this.prisma.product_images.findFirst({
                where: { productId: image.productId },
                orderBy: { displayOrder: 'asc' },
            });

            if (nextImage) {
                await this.prisma.product_images.update({
                    where: { id: nextImage.id },
                    data: { isPrimary: true },
                });

                await this.prisma.products.update({
                    where: { id: image.productId },
                    data: { imageUrl: nextImage.url },
                });
            } else {
                // No images left, clear product imageUrl
                await this.prisma.products.update({
                    where: { id: image.productId },
                    data: { imageUrl: null },
                });
            }
        }

        return { success: true, deletedId: imageId };
    }

    /**
     * Reorder images
     */
    async reorderImages(productId: string, imageIds: string[]) {
        const images = await this.prisma.product_images.findMany({
            where: { productId, id: { in: imageIds } },
        });

        if (images.length !== imageIds.length) {
            throw new BadRequestException('Some image IDs do not belong to this product');
        }

        // Update display order for each image
        await Promise.all(
            imageIds.map((id, index) =>
                this.prisma.product_images.update({
                    where: { id },
                    data: { displayOrder: index },
                })
            )
        );

        return this.getImages(productId);
    }

    // ============================================
    // PRODUCT VIDEOS
    // ============================================

    /**
     * Add multiple videos to a product
     */
    async addVideos(productId: string, videos: AddProductVideoDto[]) {
        const product = await this.prisma.products.findUnique({
            where: { id: productId },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${productId}' not found`);
        }

        const created = await Promise.all(
            videos.map((video, index) =>
                this.prisma.product_videos.create({
                    data: {
                        productId,
                        url: video.url,
                        title: video.title,
                        description: video.description,
                        thumbnail: video.thumbnail,
                        duration: video.duration,
                        displayOrder: video.displayOrder ?? index,
                    },
                })
            )
        );

        return created;
    }

    /**
     * Get all videos for a product
     */
    async getVideos(productId: string) {
        return this.prisma.product_videos.findMany({
            where: { productId },
            orderBy: { displayOrder: 'asc' },
        });
    }

    /**
     * Update a specific video
     */
    async updateVideo(videoId: string, data: Partial<AddProductVideoDto>) {
        const video = await this.prisma.product_videos.findUnique({
            where: { id: videoId },
        });

        if (!video) {
            throw new NotFoundException(`Video with id '${videoId}' not found`);
        }

        return this.prisma.product_videos.update({
            where: { id: videoId },
            data: {
                url: data.url,
                title: data.title,
                description: data.description,
                thumbnail: data.thumbnail,
                duration: data.duration,
                displayOrder: data.displayOrder,
            },
        });
    }

    /**
     * Delete a specific video
     */
    async deleteVideo(videoId: string) {
        const video = await this.prisma.product_videos.findUnique({
            where: { id: videoId },
        });

        if (!video) {
            throw new NotFoundException(`Video with id '${videoId}' not found`);
        }

        await this.prisma.product_videos.delete({
            where: { id: videoId },
        });

        return { success: true, deletedId: videoId };
    }

    /**
     * Reorder videos
     */
    async reorderVideos(productId: string, videoIds: string[]) {
        const videos = await this.prisma.product_videos.findMany({
            where: { productId, id: { in: videoIds } },
        });

        if (videos.length !== videoIds.length) {
            throw new BadRequestException('Some video IDs do not belong to this product');
        }

        await Promise.all(
            videoIds.map((id, index) =>
                this.prisma.product_videos.update({
                    where: { id },
                    data: { displayOrder: index },
                })
            )
        );

        return this.getVideos(productId);
    }
}
