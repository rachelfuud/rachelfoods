import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminProductService } from './admin-product.service';
import {
    CreateProductDto,
    UpdateProductDto,
    CreateVariantDto,
    UpdateVariantDto,
} from './dto';

@Controller('api/admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF', 'PLATFORM_ADMIN')
export class AdminProductController {
    constructor(private readonly adminProductService: AdminProductService) { }

    @Get()
    async getAllProducts(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('search') search?: string,
        @Query('categoryId') categoryId?: string,
        @Query('includeDisabled') includeDisabled?: string,
    ) {
        return this.adminProductService.findAll({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            search,
            categoryId,
            includeDisabled: includeDisabled === 'true',
        });
    }

    @Get(':id')
    async getProduct(@Param('id') id: string) {
        return this.adminProductService.findOne(id);
    }

    @Post()
    async createProduct(@Body() dto: CreateProductDto) {
        return this.adminProductService.create(dto);
    }

    @Put(':id')
    async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.adminProductService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    async deleteProduct(@Param('id') id: string) {
        return this.adminProductService.delete(id);
    }

    // Variant Management
    @Get(':productId/variants')
    async getProductVariants(@Param('productId') productId: string) {
        return this.adminProductService.findVariants(productId);
    }

    @Post(':productId/variants')
    async createVariant(
        @Param('productId') productId: string,
        @Body() dto: CreateVariantDto,
    ) {
        return this.adminProductService.createVariant(productId, dto);
    }

    @Put(':productId/variants/:variantId')
    async updateVariant(
        @Param('productId') productId: string,
        @Param('variantId') variantId: string,
        @Body() dto: UpdateVariantDto,
    ) {
        return this.adminProductService.updateVariant(productId, variantId, dto);
    }

    @Delete(':productId/variants/:variantId')
    @Roles('ADMIN')
    async deleteVariant(
        @Param('productId') productId: string,
        @Param('variantId') variantId: string,
    ) {
        return this.adminProductService.deleteVariant(productId, variantId);
    }
}
