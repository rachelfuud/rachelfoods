import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
    private readonly saltRounds = 10;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    /**
     * Register a new user as a Buyer
     * Only buyers can self-register
     */
    async register(registerDto: RegisterDto): Promise<AuthResponse> {
        const { email, password, firstName, lastName, phone } = registerDto;

        // Validate email format
        if (!this.isValidEmail(email)) {
            throw new BadRequestException('Invalid email format');
        }

        // Validate password strength (minimum 8 characters)
        if (password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        // Check if user already exists
        const existingUser = await this.prisma.users.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await this.hashPassword(password);

        // Get the Buyer role
        const buyerRole = await this.prisma.roles.findUnique({
            where: { slug: 'buyer' },
        });

        if (!buyerRole) {
            throw new BadRequestException('Buyer role not found. Please run seed script.');
        }

        // Create user with Buyer role
        const user = await this.prisma.users.create({
            data: {
                id: crypto.randomUUID(),
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                status: 'ACTIVE',
                updatedAt: new Date(),
                user_roles: {
                    create: {
                        id: crypto.randomUUID(),
                        roleId: buyerRole.id,
                    },
                },
            },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
        });

        // Generate JWT token
        const accessToken = await this.generateToken(user.id, user.email);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                roles: user.user_roles.map((ur) => ({
                    id: ur.roles.id,
                    name: ur.roles.name,
                    slug: ur.roles.slug,
                })),
            },
        };
    }

    /**
     * Login user with email and password
     */
    async login(loginDto: LoginDto): Promise<AuthResponse> {
        const { email, password } = loginDto;

        // Find user by email with roles
        const user = await this.prisma.users.findUnique({
            where: { email },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException('Account is not active');
        }

        // Verify password
        const isPasswordValid = await this.verifyPassword(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const accessToken = await this.generateToken(user.id, user.email);
        const refreshToken = await this.generateRefreshToken();

        // Update user with refresh token and last login
        await this.prisma.users.update({
            where: { id: user.id },
            data: {
                lastLogin: new Date(),
                refreshToken,
                refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
        });

        // Extract roles from user_roles relation
        const roles = user.user_roles?.map((ur) => ({
            id: ur.roles.id,
            name: ur.roles.name,
            slug: ur.roles.slug,
        })) || [];

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                roles: roles,
            },
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
        // Find user by refresh token
        const user = await this.prisma.users.findFirst({
            where: {
                refreshToken,
                refreshTokenExpiresAt: { gte: new Date() },
                status: 'ACTIVE',
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Generate new access token
        const accessToken = await this.generateToken(user.id, user.email);

        // Optionally rotate refresh token for added security
        const newRefreshToken = await this.generateRefreshToken();
        await this.prisma.users.update({
            where: { id: user.id },
            data: {
                refreshToken: newRefreshToken,
                refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        return {
            accessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
            },
        };
    }

    /**
     * Logout user by invalidating refresh token
     */
    async logout(userId: string): Promise<void> {
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                refreshToken: null,
                refreshTokenExpiresAt: null,
            },
        });
    }

    /**
     * Validate user by ID (used by JWT strategy)
     */
    async validateUser(userId: string) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
        });

        if (!user || user.status !== 'ACTIVE') {
            return null;
        }

        return user;
    }

    /**
     * Hash password using bcrypt
     */
    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * Verify password against hash
     */
    private async verifyPassword(
        password: string,
        hash: string,
    ): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT access token
     */
    private async generateToken(userId: string, email: string): Promise<string> {
        const payload: JwtPayload = {
            sub: userId,
            email,
        };

        return this.jwtService.sign(payload);
    }

    /**
     * Generate refresh token (random string)
     */
    private async generateRefreshToken(): Promise<string> {
        return crypto.randomUUID() + '-' + crypto.randomUUID();
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
