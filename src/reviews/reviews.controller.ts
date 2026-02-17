import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('reviews')
export class ReviewsController {
  private readonly logger = new Logger(ReviewsController.name);

  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    this.logger.log(
      `POST /reviews - User ${req.user.id} reviewing booking ${dto.bookingId}`,
    );
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(@Request() req) {
    this.logger.log(`GET /reviews/my-reviews - User ${req.user.id}`);
    return this.reviewsService.getMyGivenReviews(req.user.id);
  }

  @Get('user/:userId')
  @Public()
  async getUserReviews(@Param('userId', ParseIntPipe) userId: number) {
    this.logger.log(`GET /reviews/user/${userId}`);
    return this.reviewsService.getUserReviews(userId);
  }

  @Get('user/:userId/stats')
  @Public()
  async getUserReviewStats(@Param('userId', ParseIntPipe) userId: number) {
    this.logger.log(`GET /reviews/user/${userId}/stats`);
    return this.reviewsService.getUserReviewStats(userId);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getBookingReview(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Request() req,
  ) {
    this.logger.log(`GET /reviews/booking/${bookingId} - User ${req.user.id}`);
    return this.reviewsService.getBookingReview(bookingId, req.user.id);
  }

  @Get('can-review/:bookingId')
  @UseGuards(JwtAuthGuard)
  async checkCanReview(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Request() req,
  ) {
    this.logger.log(
      `GET /reviews/can-review/${bookingId} - User ${req.user.id}`,
    );
    return this.reviewsService.checkCanReview(req.user.id, bookingId);
  }
}
