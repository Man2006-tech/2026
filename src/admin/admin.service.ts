import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserStatus,
  VerificationStatus,
  ComplaintStatus,
  RideStatus,
} from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async getUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driver: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserStatus(userId: number, status: UserStatus) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { status },
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER & VEHICLE VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────

  async getPendingDrivers() {
    return this.prisma.driver.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: { user: true, vehicles: true },
    });
  }

  async getDriverDetails(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true,
        vehicles: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async verifyDriver(
    driverId: number,
    status: VerificationStatus,
    rejectionReason?: string,
  ) {
    try {
      return await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          verificationStatus: status,
          rejectionReason:
            status === VerificationStatus.REJECTED ? rejectionReason : null,
        },
      });
    } catch (error) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }
  }

  async getVehiclesForVerification() {
    return this.prisma.vehicle.findMany({
      where: { isActive: false, deletedAt: null },
      include: { driver: { include: { user: true } } },
    });
  }

  async verifyVehicle(vehicleId: number, isActive: boolean) {
    try {
      return await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isActive },
      });
    } catch (error) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RIDE & BOOKING OVERSIGHT
  // ─────────────────────────────────────────────────────────────────────────

  async getAllRides() {
    return this.prisma.ride.findMany({
      include: {
        driver: { include: { user: true } },
        bookings: { include: { passenger: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleRideSuspicion(rideId: number, isSuspicious: boolean) {
    try {
      return await this.prisma.ride.update({
        where: { id: rideId },
        data: { isSuspicious },
      });
    } catch (error) {
      throw new NotFoundException(`Ride with ID ${rideId} not found`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLAINTS & SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getComplaints() {
    return this.prisma.complaint.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateComplaintStatus(complaintId: number, status: ComplaintStatus) {
    try {
      return await this.prisma.complaint.update({
        where: { id: complaintId },
        data: { status },
      });
    } catch (error) {
      throw new NotFoundException(`Complaint with ID ${complaintId} not found`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD & STATISTICS
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalUsers,
      totalDrivers,
      pendingDrivers,
      bannedUsers,
      totalRides,
      completedRides,
      cancelledRides,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.driver.count(),
      this.prisma.driver.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.user.count({ where: { status: UserStatus.BANNED } }),
      this.prisma.ride.count(),
      this.prisma.ride.count({ where: { status: RideStatus.COMPLETED } }),
      this.prisma.ride.count({ where: { status: RideStatus.CANCELLED } }),
    ]);

    return {
      users: {
        total: totalUsers,
        banned: bannedUsers,
      },
      drivers: {
        total: totalDrivers,
        pending: pendingDrivers,
      },
      rides: {
        total: totalRides,
        completed: completedRides,
        cancelled: cancelledRides,
      },
      financials: {
        message: 'Mini overview only',
        totalRevenue: 0,
        platformFees: 0,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM SETTINGS
  // ─────────────────────────────────────────────────────────────────────────

  async getSystemSettings() {
    let settings = await this.prisma.systemSettings.findFirst({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { id: 1 },
      });
    }
    return settings;
  }

  async updateSystemSettings(data: {
    baseFare?: number;
    perKmRate?: number;
    surgeMultiplier?: number;
    safetyMessage?: string;
    announcement?: string;
  }) {
    return this.prisma.systemSettings.update({
      where: { id: 1 },
      data,
    });
  }
}
