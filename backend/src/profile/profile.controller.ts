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

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            status: user.status,
            roles: user.userRoles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                slug: ur.role.slug,
            })),
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
