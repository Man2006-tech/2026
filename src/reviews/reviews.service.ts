import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Create start
  async createReview(reviewerId: number, dto: CreateReviewDto) {
    // 1. Check if booking exists
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        ride: true,
        review: true, // Include existing review to check duplicates
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // 2. Validate reviewer (must be passenger)
    if (booking.passengerId !== reviewerId) {
      throw new ForbiddenException('Only the passenger can review this ride');
    }

    // 3. Validate status (must be COMPLETED)
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Ride must be completed before reviewing');
    }

    // 4. Check duplicate
    if (booking.review) {
      throw new BadRequestException('You have already reviewed this booking');
    }

    // 5. Determine reviewee (Driver)
    // The driver is the ride creator (User)
    // Wait, ride.driverId is relation to Driver table. Driver table has userId.
    const driver = await this.prisma.driver.findUnique({
      where: { id: booking.ride.driverId },
    });

    if (!driver) throw new NotFoundException('Driver not found');
    const revieweeId = driver.userId;

    // 6. Create Review
    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        reviewerId: reviewerId,
        revieweeId: revieweeId,
        rating: dto.rating,
        tags: dto.tags ? JSON.stringify(dto.tags) : null,
        comment: dto.comment,
      },
    });

    // 7. Update User's Average Rating
    await this.updateUserRating(revieweeId);

    return review;
  }
  // Create end

  async getMyGivenReviews(userId: number) {
    return this.prisma.review.findMany({
      where: { reviewerId: userId },
      include: {
        reviewee: { select: { id: true, name: true, profileImage: true } },
        booking: {
          include: {
            ride: { select: { from: true, to: true, departureDate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserReviews(userId: number) {
    // Get reviews RECEIVED by this user
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse tags JSON
    return reviews.map((r) => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));
  }

  async getUserReviewStats(userId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = parseFloat((sum / totalReviews).toFixed(1));

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating]++;
    });

    return {
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
    };
  }

  async getBookingReview(bookingId: number, userId: number) {
    const review = await this.prisma.review.findUnique({
      where: { bookingId },
    });

    if (!review)
      throw new NotFoundException('Review not found for this booking');

    // Access check? Maybe public or participant only?
    // Requirement says "Participants".
    // We need to check if userId is passenger or driver.
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: { include: { driver: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (
      booking.passengerId !== userId &&
      booking.ride.driver.userId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return {
      ...review,
      tags: review.tags ? JSON.parse(review.tags) : [],
    };
  }

  async checkCanReview(userId: number, bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.passengerId !== userId)
      return { canReview: false, reason: 'Not the passenger' };
    if (booking.status !== BookingStatus.COMPLETED)
      return { canReview: false, reason: 'Ride not completed' };
    if (booking.review) return { canReview: false, reason: 'Already reviewed' };

    return { canReview: true };
  }

  // Private Helper
  private async updateUserRating(userId: number) {
    const { averageRating } = await this.getUserReviewStats(userId);

    // Update User table
    await this.prisma.user.update({
      where: { id: userId },
      data: { rating: averageRating },
    });
  }
}
