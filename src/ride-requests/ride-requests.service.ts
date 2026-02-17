import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { RideRequestStatus, RideStatus } from '@prisma/client';

@Injectable()
export class RideRequestsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER: CREATE RIDE REQUEST
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a ride request
   * Matches frontend: "Can't find a ride? Ask for one."
   */
  async createRideRequest(passengerId: number, dto: CreateRideRequestDto) {
    const {
      from,
      to,
      earliestDate,
      earliestTime,
      latestTime,
      seatsNeeded,
      offerPerSeat,
    } = dto;

    // 1. Parse earliest and latest datetime
    const earliestDateTime = new Date(`${earliestDate}T${earliestTime}`);
    const latestDateTime = new Date(`${earliestDate}T${latestTime}`);

    // 2. Validate time range
    if (latestDateTime <= earliestDateTime) {
      throw new BadRequestException('Latest time must be after earliest time');
    }

    // 3. Cannot create request for past time
    const now = new Date();
    if (earliestDateTime < now) {
      throw new BadRequestException(
        'Cannot create a ride request for a past time',
      );
    }

    // 4. Check if passenger already has an ACTIVE request for same route and date
    const existingRequest = await this.prisma.rideRequest.findFirst({
      where: {
        passengerId,
        from,
        to,
        status: RideRequestStatus.ACTIVE,
        earliestDate: new Date(earliestDate),
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have an active ride request for this route and date',
      );
    }

    // 5. Set expiry to 24 hours from now
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 6. Create ride request
    const rideRequest = await this.prisma.rideRequest.create({
      data: {
        passengerId,
        from,
        to,
        earliestDate: new Date(earliestDate),
        earliestTime: earliestDateTime,
        latestTime: latestDateTime,
        seatsNeeded,
        offerPerSeat: offerPerSeat ?? null,
        status: RideRequestStatus.ACTIVE,
        expiresAt,
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            rating: true,
          },
        },
      },
    });

    return {
      message: 'Ride request posted. Drivers on this route will be notified.',
      rideRequest,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER: VIEW MY REQUESTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all ride requests by the current passenger
   */
  async getMyRideRequests(passengerId: number, status?: string) {
    // Auto-expire old requests before fetching
    await this.expireOldRequests();

    const whereClause: any = { passengerId };
    if (status) {
      whereClause.status = status;
    }

    return this.prisma.rideRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER: VIEW ACTIVE REQUESTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all active ride requests (for drivers to browse)
   * Matches frontend: drivers see passenger requests on their route
   */
  async getActiveRideRequests(filters: {
    from?: string;
    to?: string;
    date?: string;
  }) {
    // Auto-expire old requests before fetching
    await this.expireOldRequests();

    const whereClause: any = {
      status: RideRequestStatus.ACTIVE,
      expiresAt: { gt: new Date() }, // Only non-expired
    };

    // Filter by from (partial match)
    if (filters.from) {
      whereClause.from = { contains: filters.from };
    }

    // Filter by to (partial match)
    if (filters.to) {
      whereClause.to = { contains: filters.to };
    }

    // Filter by date
    if (filters.date) {
      whereClause.earliestDate = new Date(filters.date);
    }

    return this.prisma.rideRequest.findMany({
      where: whereClause,
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET SINGLE REQUEST
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get single ride request by ID
   */
  async getRideRequestById(requestId: number) {
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            rating: true,
          },
        },
      },
    });

    if (!rideRequest) {
      throw new NotFoundException('Ride request not found');
    }

    return rideRequest;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER: CANCEL REQUEST
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cancel a ride request (only by the owner)
   */
  async cancelRideRequest(requestId: number, passengerId: number) {
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
    });

    if (!rideRequest) {
      throw new NotFoundException('Ride request not found');
    }

    // Only the owner can cancel
    if (rideRequest.passengerId !== passengerId) {
      throw new ForbiddenException(
        'You can only cancel your own ride requests',
      );
    }

    // Can only cancel ACTIVE requests
    if (rideRequest.status !== RideRequestStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot cancel a ${rideRequest.status.toLowerCase()} request`,
      );
    }

    const updated = await this.prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: RideRequestStatus.CANCELLED },
    });

    return {
      message: 'Ride request cancelled successfully',
      rideRequest: updated,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND MATCHING RIDES FOR A REQUEST
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find available rides that match a ride request
   * Matches frontend: helps passenger find rides matching their request
   */
  async findMatchingRides(requestId: number, passengerId: number) {
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
    });

    if (!rideRequest) {
      throw new NotFoundException('Ride request not found');
    }

    // Only the owner can check matches
    if (rideRequest.passengerId !== passengerId) {
      throw new ForbiddenException(
        'You can only check matches for your own requests',
      );
    }

    // Find rides matching the request criteria
    const matchingRides = await this.prisma.ride.findMany({
      where: {
        from: { contains: rideRequest.from },
        to: { contains: rideRequest.to },
        departureDate: rideRequest.earliestDate,
        availableSeats: { gte: rideRequest.seatsNeeded },
        status: RideStatus.SCHEDULED,
        // Time range filter
        departureTime: {
          gte: rideRequest.earliestTime,
          lte: rideRequest.latestTime,
        },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                rating: true,
              },
            },
          },
        },
      },
      orderBy: { departureTime: 'asc' },
    });

    return {
      rideRequest,
      matchingRides,
      totalMatches: matchingRides.length,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARK REQUEST AS FULFILLED (when passenger books a ride)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mark a ride request as fulfilled
   * Called when the passenger successfully books a ride after posting a request
   */
  async fulfillRideRequest(requestId: number, passengerId: number) {
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
    });

    if (!rideRequest) {
      throw new NotFoundException('Ride request not found');
    }

    if (rideRequest.passengerId !== passengerId) {
      throw new ForbiddenException(
        'You can only fulfill your own ride requests',
      );
    }

    if (rideRequest.status !== RideRequestStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot fulfill a ${rideRequest.status.toLowerCase()} request`,
      );
    }

    const updated = await this.prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: RideRequestStatus.FULFILLED },
    });

    return {
      message: 'Ride request marked as fulfilled',
      rideRequest: updated,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL: AUTO EXPIRE OLD REQUESTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Auto-expire requests that have passed their expiry time
   * Called automatically before fetching requests
   */
  private async expireOldRequests() {
    await this.prisma.rideRequest.updateMany({
      where: {
        status: RideRequestStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: { status: RideRequestStatus.EXPIRED },
    });
  }
}
