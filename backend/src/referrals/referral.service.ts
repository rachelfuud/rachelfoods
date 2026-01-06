import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralConfigDto } from './dto/update-referral-config.dto';
import { QueryReferralDto } from './dto/query-referral.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReferralService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate unique referral code
     */
    private generateReferralCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Create a new referral
     * A buyer creates a referral by providing an email
     */
    async createReferral(referrerId: string, dto: CreateReferralDto) {
        // Check if referral program is active
        const config = await this.getreferral_config();
        if (!config.isActive) {
            throw new BadRequestException('Referral program is currently inactive');
        }

        // Check if user exists
        const referrer = await this.prisma.users.findUnique({
            where: { id: referrerId },
        });

        if (!referrer) {
            throw new NotFoundException('Referrer not found');
        }

        // Check if referred email is already a user
        const existingUser = await this.prisma.users.findUnique({
            where: { email: dto.referredEmail },
        });

        // Don't allow self-referral
        if (existingUser && existingUser.id === referrerId) {
            throw new BadRequestException('You cannot refer yourself');
        }

        // Check if this email has already been referred by this user
        const existingReferral = await this.prisma.referrals.findFirst({
            where: {
                referrerId,
                referredEmail: dto.referredEmail,
            },
        });

        if (existingReferral) {
            throw new ConflictException('You have already referred this email');
        }

        // Generate unique referral code
        let referralCode: string;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            referralCode = this.generateReferralCode();
            const existing = await this.prisma.referrals.findUnique({
                where: { referralCode },
            });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new BadRequestException('Unable to generate unique referral code');
        }

        // Create referral
        return this.prisma.referrals.create({
            data: {
                id: crypto.randomUUID(),
                referrerId,
                referredUserId: existingUser?.id,
                referredEmail: dto.referredEmail,
                referralCode,
                status: 'PENDING',
                updatedAt: new Date(),
            },
            include: {
                users_referrals_referrerIdTousers: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                users_referrals_referredUserIdTousers: existingUser
                    ? {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    }
                    : undefined,
            },
        });
    }

    /**
     * Check and update referral qualification status
     * Called when a referred user completes an order
     */
    async checkQualification(referredUserId: string) {
        const config = await this.getreferral_config();

        // Find pending referrals for this user
        const referrals = await this.prisma.referrals.findMany({
            where: {
                referredUserId,
                status: 'PENDING',
            },
        });

        if (referrals.length === 0) {
            return [];
        }

        // Count completed orders for this user
        const completedOrdersCount = await this.prisma.orders.count({
            where: {
                buyerId: referredUserId,
                status: 'COMPLETED',
            },
        });

        const updatedReferrals = [];

        // Update referrals that meet qualification
        for (const referral of referrals) {
            if (completedOrdersCount >= config.minOrdersRequired) {
                const rewardExpiry = new Date();
                rewardExpiry.setDate(rewardExpiry.getDate() + config.rewardExpiryDays);

                const updated = await this.prisma.referrals.update({
                    where: { id: referral.id },
                    data: {
                        completedOrdersCount,
                        status: 'QUALIFIED',
                        qualifiedAt: new Date(),
                        rewardType: config.rewardType,
                        rewardValue: config.rewardValue,
                        rewardExpiry,
                    },
                    include: {
                        users_referrals_referrerIdTousers: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        users_referrals_referredUserIdTousers: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                });
                updatedReferrals.push(updated);
            } else {
                // Update completed orders count even if not qualified yet
                await this.prisma.referrals.update({
                    where: { id: referral.id },
                    data: { completedOrdersCount },
                });
            }
        }

        return updatedReferrals;
    }

    /**
     * Apply referral reward to an order
     * Called by OrderService when buyer creates an order
     * Returns the discount amount to apply
     */
    async applyReward(buyerId: string, orderAmount: number): Promise<number> {
        // Find qualified, unused referral rewards
        const referral = await this.prisma.referrals.findFirst({
            where: {
                referrerId: buyerId,
                status: 'QUALIFIED',
                rewardApplied: false,
                rewardExpiry: { gte: new Date() },
            },
            orderBy: { qualifiedAt: 'asc' }, // Use oldest reward first
        });

        if (!referral) {
            return 0;
        }

        // Calculate discount
        let discount = 0;
        if (referral.rewardType === 'PERCENTAGE') {
            discount = (orderAmount * Number(referral.rewardValue)) / 100;
        } else if (referral.rewardType === 'FLAT') {
            discount = Number(referral.rewardValue);
        }

        // Ensure discount doesn't exceed order amount
        discount = Math.min(discount, orderAmount);

        // Mark reward as applied
        await this.prisma.referrals.update({
            where: { id: referral.id },
            data: {
                status: 'REWARDED',
                rewardApplied: true,
            },
        });

        return discount;
    }

    /**
     * Get referral statistics for a user
     */
    async getReferralStats(userId: string) {
        const referrals = await this.prisma.referrals.findMany({
            where: { referrerId: userId },
        });

        const stats = {
            totalReferrals: referrals.length,
            pendingReferrals: referrals.filter((r) => r.status === 'PENDING').length,
            qualifiedReferrals: referrals.filter((r) => r.status === 'QUALIFIED').length,
            rewardedReferrals: referrals.filter((r) => r.status === 'REWARDED').length,
            expiredReferrals: referrals.filter((r) => r.status === 'EXPIRED').length,
            totalRewardsEarned: referrals
                .filter((r) => r.status === 'REWARDED')
                .reduce((sum, r) => sum + Number(r.rewardValue || 0), 0),
            availableRewards: referrals.filter(
                (r) =>
                    r.status === 'QUALIFIED' &&
                    !r.rewardApplied &&
                    r.rewardExpiry &&
                    r.rewardExpiry >= new Date(),
            ).length,
        };

        return stats;
    }

    /**
     * Query referrals with filters
     */
    async queryReferrals(query: QueryReferralDto) {
        const { page = 1, limit = 20, referrerId, referredUserId, status } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (referrerId) {
            where.referrerId = referrerId;
        }
        if (referredUserId) {
            where.referredUserId = referredUserId;
        }
        if (status) {
            where.status = status;
        }

        const [referrals, total] = await Promise.all([
            this.prisma.referrals.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    users_referrals_referrerIdTousers: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    users_referrals_referredUserIdTousers: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.referrals.count({ where }),
        ]);

        return {
            data: referrals,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get referral by code (for referred users to sign up)
     */
    async getReferralByCode(code: string) {
        const referral = await this.prisma.referrals.findUnique({
            where: { referralCode: code },
            include: {
                users_referrals_referrerIdTousers: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        if (!referral) {
            throw new NotFoundException('Referral code not found');
        }

        return referral;
    }

    /**
     * Expire old rewards (cron job can call this)
     */
    async expireOldRewards() {
        const expiredReferrals = await this.prisma.referrals.updateMany({
            where: {
                status: 'QUALIFIED',
                rewardApplied: false,
                rewardExpiry: { lt: new Date() },
            },
            data: {
                status: 'EXPIRED',
            },
        });

        return {
            expiredCount: expiredReferrals.count,
        };
    }

    /**
     * Get referral config (admin settings)
     */
    async getreferral_config() {
        let config = await this.prisma.referral_config.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        if (!config) {
            // Create default config if none exists
            config = await this.prisma.referral_config.create({
                data: {
                    id: crypto.randomUUID(),
                    minOrdersRequired: 1,
                    rewardType: 'PERCENTAGE',
                    rewardValue: new Decimal(10),
                    rewardExpiryDays: 30,
                    isActive: true,
                    updatedAt: new Date(),
                },
            });
        }

        return config;
    }

    /**
     * Update referral config (admin only)
     */
    async updatereferral_config(dto: UpdateReferralConfigDto) {
        const currentConfig = await this.getreferral_config();

        return this.prisma.referral_config.update({
            where: { id: currentConfig.id },
            data: {
                minOrdersRequired: dto.minOrdersRequired,
                rewardType: dto.rewardType,
                rewardValue: dto.rewardValue ? new Decimal(dto.rewardValue) : undefined,
                rewardExpiryDays: dto.rewardExpiryDays,
                isActive: dto.isActive,
                updatedAt: new Date(),
            },
        });
    }
}
