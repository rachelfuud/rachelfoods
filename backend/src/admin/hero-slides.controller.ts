import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HeroSlidesService, CreateHeroSlideDto, UpdateHeroSlideDto } from './hero-slides.service';

@Controller('api/admin/hero-slides')
export class HeroSlidesController {
    constructor(private readonly heroSlidesService: HeroSlidesService) { }

    // Public endpoint for fetching active slides
    @Get('public')
    async getPublicSlides() {
        return this.heroSlidesService.findAll(true);
    }

    // Admin endpoints - require authentication
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'STAFF')
    async getAll(@Query('activeOnly') activeOnly?: string) {
        return this.heroSlidesService.findAll(activeOnly === 'true');
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'STAFF')
    async getOne(@Param('id') id: string) {
        return this.heroSlidesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async create(@Body() data: CreateHeroSlideDto, @Request() req) {
        return this.heroSlidesService.create(data, req.user?.userId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async update(
        @Param('id') id: string,
        @Body() data: UpdateHeroSlideDto,
        @Request() req,
    ) {
        return this.heroSlidesService.update(id, data, req.user?.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async delete(@Param('id') id: string, @Request() req) {
        return this.heroSlidesService.delete(id, req.user?.userId);
    }

    @Post('reorder')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async reorder(@Body() body: { slideIds: string[] }, @Request() req) {
        return this.heroSlidesService.reorder(body.slideIds, req.user?.userId);
    }
}
