import {
    Controller,
    Post,
    Delete,
    Put,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductMediaService } from './product-media.service';
import { ProductImageDto, ProductVideoDto } from './dto/update-product.dto';

@Controller('api/admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductMediaController {
    constructor(private readonly productMediaService: ProductMediaService) { }

    // ========================================
    // Product Images
    // ========================================

    @Post(':productId/images')
    @Roles('ADMIN', 'STAFF')
    async addProductImages(
        @Param('productId') productId: string,
        @Body() images: ProductImageDto[],
    ) {
        return await this.productMediaService.addProductImages(productId, images);
    }

    @Put(':productId/images/:imageId')
    @Roles('ADMIN', 'STAFF')
    async updateProductImage(
        @Param('productId') productId: string,
        @Param('imageId') imageId: string,
        @Body() image: ProductImageDto,
    ) {
        return await this.productMediaService.updateProductImage(productId, imageId, image);
    }

    @Delete(':productId/images/:imageId')
    @Roles('ADMIN', 'STAFF')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteProductImage(
        @Param('productId') productId: string,
        @Param('imageId') imageId: string,
    ) {
        await this.productMediaService.deleteProductImage(productId, imageId);
    }

    @Put(':productId/images/reorder')
    @Roles('ADMIN', 'STAFF')
    async reorderProductImages(
        @Param('productId') productId: string,
        @Body() imageIds: string[],
    ) {
        return await this.productMediaService.reorderProductImages(productId, imageIds);
    }

    // ========================================
    // Product Videos
    // ========================================

    @Post(':productId/videos')
    @Roles('ADMIN', 'STAFF')
    async addProductVideos(
        @Param('productId') productId: string,
        @Body() videos: ProductVideoDto[],
    ) {
        return await this.productMediaService.addProductVideos(productId, videos);
    }

    @Put(':productId/videos/:videoId')
    @Roles('ADMIN', 'STAFF')
    async updateProductVideo(
        @Param('productId') productId: string,
        @Param('videoId') videoId: string,
        @Body() video: ProductVideoDto,
    ) {
        return await this.productMediaService.updateProductVideo(productId, videoId, video);
    }

    @Delete(':productId/videos/:videoId')
    @Roles('ADMIN', 'STAFF')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteProductVideo(
        @Param('productId') productId: string,
        @Param('videoId') videoId: string,
    ) {
        await this.productMediaService.deleteProductVideo(productId, videoId);
    }

    @Put(':productId/videos/reorder')
    @Roles('ADMIN', 'STAFF')
    async reorderProductVideos(
        @Param('productId') productId: string,
        @Body() videoIds: string[],
    ) {
        return await this.productMediaService.reorderProductVideos(productId, videoIds);
    }
}
