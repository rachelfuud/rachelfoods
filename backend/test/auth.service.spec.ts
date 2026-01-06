import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Unit Tests for AuthService
 * 
 * Test Scope:
 * - User authentication (login)
 * - Token generation
 * - User validation
 * - RBAC verification
 */
describe('AuthService', () => {
    let service: AuthService;
    let jwtService: JwtService;
    let prisma: PrismaService;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: '$2b$10$mockHashedPassword',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        user_roles: [
            {
                roles: {
                    slug: 'buyer',
                    name: 'Buyer',
                },
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                        signAsync: jest.fn(),
                        verify: jest.fn(),
                    },
                },
                {
                    provide: PrismaService,
                    useValue: {
                        users: {
                            findUnique: jest.fn(),
                            create: jest.fn(),
                            update: jest.fn(),
                        },
                        roles: {
                            findUnique: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get<JwtService>(JwtService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user when user exists and is active', async () => {
            jest.spyOn(prisma.users, 'findUnique').mockResolvedValue(mockUser as any);

            const result = await service.validateUser('user-123');

            expect(result).toBeDefined();
            expect(result.email).toBe(mockUser.email);
        });

        it('should return null when user is not found', async () => {
            jest.spyOn(prisma.users, 'findUnique').mockResolvedValue(null);

            const result = await service.validateUser('nonexistent-id');

            expect(result).toBeNull();
        });

        it('should return null when user is inactive', async () => {
            const inactiveUser = { ...mockUser, status: 'INACTIVE' };
            jest.spyOn(prisma.users, 'findUnique').mockResolvedValue(inactiveUser as any);

            const result = await service.validateUser('user-123');

            expect(result).toBeNull();
        });
    });

    describe('RBAC verification', () => {
        it('should verify user has PLATFORM_ADMIN role', async () => {
            const adminUser = {
                ...mockUser,
                user_roles: [
                    {
                        roles: {
                            slug: 'platform_admin',
                            name: 'Platform Admin',
                        },
                    },
                ],
            };
            jest.spyOn(prisma.users, 'findUnique').mockResolvedValue(adminUser as any);

            const result = await service.validateUser('user-123');

            expect(result).toBeDefined();
            expect(result.user_roles[0].roles.slug).toBe('platform_admin');
        });

        it('should verify user has CUSTOMER role', async () => {
            jest.spyOn(prisma.users, 'findUnique').mockResolvedValue(mockUser as any);

            const result = await service.validateUser('user-123');

            expect(result).toBeDefined();
            expect(result.user_roles[0].roles.slug).toBe('buyer');
        });
    });
});
