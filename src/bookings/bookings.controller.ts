import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CheckBookingEligibilityDto } from './dto/check-booking-eligibility.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(private readonly bookingsService: BookingsService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PHASE 2: Check booking eligibility before creating booking
   * POST /bookings/check-eligibility
   */
  @Post('check-eligibility')
  async checkEligibility(
    @Request() req,
    @Body() dto: CheckBookingEligibilityDto,
  ) {
    this.logger.log(
      `POST /bookings/check-eligibility - User ${req.user.id} checking ride ${dto.rideId}`,
    );
    return this.bookingsService.checkBookingEligibility(
      req.user.id,
      dto.rideId,
      dto.seatsNeeded,
    );
  }

  /**
   * Create a booking (Passenger books a ride)
   * POST /bookings
   */
  @Post()
  async createBooking(@Request() req, @Body() dto: CreateBookingDto) {
    this.logger.log(
      `POST /bookings - User ${req.user.id} booking ride ${dto.rideId}`,
    );
    return this.bookingsService.createBooking(req.user.id, dto);
  }

  /**
   * Get all my bookings as a passenger
   * GET /bookings/my-bookings?status=PENDING
   */
  @Get('my-bookings')
  async getMyBookings(@Request() req, @Query('status') status?: string) {
    this.logger.log(`GET /bookings/my-bookings - User ${req.user.id}`);
    return this.bookingsService.getMyBookings(req.user.id, status);
  }

  /**
   * PHASE 2: Get my booking statistics
   * GET /bookings/my-stats
   */
  @Get('my-stats')
  async getMyStats(@Request() req) {
    this.logger.log(`GET /bookings/my-stats - User ${req.user.id}`);
    return this.bookingsService.getPassengerBookingStats(req.user.id);
  }

  /**
   * Cancel a booking (Passenger)
   * PUT /bookings/:id/cancel
   */
  @Put(':id/cancel')
  async cancelBooking(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(`PUT /bookings/${id}/cancel - User ${req.user.id}`);
    return this.bookingsService.cancelBooking(id, req.user.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all pending booking requests for my rides (Driver)
   * GET /bookings/requests
   */
  @Get('requests')
  async getPendingRequests(@Request() req) {
    this.logger.log(`GET /bookings/requests - Driver ${req.user.id}`);
    return this.bookingsService.getPendingRequests(req.user.id);
  }

  /**
   * PHASE 2: Get booking statistics for driver
   * GET /bookings/driver-stats
   */
  @Get('driver-stats')
  async getDriverStats(@Request() req) {
    this.logger.log(`GET /bookings/driver-stats - Driver ${req.user.id}`);
    return this.bookingsService.getDriverBookingStats(req.user.id);
  }

  /**
   * Accept a booking request (Driver)
   * PUT /bookings/:id/accept
   */
  @Put(':id/accept')
  async acceptBooking(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(`PUT /bookings/${id}/accept - Driver ${req.user.id}`);
    return this.bookingsService.acceptBooking(id, req.user.id);
  }

  /**
   * Reject a booking request (Driver)
   * PUT /bookings/:id/reject
   */
  @Put(':id/reject')
  async rejectBooking(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    this.logger.log(`PUT /bookings/${id}/reject - Driver ${req.user.id}`);
    return this.bookingsService.rejectBooking(
      id,
      req.user.id,
      dto.rejectionReason,
    );
  }

  /**
   * Get all bookings for a specific ride (Driver)
   * GET /bookings/rides/:rideId
   */
  @Get('rides/:rideId')
  async getRideBookings(
    @Param('rideId', ParseIntPipe) rideId: number,
    @Request() req,
  ) {
    this.logger.log(`GET /bookings/rides/${rideId} - Driver ${req.user.id}`);
    return this.bookingsService.getRideBookings(rideId, req.user.id);
  }
  /**
   * Get single booking details
   * GET /bookings/:id
   */
  @Get(':id')
  async getBookingById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(`GET /bookings/${id} - User ${req.user.id}`);
    return this.bookingsService.getBookingById(id, req.user.id);
  }
}
