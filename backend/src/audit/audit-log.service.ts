import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
    userId?: string;
    userEmail?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: any;
    ip?: string;
    userAgent?: string;
}

@Injectable()
export class AuditLogService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create an audit log entry
     */
    async log(data: AuditLogData): Promise<void> {
        try {
            await this.prisma.audit_logs.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: data.userId,
                    userEmail: data.userEmail,
                    action: data.action,
                    entity: data.entity,
                    entityId: data.entityId,
                    changes: data.changes || null,
                    ip: data.ip,
                    userAgent: data.userAgent,
                    createdAt: new Date(),
                },
            });
        } catch (error) {
            // Log audit failures but don't break the main flow
            console.error('Failed to create audit log:', error);
        }
    }

    /**
     * Get audit logs with pagination and filtering
     */
    async getLogs(params: {
        userId?: string;
        action?: string;
        entity?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }) {
        const { userId, action, entity, startDate, endDate, page = 1, limit = 50 } = params;

        const where: any = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (entity) where.entity = entity;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.audit_logs.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    users: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            this.prisma.audit_logs.count({ where }),
        ]);

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get audit logs for a specific entity
     */
    async getEntityHistory(entity: string, entityId: string) {
        return this.prisma.audit_logs.findMany({
            where: {
                entity,
                entityId,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
}
