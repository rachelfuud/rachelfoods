import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThemeConfig, UpdateThemeDto } from './theme.types';

@Injectable()
export class ThemeService {
    private readonly logger = new Logger(ThemeService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get the active theme configuration
     * Returns the first active theme or creates a default if none exists
     */
    async getActiveTheme(): Promise<ThemeConfig> {
        let theme = await this.prisma.theme_config.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        // Create default theme if none exists
        if (!theme) {
            this.logger.log('No active theme found, creating default theme');
            theme = await this.prisma.theme_config.create({
                data: {
                    primaryColor: '#2563eb',   // blue-600
                    secondaryColor: '#7c3aed', // violet-600
                    accentColor: '#f59e0b',    // amber-500
                    defaultMode: 'light',
                    isActive: true,
                },
            });
        }

        return theme as ThemeConfig;
    }

    /**
     * Update the active theme configuration
     * PLATFORM_ADMIN only
     */
    async updateActiveTheme(updateDto: UpdateThemeDto): Promise<ThemeConfig> {
        const activeTheme = await this.getActiveTheme();

        const updatedTheme = await this.prisma.theme_config.update({
            where: { id: activeTheme.id },
            data: {
                ...updateDto,
                updatedAt: new Date(),
            },
        });

        this.logger.log(`Theme updated: ${updatedTheme.id}`);
        return updatedTheme as ThemeConfig;
    }

    /**
     * Create a new theme and set it as active
     * Deactivates all other themes
     */
    async createTheme(data: UpdateThemeDto): Promise<ThemeConfig> {
        // Deactivate all existing themes
        await this.prisma.theme_config.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // Create new active theme
        const newTheme = await this.prisma.theme_config.create({
            data: {
                primaryColor: data.primaryColor || '#2563eb',
                secondaryColor: data.secondaryColor || '#7c3aed',
                accentColor: data.accentColor || '#f59e0b',
                defaultMode: data.defaultMode || 'light',
                isActive: true,
            },
        });

        this.logger.log(`New theme created: ${newTheme.id}`);
        return newTheme as ThemeConfig;
    }
}
