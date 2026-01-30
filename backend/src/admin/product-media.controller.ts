import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ProductMediaService, AddProductImageDto, AddProductVideoDto } from './product-media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/admin/products/:productId/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class ProductMediaController {
    constructor(private readonly mediaService: ProductMediaService) { }

    // ============================================
    // IMAGES
    // ============================================

    @Get('images')
    getImages(@Param('productId') productId: string) {
        return this.mediaService.getImages(productId);
    }

    @Post('images')
    addImages(
        @Param('productId') productId: string,
        @Body() data: { images: AddProductImageDto[] }
    ) {
        return this.mediaService.addImages(productId, data.images);
    }

    @Put('images/:imageId')
    updateImage(
        @Param('imageId') imageId: string,
        @Body() data: Partial<AddProductImageDto>
    ) {
        return this.mediaService.updateImage(imageId, data);
    }

    @Delete('images/:imageId')
    deleteImage(@Param('imageId') imageId: string) {
        return this.mediaService.deleteImage(imageId);
    }

    @Post('images/reorder')
    reorderImages(
        @Param('productId') productId: string,
        @Body() data: { imageIds: string[] }
    ) {
        return this.mediaService.reorderImages(productId, data.imageIds);
    }

    // ============================================
    // VIDEOS
    // ============================================

    @Get('videos')
    getVideos(@Param('productId') productId: string) {
        return this.mediaService.getVideos(productId);
    }

    @Post('videos')
    addVideos(
        @Param('productId') productId: string,
        @Body() data: { videos: AddProductVideoDto[] }
    ) {
        return this.mediaService.addVideos(productId, data.videos);
    }

    @Put('videos/:videoId')
    updateVideo(
        @Param('videoId') videoId: string,
        @Body() data: Partial<AddProductVideoDto>
    ) {
        return this.mediaService.updateVideo(videoId, data);
    }

    @Delete('videos/:videoId')
    deleteVideo(@Param('videoId') videoId: string) {
        return this.mediaService.deleteVideo(videoId);
    }

    @Post('videos/reorder')
    reorderVideos(
        @Param('productId') productId: string,
        @Body() data: { videoIds: string[] }
    ) {
        return this.mediaService.reorderVideos(productId, data.videoIds);
    }
}
