import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CmsService {
    constructor(private prisma: PrismaService) { }

    // ========================================
    // Site Config (Header, Footer, Announcement)
    // ========================================

    async getSiteConfig(type: 'header' | 'footer' | 'announcement') {
        const config = await this.prisma.site_config.findUnique({
            where: { type },
        });

        if (!config) {
            // Return default config if not found
            return this.getDefaultConfig(type);
        }

        return config;
    }

    async updateSiteConfig(
        type: 'header' | 'footer' | 'announcement',
        config: any,
        userId: string,
    ) {
        return await this.prisma.site_config.upsert({
            where: { type },
            update: {
                config,
                updatedBy: userId,
                updatedAt: new Date(),
            },
            create: {
                type,
                config,
                isActive: true,
                updatedBy: userId,
            },
        });
    }

    private getDefaultConfig(type: string) {
        const defaults = {
            header: {
                logo: {
                    url: '/logo.png',
                    alt: 'RachelFoods',
                },
                navigation: [
                    { label: 'Home', href: '/', order: 1 },
                    { label: 'Catalog', href: '/catalog', order: 2 },
                    { label: 'About', href: '/about', order: 3 },
                    { label: 'Contact', href: '/contact', order: 4 },
                ],
                announcement: {
                    enabled: false,
                    text: '',
                    link: '',
                    backgroundColor: '#ff6b35',
                    textColor: '#ffffff',
                },
            },
            footer: {
                columns: [
                    {
                        title: 'Quick Links',
                        links: [
                            { label: 'Shop', href: '/catalog' },
                            { label: 'About Us', href: '/about' },
                            { label: 'Contact', href: '/contact' },
                        ],
                    },
                    {
                        title: 'Customer Service',
                        links: [
                            { label: 'FAQ', href: '/faq' },
                            { label: 'Shipping', href: '/shipping' },
                            { label: 'Returns', href: '/returns' },
                        ],
                    },
                    {
                        title: 'Company',
                        links: [
                            { label: 'Privacy Policy', href: '/privacy' },
                            { label: 'Terms of Service', href: '/terms' },
                        ],
                    },
                ],
                social: {
                    facebook: '',
                    twitter: '',
                    instagram: '',
                    linkedin: '',
                },
                copyright: `© ${new Date().getFullYear()} RachelFoods. All rights reserved.`,
                paymentIcons: true,
            },
            announcement: {
                enabled: false,
                text: '',
                link: '',
                backgroundColor: '#ff6b35',
                textColor: '#ffffff',
            },
        };

        return {
            id: '',
            type,
            config: defaults[type] || {},
            isActive: true,
            updatedAt: new Date(),
            updatedBy: null,
        };
    }

    // ========================================
    // Content Pages
    // ========================================

    async getPages(includeUnpublished = false) {
        return await this.prisma.content_pages.findMany({
            where: includeUnpublished ? {} : { isPublished: true },
            orderBy: { updatedAt: 'desc' },
            include: {
                sections: {
                    where: { isVisible: true },
                    orderBy: { order: 'asc' },
                },
            },
        });
    }

    async getPage(slug: string, includeUnpublished = false) {
        const page = await this.prisma.content_pages.findUnique({
            where: { slug },
            include: {
                sections: {
                    where: { isVisible: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!page) {
            throw new NotFoundException(`Page with slug "${slug}" not found`);
        }

        if (!includeUnpublished && !page.isPublished) {
            throw new NotFoundException(`Page "${slug}" is not published`);
        }

        return page;
    }

    async createPage(data: {
        slug: string;
        title: string;
        metaTitle?: string;
        metaDesc?: string;
        ogImage?: string;
        userId: string;
    }) {
        // Check if slug already exists
        const existing = await this.prisma.content_pages.findUnique({
            where: { slug: data.slug },
        });

        if (existing) {
            throw new BadRequestException(`Page with slug "${data.slug}" already exists`);
        }

        return await this.prisma.content_pages.create({
            data: {
                slug: data.slug,
                title: data.title,
                metaTitle: data.metaTitle,
                metaDesc: data.metaDesc,
                ogImage: data.ogImage,
                createdBy: data.userId,
                updatedBy: data.userId,
            },
        });
    }

    async updatePage(
        id: string,
        data: {
            title?: string;
            metaTitle?: string;
            metaDesc?: string;
            ogImage?: string;
            userId: string;
        },
    ) {
        return await this.prisma.content_pages.update({
            where: { id },
            data: {
                ...data,
                updatedBy: data.userId,
            },
        });
    }

    async deletePage(id: string) {
        return await this.prisma.content_pages.delete({
            where: { id },
        });
    }

    async publishPage(id: string, publish: boolean, userId: string) {
        return await this.prisma.content_pages.update({
            where: { id },
            data: {
                isPublished: publish,
                publishedAt: publish ? new Date() : null,
                updatedBy: userId,
            },
        });
    }

    // ========================================
    // Sections
    // ========================================

    async addSection(data: {
        pageId: string;
        type: string;
        title?: string;
        order?: number;
        settings?: any;
    }) {
        // Get max order for this page
        const maxOrder = await this.prisma.content_sections.aggregate({
            where: { pageId: data.pageId },
            _max: { order: true },
        });

        const order = data.order ?? (maxOrder._max.order ?? 0) + 1;

        return await this.prisma.content_sections.create({
            data: {
                pageId: data.pageId,
                type: data.type,
                title: data.title,
                order,
                settings: data.settings || {},
            },
        });
    }

    async updateSection(
        id: string,
        data: {
            title?: string;
            settings?: any;
            isVisible?: boolean;
        },
    ) {
        return await this.prisma.content_sections.update({
            where: { id },
            data,
        });
    }

    async deleteSection(id: string) {
        return await this.prisma.content_sections.delete({
            where: { id },
        });
    }

    async reorderSections(pageId: string, sectionIds: string[]) {
        // Update order for each section
        const updates = sectionIds.map((id, index) =>
            this.prisma.content_sections.update({
                where: { id },
                data: { order: index + 1 },
            }),
        );

        await this.prisma.$transaction(updates);

        return { success: true, message: 'Sections reordered successfully' };
    }

    // ========================================
    // Media Library
    // ========================================

    async uploadMedia(data: {
        filename: string;
        originalName: string;
        url: string;
        mimeType: string;
        size: number;
        width?: number;
        height?: number;
        alt?: string;
        folder?: string;
        userId: string;
    }) {
        return await this.prisma.media_assets.create({
            data: {
                filename: data.filename,
                originalName: data.originalName,
                url: data.url,
                mimeType: data.mimeType,
                size: data.size,
                width: data.width,
                height: data.height,
                alt: data.alt,
                folder: data.folder || 'general',
                uploadedBy: data.userId,
            },
        });
    }

    async getMediaLibrary(folder?: string) {
        return await this.prisma.media_assets.findMany({
            where: folder ? { folder } : {},
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteMedia(id: string) {
        return await this.prisma.media_assets.delete({
            where: { id },
        });
    }
}
