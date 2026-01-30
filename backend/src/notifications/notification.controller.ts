import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Admin Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    /**
     * Get all admin notifications
     * GET /admin/notifications
     */
    @Get()
    @Permissions('admin.view')
    @ApiOperation({ summary: 'Get all admin notifications' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved' })
    async getNotifications(
        @Query('isRead') isRead?: string,
        @Query('type') type?: string,
        @Query('priority') priority?: string,
        @Query('limit') limit?: string,
    ) {
        return this.notificationService.getAdminNotifications({
            isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
            type,
            priority,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    /**
     * Get unread notification count
     * GET /admin/notifications/unread/count
     */
    @Get('unread/count')
    @Permissions('admin.view')
    @ApiOperation({ summary: 'Get unread notification count' })
    @ApiResponse({ status: 200, description: 'Count retrieved' })
    async getUnreadCount() {
        const count = await this.notificationService.getUnreadCount();
        return { count };
    }

    /**
     * Mark notification as read
     * POST /admin/notifications/:id/read
     */
    @Post(':id/read')
    @Permissions('admin.update')
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(@Param('id') id: string) {
        return this.notificationService.markAsRead(id);
    }

    /**
     * Mark all notifications as read
     * POST /admin/notifications/read-all
     */
    @Post('read-all')
    @Permissions('admin.update')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read' })
    async markAllAsRead() {
        return this.notificationService.markAllAsRead();
    }

    /**
     * Delete notification
     * DELETE /admin/notifications/:id
     */
    @Delete(':id')
    @Permissions('admin.delete')
    @ApiOperation({ summary: 'Delete notification' })
    @ApiResponse({ status: 200, description: 'Notification deleted' })
    async deleteNotification(@Param('id') id: string) {
        return this.notificationService.deleteNotification(id);
    }
}
