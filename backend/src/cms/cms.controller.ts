import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CmsService } from './cms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api')
export class CmsController {
    constructor(private cmsService: CmsService) { }

    // ========================================
    // Public Endpoints (for frontend)
    // ========================================

    @Get('cms/config/:type')
    async getConfig(@Param('type') type: 'header' | 'footer' | 'announcement') {
        return await this.cmsService.getSiteConfig(type);
    }

    @Get('cms/pages/:slug')
    async getPublicPage(@Param('slug') slug: string) {
        return await this.cmsService.getPage(slug, false);
    }

    // ========================================
    // Admin Endpoints (protected)
    // ========================================

    // Site Config Management
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Get('admin/cms/config/:type')
    async getAdminConfig(@Param('type') type: 'header' | 'footer' | 'announcement') {
        return await this.cmsService.getSiteConfig(type);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Put('admin/cms/config/:type')
    async updateConfig(
        @Param('type') type: 'header' | 'footer' | 'announcement',
        @Body('config') config: any,
        @Request() req,
    ) {
        return await this.cmsService.updateSiteConfig(type, config, req.user.id);
    }

    // Page Management
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Get('admin/cms/pages')
    async getAdminPages(@Query('includeUnpublished') includeUnpublished?: string) {
        return await this.cmsService.getPages(includeUnpublished === 'true');
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Get('admin/cms/pages/:slug')
    async getAdminPage(@Param('slug') slug: string) {
        return await this.cmsService.getPage(slug, true);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Post('admin/cms/pages')
    async createPage(@Body() data: any, @Request() req) {
        return await this.cmsService.createPage({
            ...data,
            userId: req.user.id,
        });
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Put('admin/cms/pages/:id')
    async updatePage(@Param('id') id: string, @Body() data: any, @Request() req) {
        return await this.cmsService.updatePage(id, {
            ...data,
            userId: req.user.id,
        });
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Delete('admin/cms/pages/:id')
    async deletePage(@Param('id') id: string) {
        return await this.cmsService.deletePage(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Post('admin/cms/pages/:id/publish')
    async publishPage(
        @Param('id') id: string,
        @Body('publish') publish: boolean,
        @Request() req,
    ) {
        return await this.cmsService.publishPage(id, publish, req.user.id);
    }

    // Section Management
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Post('admin/cms/sections')
    async addSection(@Body() data: any) {
        return await this.cmsService.addSection(data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Put('admin/cms/sections/:id')
    async updateSection(@Param('id') id: string, @Body() data: any) {
        return await this.cmsService.updateSection(id, data);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Delete('admin/cms/sections/:id')
    async deleteSection(@Param('id') id: string) {
        return await this.cmsService.deleteSection(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Post('admin/cms/sections/reorder')
    async reorderSections(@Body() data: { pageId: string; sectionIds: string[] }) {
        return await this.cmsService.reorderSections(data.pageId, data.sectionIds);
    }

    // Media Library
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Get('admin/cms/media')
    async getMediaLibrary(@Query('folder') folder?: string) {
        return await this.cmsService.getMediaLibrary(folder);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Post('admin/cms/media')
    async uploadMedia(@Body() data: any, @Request() req) {
        return await this.cmsService.uploadMedia({
            ...data,
            userId: req.user.id,
        });
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('PLATFORM_ADMIN')
    @Delete('admin/cms/media/:id')
    async deleteMedia(@Param('id') id: string) {
        return await this.cmsService.deleteMedia(id);
    }
}
