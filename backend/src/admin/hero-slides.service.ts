import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

export interface CreateHeroSlideDto {
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl?: string;
    buttonText?: string;
    order?: number;
}

export interface UpdateHeroSlideDto {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    linkUrl?: string;
    buttonText?: string;
    order?: number;
    isActive?: boolean;
}

@Injectable()
export class HeroSlidesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
    ) { }

    async findAll(activeOnly = false) {
        return this.prisma.hero_slides.findMany({
            where: activeOnly ? { isActive: true } : {},
            orderBy: { order: 'asc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.hero_slides.findUnique({
            where: { id },
        });
    }

    async create(data: CreateHeroSlideDto, userId?: string) {
        const slide = await this.prisma.hero_slides.create({
            data: {
                ...data,
                createdBy: userId,
                updatedBy: userId,
            },
        });

        await this.auditLog.log({
            userId,
            action: 'CREATE',
            entity: 'hero_slides',
            entityId: slide.id,
            changes: slide,
        });

        return slide;
    }

    async update(id: string, data: UpdateHeroSlideDto, userId?: string) {
        const oldSlide = await this.prisma.hero_slides.findUnique({ where: { id } });

        const slide = await this.prisma.hero_slides.update({
            where: { id },
            data: {
                ...data,
                updatedBy: userId,
            },
        });

        await this.auditLog.log({
            userId,
            action: 'UPDATE',
            entity: 'hero_slides',
            entityId: slide.id,
            changes: { before: oldSlide, after: slide },
        });

        return slide;
    }

    async delete(id: string, userId?: string) {
        const slide = await this.prisma.hero_slides.findUnique({ where: { id } });

        await this.prisma.hero_slides.delete({
            where: { id },
        });

        await this.auditLog.log({
            userId,
            action: 'DELETE',
            entity: 'hero_slides',
            entityId: id,
            changes: slide,
        });

        return { success: true, message: 'Hero slide deleted successfully' };
    }

    async reorder(slideIds: string[], userId?: string) {
        const updates = slideIds.map((id, index) =>
            this.prisma.hero_slides.update({
                where: { id },
                data: { order: index, updatedBy: userId },
            })
        );

        await Promise.all(updates);

        await this.auditLog.log({
            userId,
            action: 'UPDATE',
            entity: 'hero_slides',
            entityId: 'reorder',
            changes: { slideIds },
        });

        return { success: true, message: 'Hero slides reordered successfully' };
    }
}
