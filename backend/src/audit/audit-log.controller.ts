import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditLogService } from './audit-log.service';

@Controller('api/admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
export class AuditLogController {
    constructor(private auditLogService: AuditLogService) { }

    @Get()
    async getAuditLogs(
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('entity') entity?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditLogService.getLogs({
            userId,
            action,
            entity,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
        });
    }

    @Get('entity-history')
    async getEntityHistory(
        @Query('entity') entity: string,
        @Query('entityId') entityId: string,
    ) {
        if (!entity || !entityId) {
            throw new Error('Entity and entityId are required');
        }
        return this.auditLogService.getEntityHistory(entity, entityId);
    }
}
