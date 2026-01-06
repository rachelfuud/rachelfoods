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
            },
        };
    }

    /**
     * Login user with email and password
     */
    async login(loginDto: LoginDto): Promise<AuthResponse> {
        const { email, password } = loginDto;

        // Find user by email
        const user = await this.prisma.users.findUnique({
            where: { email },
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

        // Update last login
        await this.prisma.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
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
            },
        };
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
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
