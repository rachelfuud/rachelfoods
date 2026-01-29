import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { runCmsMigration } from '../../scripts/auto-migrate-cms';

@Controller('admin/migrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MigrationsController {
    @Post('run-cms')
    @HttpCode(HttpStatus.OK)
    async runCmsMigration() {
        try {
            await runCmsMigration();
            return {
                success: true,
                message: 'CMS migration completed successfully',
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'CMS migration failed',
                error: error.message,
            };
        }
    }
}
