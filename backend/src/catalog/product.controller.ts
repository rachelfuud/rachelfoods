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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/products')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    // ============================================
    // ADMIN/STORE OWNER ENDPOINTS
    // ============================================

    @Post()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.create')
    create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
        return this.productService.create(createProductDto, user.id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.update')
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productService.update(id, updateProductDto);
    }

    @Patch(':id/disable')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.disable')
    disable(@Param('id') id: string) {
        return this.productService.disable(id);
    }

    @Patch(':id/enable')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.update')
    enable(@Param('id') id: string) {
        return this.productService.enable(id);
    }

    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.update')
    publishProduct(@Param('id') id: string) {
        return this.productService.publishProduct(id);
    }

    @Get(':id/diagnostics')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.view')
    getVisibilityDiagnostics(@Param('id') id: string) {
        return this.productService.getProductVisibilityDiagnostics(id);
    }

    @Patch(':id/archive')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.delete')
    archive(@Param('id') id: string) {
        return this.productService.archive(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.delete')
    remove(@Param('id') id: string) {
        return this.productService.remove(id);
    }

    @Patch(':id/stock')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.update')
    updateStock(@Param('id') id: string, @Body('quantity') quantity: number) {
        return this.productService.updateStock(id, quantity);
    }

    @Post(':id/images')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.update')
    addImages(@Param('id') id: string, @Body('imageUrls') imageUrls: string[]) {
        return this.productService.addImages(id, imageUrls);
    }

    @Delete(':id/images')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions('product.update')
    removeImage(@Param('id') id: string, @Body('imageUrl') imageUrl: string) {
        return this.productService.removeImage(id, imageUrl);
    }

    // ============================================
    // BUYER ENDPOINTS (Read-only)
    // ============================================

    @Get()
    findAll(
        @Query('includeDisabled', new ParseBoolPipe({ optional: true })) includeDisabled?: boolean,
        @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived?: boolean,
    ) {
        // Buyers only see active products
        // Admin/Store Owner can see disabled/archived products with query params
        return this.productService.findAll(includeDisabled ?? false, includeArchived ?? false);
    }

    @Get('featured')
    findFeatured() {
        return this.productService.findFeatured();
    }

    @Get('popular')
    findPopular(@Query('limit') limit?: string) {
        const limitNum = limit ? parseInt(limit, 10) : 6;
        return this.productService.findPopular(limitNum);
    }

    @Get('search')
    search(
        @Query('q') query: string,
        @Query('includeDisabled', new ParseBoolPipe({ optional: true })) includeDisabled?: boolean,
    ) {
        return this.productService.search(query, includeDisabled ?? false);
    }

    @Get('category/:categoryId')
    findByCategory(
        @Param('categoryId') categoryId: string,
        @Query('includeDisabled', new ParseBoolPipe({ optional: true })) includeDisabled?: boolean,
    ) {
        return this.productService.findByCategory(categoryId, includeDisabled ?? false);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productService.findOne(id);
    }

    @Get('slug/:slug')
    findBySlug(@Param('slug') slug: string) {
        return this.productService.findBySlug(slug);
    }
}
