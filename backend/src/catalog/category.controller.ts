import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    ParseBoolPipe,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    // ============================================
    // ADMIN/STORE OWNER ENDPOINTS
    // ============================================

    @Post()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('category.create')
    create(@Body() createCategoryDto: CreateCategoryDto) {
        return this.categoryService.create(createCategoryDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('category.update')
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.categoryService.update(id, updateCategoryDto);
    }

    @Patch(':id/disable')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('category.update')
    disable(@Param('id') id: string) {
        return this.categoryService.disable(id);
    }

    @Patch(':id/enable')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('category.update')
    enable(@Param('id') id: string) {
        return this.categoryService.enable(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('category.delete')
    remove(@Param('id') id: string) {
        return this.categoryService.remove(id);
    }

    // ============================================
    // BUYER ENDPOINTS (Read-only)
    // ============================================

    @Get()
    findAll(@Query('includeDisabled', new ParseBoolPipe({ optional: true })) includeDisabled?: boolean) {
        // Buyers only see active categories
        // Admin/Store Owner can see disabled categories with query param
        return this.categoryService.findAll(includeDisabled ?? false);
    }

    @Get('hierarchy')
    getHierarchy() {
        return this.categoryService.getHierarchy();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoryService.findOne(id);
    }

    @Get('slug/:slug')
    findBySlug(@Param('slug') slug: string) {
        return this.categoryService.findBySlug(slug);
    }
}
