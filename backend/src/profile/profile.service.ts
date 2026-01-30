import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) { }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        // Check if email is being changed and is already taken
        if (dto.email) {
            const existingUser = await this.prisma.users.findFirst({
                where: {
                    email: dto.email,
                    id: { not: userId },
                },
            });

            if (existingUser) {
                throw new ConflictException('Email is already in use');
            }
        }

        // Handle password change
        if (dto.newPassword) {
            if (!dto.currentPassword) {
                throw new BadRequestException('Current password is required to set a new password');
            }

            // Verify current password
            const user = await this.prisma.users.findUnique({
                where: { id: userId },
            });

            const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
            if (!isPasswordValid) {
                throw new BadRequestException('Current password is incorrect');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

            // Update with new password
            const updatedUser = await this.prisma.users.update({
                where: { id: userId },
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    phone: dto.phone,
                    password: hashedPassword,
                },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });

            // Exclude password from response
            const { password, ...result } = updatedUser;
            return {
                ...result,
                roles: result.userRoles.map((ur) => ({
                    id: ur.role.id,
                    name: ur.role.name,
                    slug: ur.role.slug,
                })),
            };
        }

        // Update without password change
        const updatedUser = await this.prisma.users.update({
            where: { id: userId },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
            },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        // Exclude password from response
        const { password, ...result } = updatedUser;
        return {
            ...result,
            roles: result.userRoles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                slug: ur.role.slug,
            })),
        };
    }
}
