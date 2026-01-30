import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    /**
     * Get current user profile
     * Requires JWT authentication
     * GET /api/profile/me
     */
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req) {
        // User is attached to request by JwtStrategy
        const user = req.user;

        // Build roles array from user_roles relation
        let roles = [];
        if (user.user_roles && Array.isArray(user.user_roles)) {
            roles = user.user_roles.map((ur) => ({
                id: ur.roles?.id || ur.roleId,
                name: ur.roles?.name || 'Unknown',
                slug: ur.roles?.slug || 'unknown',
            }));
        }

        // If no user_roles but has simple role field, add it
        if (roles.length === 0 && user.role) {
            roles.push({
                id: `role_${user.role.toLowerCase()}`,
                name: user.role,
                slug: user.role.toLowerCase(),
            });
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            status: user.status,
            role: user.role, // Simple role from users table
            roles: roles,
        };
    }

    /**
     * Update current user profile
     * Requires JWT authentication
     * PATCH /api/profile
     */
    @Patch()
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateProfile(req.user.id, dto);
    }
}
