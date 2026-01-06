import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Product Controller
 * Demonstrates RBAC authorization with permission checks
 * 
 * Permission Requirements (from ROLE_PERMISSION_MATRIX.md):
 * - product.create: Platform Admin, Store Owner
 * - product.update: Platform Admin, Store Owner
 * - product.delete: Platform Admin, Store Owner
 * - product.view: All authenticated users
 * - product.disable: Platform Admin, Store Owner
 */
@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Apply both guards to all routes
export class ProductsController {
    /**
     * Get all products
     * Requires: product.view permission
     * Accessible by: All authenticated users
     */
    @Get()
    @Permissions('product.view')
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async findAll(@CurrentUser() user: any) {
        return {
            message: 'List all products',
            user: {
                id: user.id,
                email: user.email,
                roles: user.userRoles.map((ur) => ur.role.slug),
            },
            // TODO: Implement actual product listing
            products: [],
        };
    }

    /**
     * Get a single product
     * Requires: product.view permission
     * Accessible by: All authenticated users
     */
    @Get(':id')
    @Permissions('product.view')
    @ApiOperation({ summary: 'Get a single product by ID' })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return {
            message: `Get product ${id}`,
            user: {
                id: user.id,
                email: user.email,
            },
            // TODO: Implement actual product retrieval
            product: null,
        };
    }

    /**
     * Create a new product
     * Requires: product.create permission
     * Accessible by: Platform Admin, Store Owner
     */
    @Post()
    @Permissions('product.create')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
        return {
            message: 'Product created successfully',
            createdBy: {
                id: user.id,
                email: user.email,
                roles: user.userRoles.map((ur) => ur.role.slug),
            },
            // TODO: Implement actual product creation
            product: createProductDto,
        };
    }

    /**
     * Update a product
     * Requires: product.update permission
     * Accessible by: Platform Admin, Store Owner
     */
    @Put(':id')
    @Permissions('product.update')
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @CurrentUser() user: any,
    ) {
        return {
            message: `Product ${id} updated successfully`,
            updatedBy: {
                id: user.id,
                email: user.email,
            },
            // TODO: Implement actual product update
            product: updateProductDto,
        };
    }

    /**
     * Disable a product temporarily
     * Requires: product.disable permission
     * Accessible by: Platform Admin, Store Owner
     */
    @Put(':id/disable')
    @Permissions('product.disable')
    async disable(@Param('id') id: string, @CurrentUser() user: any) {
        return {
            message: `Product ${id} disabled`,
            disabledBy: {
                id: user.id,
                email: user.email,
            },
        };
    }

    /**
     * Delete a product
     * Requires: product.delete permission
     * Accessible by: Platform Admin, Store Owner
     */
    @Delete(':id')
    @Permissions('product.delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        // TODO: Implement actual product deletion (soft delete recommended)
        return;
    }

    /**
     * Example: Multiple permissions required
     * User must have BOTH permissions to access this endpoint
     */
    @Post(':id/publish')
    @Permissions('product.update', 'product.view')
    async publish(@Param('id') id: string, @CurrentUser() user: any) {
        return {
            message: `Product ${id} published`,
            publishedBy: user.email,
        };
    }
}
