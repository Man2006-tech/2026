import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { RideStatus } from '@prisma/client';
import { UpdateRideDto } from './dto/update-ride.dto';

@Injectable()
export class RidesService {
  constructor(private prisma: PrismaService) { }

  async create(userId: number, dto: CreateRideDto) {
    // Get driver info
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!driver) {
      throw new ForbiddenException('Only drivers can create rides');
    }

    if (driver.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenException('Driver must be verified to create rides');
    }

    // Parse date and time
    const departureDateTime = new Date(`${dto.departureDate}T${dto.departureTime}`);

    // Create ride
    const ride = await this.prisma.ride.create({
      data: {
        driverId: driver.id,
        from: dto.from,
        to: dto.to,
        departureDate: new Date(dto.departureDate),
        departureTime: departureDateTime,
        availableSeats: dto.availableSeats,
        totalSeats: driver.numberOfSeats,
        fare: 0, // Will be calculated by fare service later
        status: 'SCHEDULED',
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                rating: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    return ride;
  }

  async search(dto: SearchRidesDto) {
    const { from, to, departureDate, seats = 1, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    // Parse the date string to Date object
    const searchDate = new Date(departureDate);

    // Define the filter (DRY Principle)
    const whereClause = {
      from: { contains: from },
      to: { contains: to },
      departureDate: searchDate,
      availableSeats: { gte: seats },
      status: 'SCHEDULED' as RideStatus,
    };

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: whereClause,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  rating: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { departureTime: 'asc' }, // earliest departure time first
        skip,
        take: limit,
      }),
      this.prisma.ride.count({
        where: whereClause,
      }),
    ]);

    return {
      rides,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + rides.length < total,
    };
  }

  async findOne(id: number) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                rating: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  async updateRideStatus(id: number, userId: number, dto: UpdateRideStatusDto) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.driver.userId !== userId) {
      throw new ForbiddenException('Only the ride owner can update status');
    }

    return this.prisma.ride.update({
      where: { id },
      data: { status: dto.status },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async cancelRide(id: number, userId: number) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.driver.userId !== userId) {
      throw new ForbiddenException('Only the ride owner can cancel');
    }

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED' || ride.status === 'STARTED') {
      throw new ForbiddenException('Cannot cancel ride that has started, completed, or already cancelled');
    }

    return this.prisma.ride.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async getMyRides(userId: number, status?: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new ForbiddenException('User is not a driver');
    }

    return this.prisma.ride.findMany({
      where: {
        driverId: driver.id,
        ...(status && { status: status as RideStatus }),
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rating: true,
              },
            },
          },
        },
      },
      orderBy: { departureDate: 'asc' },
    });
  }

  // Get upcoming rides (public browsing)
  async getUpcomingRides(filters: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: 'SCHEDULED',
      departureDate: { gte: new Date() }, // Future rides only
    };

    if (filters.from) {
      whereClause.from = { contains: filters.from, mode: 'insensitive' };
    }

    if (filters.to) {
      whereClause.to = { contains: filters.to, mode: 'insensitive' };
    }

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where: whereClause,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  rating: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { departureDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.ride.count({ where: whereClause }),
    ]);

    return { rides, total, page, totalPages: Math.ceil(total / limit) };
  }

  // // Get passengers for a specific ride (driver only)
  // async getRidePassengers(rideId: number, userId: number) {
  //   const ride = await this.prisma.ride.findUnique({
  //     where: { id: rideId },
  //     include: { driver: true, bookings: true },
  //   });

  //   if (!ride) {
  //     throw new NotFoundException('Ride not found');
  //   }

  //   if (ride.driver.userId !== userId) {
  //     throw new ForbiddenException('Only ride owner can view passengers');
  //   }

  //   const bookings = await this.prisma.booking.findMany({
  //     where: {
  //       rideId,
  //       status: { in: ['CONFIRMED', 'COMPLETED'] },
  //     },
  //     include: {
  //       passenger: {
  //         select: {
  //           id: true,
  //           name: true,
  //           phone: true,
  //           rating: true,
  //           profileImage: true,
  //         },
  //       },
  //     },
  //   });

  //   return {
  //     ride: {
  //       id: ride.id,
  //       from: ride.from,
  //       to: ride.to,
  //       departureDate: ride.departureDate,
  //       status: ride.status,
  //     },
  //     passengers: bookings.map((b) => ({
  //       bookingId: b.id,
  //       passenger: b.passenger,
  //       seatsBooked: b.seatsBooked,
  //       fare: b.fare,
  //     })),
  //     totalPassengers: bookings.reduce((sum, b) => sum + b.seatsBooked, 0),
  //   };
  // }

  // Update ride details (before started)
  async updateRide(rideId: number, userId: number, dto: UpdateRideDto) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.driver.userId !== userId) {
      throw new ForbiddenException('Only ride owner can update');
    }

    if (ride.status !== 'SCHEDULED') {
      throw new ForbiddenException('Can only update scheduled rides');
    }

    return this.prisma.ride.update({
      where: { id: rideId },
      data: {
        ...(dto.departureDate && { departureDate: new Date(dto.departureDate) }),
        ...(dto.departureTime && { departureTime: new Date(`2000-01-01T${dto.departureTime}`) }),
        ...(dto.availableSeats && { availableSeats: dto.availableSeats }),
      },
    });
  }
}