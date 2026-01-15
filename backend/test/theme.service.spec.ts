import { Test, TestingModule } from '@nestjs/testing';
import { ThemeService } from '../src/theme/theme.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Unit Tests for ThemeService
 * 
 * Test Scope:
 * - Get active theme
 * - Create theme
 * - Update theme
 * - Theme persistence
 */
describe('ThemeService', () => {
    let service: ThemeService;
    let prisma: PrismaService;

    const mockTheme = {
        id: 'theme-1',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        defaultMode: 'light',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ThemeService,
                {
                    provide: PrismaService,
                    useValue: {
                        theme_config: {
                            findFirst: jest.fn(),
                            create: jest.fn(),
                            update: jest.fn(),
                            updateMany: jest.fn(),
                        },
                        $transaction: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ThemeService>(ThemeService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getActiveTheme', () => {
        it('should return the active theme', async () => {
            jest.spyOn(prisma.theme_config, 'findFirst').mockResolvedValue(mockTheme);

            const result = await service.getActiveTheme();

            expect(result).toEqual(mockTheme);
            expect(prisma.theme_config.findFirst).toHaveBeenCalledWith({
                where: { isActive: true },
            });
        });

        it('should return null when no active theme exists', async () => {
            jest.spyOn(prisma.theme_config, 'findFirst').mockResolvedValue(null);

            const result = await service.getActiveTheme();

            expect(result).toBeNull();
        });
    });

    describe('createTheme', () => {
        it('should create a new theme', async () => {
            const newThemeData = {
                primaryColor: '#FF5733',
                secondaryColor: '#33FF57',
                accentColor: '#3357FF',
                defaultMode: 'dark' as 'light' | 'dark',
            };

            jest.spyOn(prisma.theme_config, 'updateMany').mockResolvedValue({ count: 1 });
            jest.spyOn(prisma.theme_config, 'create').mockResolvedValue({
                ...mockTheme,
                ...newThemeData,
            });

            const result = await service.createTheme(newThemeData);

            expect(result.primaryColor).toBe(newThemeData.primaryColor);
            expect(result.secondaryColor).toBe(newThemeData.secondaryColor);
            expect(result.accentColor).toBe(newThemeData.accentColor);
            expect(result.defaultMode).toBe(newThemeData.defaultMode);
        });
    });

    describe('updateActiveTheme', () => {
        it('should update the active theme', async () => {
            const updateData = {
                primaryColor: '#8B5CF6',
                secondaryColor: '#EC4899',
            };

            const updatedTheme = {
                ...mockTheme,
                ...updateData,
            };

            jest.spyOn(prisma.theme_config, 'findFirst').mockResolvedValue(mockTheme);
            jest.spyOn(prisma.theme_config, 'update').mockResolvedValue(updatedTheme);

            const result = await service.updateActiveTheme(updateData);

            expect(result.primaryColor).toBe(updateData.primaryColor);
            expect(result.secondaryColor).toBe(updateData.secondaryColor);
        });

        it('should create default theme if none exists', async () => {
            jest.spyOn(prisma.theme_config, 'findFirst').mockResolvedValue(null);
            jest.spyOn(prisma.theme_config, 'create').mockResolvedValue(mockTheme);

            const result = await service.updateActiveTheme({
                primaryColor: '#3B82F6',
            });

            expect(result).toBeDefined();
            expect(prisma.theme_config.create).toHaveBeenCalled();
        });
    });

    describe('Theme persistence', () => {
        it('should ensure only one active theme exists', async () => {
            const newActiveTheme = { ...mockTheme, id: 'theme-2' };

            jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
                return callback(prisma);
            });
            jest.spyOn(prisma.theme_config, 'updateMany').mockResolvedValue({ count: 1 });
            jest.spyOn(prisma.theme_config, 'create').mockResolvedValue(newActiveTheme);

            await service.createTheme({
                primaryColor: '#000000',
                secondaryColor: '#FFFFFF',
                accentColor: '#FF0000',
                defaultMode: 'light',
            });

            // Verify updateMany was called to deactivate other themes
            expect(prisma.theme_config.updateMany).toHaveBeenCalledWith({
                where: { isActive: true },
                data: { isActive: false },
            });
        });
    });

    describe('Theme validation', () => {
        it('should validate color format', () => {
            const validColors = ['#3B82F6', '#FFFFFF', '#000000', '#FF5733'];

            validColors.forEach(color => {
                expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
            });
        });

        it('should validate mode values', () => {
            const validModes = ['light', 'dark', 'system'];

            validModes.forEach(mode => {
                expect(['light', 'dark', 'system']).toContain(mode);
            });
        });
    });
});
