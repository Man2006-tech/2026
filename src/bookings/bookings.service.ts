import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async checkBookingEligibility(
    userId: number,
    rideId: number,
    seatsNeeded: number,
  ) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true },
    });

    if (!ride) throw new NotFoundException('Ride not found');

    // 1. Check if user is the driver
    if (ride.driver.userId === userId) {
      return { eligible: false, reason: 'You cannot book your own ride' };
    }

    // 2. Check time validation (Past rides)
    const now = new Date();
    const rideDateTime = new Date(
      `${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime.toISOString().split('T')[1]}`,
    );

    if (rideDateTime < now) {
      return {
        eligible: false,
        reason: 'Cannot book rides that have already departed',
      };
    }

    // 4. Check available seats
    if (ride.availableSeats < seatsNeeded) {
      return {
        eligible: false,
        reason: `Only ${ride.availableSeats} seat(s) available, you need ${seatsNeeded}`,
      };
    }

    // 5. Check existing booking
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        rideId,
        passengerId: userId,
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED] }, // Changed to exclude COMPLETED too if needed, but definitely CANCELLED
      },
    });

    if (existingBooking) {
      return {
        eligible: false,
        reason: 'You already have an active booking for this ride',
      };
    }

    return {
      eligible: true,
      ride: {
        id: ride.id,
        from: ride.from,
        to: ride.to,
        departureDate: ride.departureDate,
        departureTime: ride.departureTime,
        availableSeats: ride.availableSeats,
        fare: ride.fare,
        totalFare: ride.fare * seatsNeeded,
      },
    };
  }

  async createBooking(userId: number, dto: CreateBookingDto) {
    return this.prisma.$transaction(async (prisma) => {
      const ride = await prisma.ride.findUnique({
        where: { id: dto.rideId },
        include: { driver: true },
      });

      if (!ride) throw new NotFoundException('Ride not found');

      if (ride.driver.userId === userId) {
        throw new BadRequestException('Driver cannot book their own ride');
      }

      // Time Validations
      const now = new Date();
      const rideDateTime = new Date(
        `${ride.departureDate.toISOString().split('T')[0]}T${ride.departureTime.toISOString().split('T')[1]}`,
      );

      if (rideDateTime < now) {
        throw new BadRequestException(
          'Cannot book rides that have already departed',
        );
      }

      // Race condition double-check
      if (ride.availableSeats < dto.seatsBooked) {
        throw new BadRequestException(
          `Seats no longer available. Another passenger may have just booked.`,
        );
      }

      // Check duplicate booking
      const existing = await prisma.booking.findFirst({
        where: {
          rideId: dto.rideId,
          passengerId: userId,
          status: { not: BookingStatus.CANCELLED },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'You already have a booking for this ride',
        );
      }

      const fare = ride.fare * dto.seatsBooked;

      // Decrement seats ATOMICALLY
      await prisma.ride.update({
        where: { id: dto.rideId },
        data: { availableSeats: { decrement: dto.seatsBooked } },
      });

      // Create booking
      return prisma.booking.create({
        data: {
          rideId: dto.rideId,
          passengerId: userId,
          seatsBooked: dto.seatsBooked,
          fare,
          status: 'PENDING',
        },
        include: {
          ride: {
            include: {
              driver: {
                include: { user: { select: { name: true, phone: true } } },
              },
            },
          },
        },
      });
    });
  }

  async getMyBookings(userId: number, status?: string) {
    const where: any = { passengerId: userId };
    if (status) where.status = status;

    return this.prisma.booking.findMany({
      where,
      include: {
        ride: {
          include: {
            driver: {
              include: {
                user: {
                  select: { name: true, rating: true, profileImage: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingById(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        ride: {
          include: {
            driver: {
              include: { user: true },
            },
          },
        },
        passenger: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Access check: passenger or driver
    if (
      booking.passengerId !== userId &&
      booking.ride.driver.userId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  async cancelBooking(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { ride: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.passengerId !== userId)
      throw new ForbiddenException('Only passenger can cancel');

    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel completed or already cancelled booking',
      );
    }

    // Time Check: 1 Hour before departure
    const now = new Date();
    const rideDateTime = new Date(
      `${booking.ride.departureDate.toISOString().split('T')[0]}T${booking.ride.departureTime.toISOString().split('T')[1]}`,
    );
    const oneHourBeforeDeparture = new Date(
      rideDateTime.getTime() - 60 * 60 * 1000,
    );

    if (now > oneHourBeforeDeparture) {
      throw new BadRequestException(
        'Cannot cancel booking within 1 hour of departure time',
      );
    }

    // Transaction to restore seats
    return this.prisma.$transaction(async (prisma) => {
      // If confirmed, restore seats
      if (booking.status === BookingStatus.CONFIRMED) {
        await prisma.ride.update({
          where: { id: booking.rideId },
          data: { availableSeats: { increment: booking.seatsBooked } },
        });
      }

      return prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });
    });
  }

  async getPassengerBookingStats(userId: number) {
    const total = await this.prisma.booking.count({
      where: { passengerId: userId },
    });
    const pending = await this.prisma.booking.count({
      where: { passengerId: userId, status: BookingStatus.PENDING },
    });
    const confirmed = await this.prisma.booking.count({
      where: { passengerId: userId, status: BookingStatus.CONFIRMED },
    });
    const completed = await this.prisma.booking.count({
      where: { passengerId: userId, status: BookingStatus.COMPLETED },
    });
    const cancelled = await this.prisma.booking.count({
      where: { passengerId: userId, status: BookingStatus.CANCELLED },
    });

    return { total, pending, confirmed, completed, cancelled };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async getPendingRequests(userId: number) {
    // Determine driver ID from user ID
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException('Not a driver');

    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        ride: {
          driverId: driver.id,
        },
      },
      include: {
        passenger: {
          select: { id: true, name: true, rating: true, profileImage: true },
        },
        ride: true,
      },
    });
  }

  async acceptBooking(id: number, userId: number) {
    return this.prisma.$transaction(async (prisma) => {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { ride: { include: { driver: true } } },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.ride.driver.userId !== userId)
        throw new ForbiddenException('Not your ride');
      if (booking.status !== BookingStatus.PENDING)
        throw new BadRequestException('Booking not pending');

      // Double check availability (should be reserved typically, but here we deduct on confirm?
      // Wait, logically we deduced on create/request?
      // User verification says: "System reduces availableSeats in Ride table" on Booking Creation.
      // So no need to decrement again for accept.
      // Wait, createBooking provided above DOES decrement.
      // So here we just update status.
      // BUT, earlier logic in my provided code said "decremented" in Create.
      // Let's re-read user Request: "Status becomes CONFIRMED"
      // Wait, Phase 1 logic I wrote earlier: "If CONFIRMED, decrements available seats in Ride".
      // BUT Phase 2 "Enhanced" says: "Race condition prevention with double-check".
      // Usually seats reserved on Pending to avoid overbooking.
      // createBooking above: "await prisma.ride.update({ ... decrement ... })"
      // So seats ARE deducted on Pending.
      // So Accept just changes status.

      return prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED },
      });
    });
  }

  async rejectBooking(id: number, userId: number, reason?: string) {
    return this.prisma.$transaction(async (prisma) => {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { ride: { include: { driver: true } } },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.ride.driver.userId !== userId)
        throw new ForbiddenException('Not your ride');
      // Allow rejecting confirmed? Usually only pending.
      if (booking.status !== BookingStatus.PENDING)
        throw new BadRequestException('Booking not pending');

      // Restore seats since they were deducted on creation
      await prisma.ride.update({
        where: { id: booking.rideId },
        data: { availableSeats: { increment: booking.seatsBooked } },
      });

      return prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED }, // or REJECTED if enum supported
      });
    });
  }

  async getRideBookings(rideId: number, userId: number) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { driver: true },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.driver.userId !== userId)
      throw new ForbiddenException('Not your ride');

    return this.prisma.booking.findMany({
      where: { rideId },
      include: { passenger: true },
    });
  }

  async getDriverBookingStats(userId: number) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException('Not a driver');

    const total = await this.prisma.booking.count({
      where: { ride: { driverId: driver.id } },
    });
    const pending = await this.prisma.booking.count({
      where: { ride: { driverId: driver.id }, status: BookingStatus.PENDING },
    });
    const confirmed = await this.prisma.booking.count({
      where: { ride: { driverId: driver.id }, status: BookingStatus.CONFIRMED },
    });
    const completed = await this.prisma.booking.count({
      where: { ride: { driverId: driver.id }, status: BookingStatus.COMPLETED },
    });
    const cancelled = await this.prisma.booking.count({
      where: { ride: { driverId: driver.id }, status: BookingStatus.CANCELLED },
    });

    return { total, pending, confirmed, completed, cancelled };
  }
}
