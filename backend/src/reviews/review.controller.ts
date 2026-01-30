import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ReviewService } from './review.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';

@ApiTags('reviews')
@Controller('api/reviews')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @Post('order/:orderId/submit')
    @Permissions('review:submit')
    @ApiOperation({ summary: 'Submit review for an order (Buyer only)' })
    @ApiResponse({ status: 200, description: 'Review submitted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data or review already submitted' })
    @ApiResponse({ status: 403, description: 'Not authorized to review this order' })
    @ApiResponse({ status: 404, description: 'Review not found' })
    async submitReview(
        @Param('orderId') orderId: string,
        @Body() dto: SubmitReviewDto,
        @Request() req,
    ) {
        return this.reviewService.submitReview(orderId, req.user.userId, dto);
    }

    @Patch(':id/moderate')
    @Permissions('review:moderate')
    @ApiOperation({ summary: 'Moderate a review (Admin only)' })
    @ApiResponse({ status: 200, description: 'Review moderated successfully' })
    @ApiResponse({ status: 400, description: 'Cannot moderate pending review' })
    @ApiResponse({ status: 404, description: 'Review not found' })
    async moderateReview(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
        return this.reviewService.moderateReview(id, dto);
    }

    @Get('order/:orderId')
    @Permissions('review:view')
    @ApiOperation({ summary: 'Get review for a specific order' })
    @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Review not found' })
    async getReviewByOrder(@Param('orderId') orderId: string) {
        return this.reviewService.getReviewByOrder(orderId);
    }

    @Get('buyer/my-reviews')
    @Permissions('review:view')
    @ApiOperation({ summary: 'Get all reviews by current buyer' })
    @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
    async getMyReviews(@Query() query: QueryReviewDto, @Request() req) {
        return this.reviewService.getReviewsByBuyer(req.user.userId, query);
    }

    @Get('buyer/:buyerId')
    @Permissions('review:viewAll')
    @ApiOperation({ summary: 'Get all reviews by a specific buyer (Admin/Seller)' })
    @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
    async getReviewsByBuyer(@Param('buyerId') buyerId: string, @Query() query: QueryReviewDto) {
        return this.reviewService.getReviewsByBuyer(buyerId, query);
    }

    @Get('query')
    @Permissions('review:viewAll')
    @ApiOperation({ summary: 'Query reviews with filters (Admin/Seller)' })
    @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
    async queryReviews(@Query() query: QueryReviewDto) {
        return this.reviewService.queryReviews(query);
    }

    @Get('buyer/:buyerId/stats')
    @Permissions('review:viewAll')
    @ApiOperation({ summary: 'Get review statistics for a buyer (Admin/Seller)' })
    @ApiResponse({ status: 200, description: 'Review statistics retrieved successfully' })
    async getBuyerReviewStats(@Param('buyerId') buyerId: string) {
        return this.reviewService.getBuyerReviewStats(buyerId);
    }

    @Get('buyer/my-stats')
    @Permissions('review:view')
    @ApiOperation({ summary: 'Get review statistics for current buyer' })
    @ApiResponse({ status: 200, description: 'Review statistics retrieved successfully' })
    async getMyReviewStats(@Request() req) {
        return this.reviewService.getBuyerReviewStats(req.user.userId);
    }
}
