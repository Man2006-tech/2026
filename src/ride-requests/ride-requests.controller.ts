import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { RideRequestsService } from './ride-requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';

@Controller('ride-requests')
export class RideRequestsController {
  private readonly logger = new Logger(RideRequestsController.name);

  constructor(private readonly rideRequestsService: RideRequestsService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a ride request
   * POST /ride-requests
   * Matches frontend: "Can't find a ride? Ask for one." + [Notify Drivers]
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createRideRequest(@Request() req, @Body() dto: CreateRideRequestDto) {
    this.logger.log(
      `POST /ride-requests - Passenger ${req.user.id} requesting ${dto.from} → ${dto.to}`,
    );
    return this.rideRequestsService.createRideRequest(req.user.id, dto);
  }

  /**
   * Get my ride requests
   * GET /ride-requests/my-requests?status=ACTIVE
   * Matches frontend: passenger sees their own requests
   */
  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  async getMyRequests(@Request() req, @Query('status') status?: string) {
    this.logger.log(
      `GET /ride-requests/my-requests - Passenger ${req.user.id}`,
    );
    return this.rideRequestsService.getMyRideRequests(req.user.id, status);
  }

  /**
   * Cancel a ride request
   * DELETE /ride-requests/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelRideRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    this.logger.log(`DELETE /ride-requests/${id} - Passenger ${req.user.id}`);
    return this.rideRequestsService.cancelRideRequest(id, req.user.id);
  }

  /**
   * Find rides matching my request
   * GET /ride-requests/:id/matching-rides
   * Matches frontend: after posting request, show matching rides
   */
  @Get(':id/matching-rides')
  @UseGuards(JwtAuthGuard)
  async findMatchingRides(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    this.logger.log(
      `GET /ride-requests/${id}/matching-rides - Passenger ${req.user.id}`,
    );
    return this.rideRequestsService.findMatchingRides(id, req.user.id);
  }

  /**
   * Mark request as fulfilled (when passenger books a ride)
   * PUT /ride-requests/:id/fulfill
   */
  @Put(':id/fulfill')
  @UseGuards(JwtAuthGuard)
  async fulfillRequest(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(
      `PUT /ride-requests/${id}/fulfill - Passenger ${req.user.id}`,
    );
    return this.rideRequestsService.fulfillRideRequest(id, req.user.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Browse all active ride requests (for drivers)
   * GET /ride-requests/active?from=Lahore&to=Islamabad&date=2026-02-20
   * Matches frontend: driver sees passenger requests on their route
   */
  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActiveRequests(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
    this.logger.log(`GET /ride-requests/active - from: ${from}, to: ${to}`);
    return this.rideRequestsService.getActiveRideRequests({
      from,
      to,
      date,
    });
  }

  /**
   * Get single ride request by ID
   * GET /ride-requests/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getRideRequest(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /ride-requests/${id}`);
    return this.rideRequestsService.getRideRequestById(id);
  }
}
