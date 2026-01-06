import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';

@Injectable()
export class ReviewService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a pending review when order status changes to DELIVERED
     * Called automatically by OrderService
     */
    async createPendingReview(orderId: string, buyerId: string) {
        // Check if review already exists
        const existingReview = await this.prisma.reviews.findUnique({
            where: { orderId },
        });

        if (existingReview) {
            throw new BadRequestException('Review already exists for this order');
        }

        // Verify order exists and is DELIVERED
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'DELIVERED') {
            throw new BadRequestException('Order must be DELIVERED before creating review');
        }

        if (order.buyerId !== buyerId) {
            throw new ForbiddenException('You can only review your own orders');
        }

        // Create pending review
        return this.prisma.reviews.create({
            data: {
                id: crypto.randomUUID(),
                orderId,
                buyerId,
                productQualityRating: 0,
                deliveryExperienceRating: 0,
                overallSatisfactionRating: 0,
                recommendationScore: 0,
                status: 'PENDING',
                updatedAt: new Date(),
            },
            include: {
                orders: {
                    select: {
                        orderNumber: true,
                    },
                },
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Submit review (buyer submits ratings and feedback)
     * This marks the review as SUBMITTED and makes the order eligible for COMPLETED status
     */
    async submitReview(orderId: string, buyerId: string, dto: SubmitReviewDto) {
        // Find pending review
        const review = await this.prisma.reviews.findUnique({
            where: { orderId },
            include: { orders: true },
        });

        if (!review) {
            throw new NotFoundException('Review not found for this order');
        }

        if (review.buyerId !== buyerId) {
            throw new ForbiddenException('You can only submit your own reviews');
        }

        if (review.status !== 'PENDING') {
            throw new BadRequestException('Review has already been submitted and cannot be modified');
        }

        // Update review with ratings and feedback
        return this.prisma.reviews.update({
            where: { id: review.id },
            data: {
                productQualityRating: dto.productQualityRating,
                deliveryExperienceRating: dto.deliveryExperienceRating,
                overallSatisfactionRating: dto.overallSatisfactionRating,
                recommendationScore: dto.recommendationScore,
                feedback: dto.feedback,
                status: 'SUBMITTED',
                submittedAt: new Date(),
            },
            include: {
                orders: {
                    select: {
                        orderNumber: true,
                    },
                },
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Moderate review (admin only)
     * Flag, hide, or add moderation notes
     */
    async moderateReview(reviewId: string, dto: ModerateReviewDto) {
        const review = await this.prisma.reviews.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (review.status === 'PENDING') {
            throw new BadRequestException('Cannot moderate a review that has not been submitted');
        }

        return this.prisma.reviews.update({
            where: { id: reviewId },
            data: {
                isFlagged: dto.isFlagged !== undefined ? dto.isFlagged : review.isFlagged,
                isHidden: dto.isHidden !== undefined ? dto.isHidden : review.isHidden,
                moderationNotes: dto.moderationNotes || review.moderationNotes,
                status: 'MODERATED',
                moderatedAt: new Date(),
            },
            include: {
                orders: {
                    select: {
                        orderNumber: true,
                    },
                },
                users: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Get review by order ID
     */
    async getReviewByOrder(orderId: string) {
        const review = await this.prisma.reviews.findUnique({
            where: { orderId },
            include: {
                orders: {
                    select: {
                        orderNumber: true,
                        status: true,
                    },
                },
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        if (!review) {
            throw new NotFoundException('Review not found for this order');
        }

        return review;
    }

    /**
     * Get all reviews by a buyer
     */
    async getReviewsByBuyer(buyerId: string, query: QueryReviewDto) {
        const { page = 1, limit = 20, status, isFlagged, isHidden } = query;
        const skip = (page - 1) * limit;

        const where: any = { buyerId };

        if (status) {
            where.status = status;
        }
        if (isFlagged !== undefined) {
            where.isFlagged = isFlagged;
        }
        if (isHidden !== undefined) {
            where.isHidden = isHidden;
        }

        const [reviews, total] = await Promise.all([
            this.prisma.reviews.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    orders: {
                        select: {
                            orderNumber: true,
                            status: true,
                        },
                    },
                },
            }),
            this.prisma.reviews.count({ where }),
        ]);

        return {
            data: reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Query reviews with filters (admin/seller)
     */
    async queryReviews(query: QueryReviewDto) {
        const { page = 1, limit = 20, buyerId, orderId, status, isFlagged, isHidden } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (buyerId) {
            where.buyerId = buyerId;
        }
        if (orderId) {
            where.orderId = orderId;
        }
        if (status) {
            where.status = status;
        }
        if (isFlagged !== undefined) {
            where.isFlagged = isFlagged;
        }
        if (isHidden !== undefined) {
            where.isHidden = isHidden;
        }

        const [reviews, total] = await Promise.all([
            this.prisma.reviews.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    orders: {
                        select: {
                            orderNumber: true,
                            status: true,
                        },
                    },
                    users: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.reviews.count({ where }),
        ]);

        return {
            data: reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Check if order has a submitted review
     * Used by OrderService to enforce review requirement
     */
    async hasSubmittedReview(orderId: string): Promise<boolean> {
        const review = await this.prisma.reviews.findUnique({
            where: { orderId },
            select: { status: true },
        });

        return review !== null && review.status !== 'PENDING';
    }

    /**
     * Get review statistics for a buyer
     */
    async getBuyerReviewStats(buyerId: string) {
        const reviews = await this.prisma.reviews.findMany({
            where: {
                buyerId,
                status: { in: ['SUBMITTED', 'MODERATED'] },
            },
            select: {
                productQualityRating: true,
                deliveryExperienceRating: true,
                overallSatisfactionRating: true,
                recommendationScore: true,
            },
        });

        if (reviews.length === 0) {
            return {
                totalReviews: 0,
                averageProductQuality: 0,
                averageDeliveryExperience: 0,
                averageOverallSatisfaction: 0,
                averageRecommendationScore: 0,
            };
        }

        const sum = reviews.reduce(
            (acc, review) => ({
                productQuality: acc.productQuality + review.productQualityRating,
                deliveryExperience: acc.deliveryExperience + review.deliveryExperienceRating,
                overallSatisfaction: acc.overallSatisfaction + review.overallSatisfactionRating,
                recommendationScore: acc.recommendationScore + review.recommendationScore,
            }),
            { productQuality: 0, deliveryExperience: 0, overallSatisfaction: 0, recommendationScore: 0 },
        );

        return {
            totalReviews: reviews.length,
            averageProductQuality: +(sum.productQuality / reviews.length).toFixed(2),
            averageDeliveryExperience: +(sum.deliveryExperience / reviews.length).toFixed(2),
            averageOverallSatisfaction: +(sum.overallSatisfaction / reviews.length).toFixed(2),
            averageRecommendationScore: +(sum.recommendationScore / reviews.length).toFixed(2),
        };
    }
}
