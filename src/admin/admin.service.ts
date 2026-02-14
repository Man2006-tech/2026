import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus, VerificationStatus, ComplaintStatus, RideStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) { }

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        driver: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        driver: {
          include: {
            vehicles: true
          }
        },
        bookings: true,
        complaints: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(userId: number, status: UserStatus) {
    try {
      // Check if user exists first
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return await this.prisma.user.update({
        where: { id: userId },
        data: { status },
      });
    } catch (error) {
      this.logger.error(`Error updating user status: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to update user status: ${error.message}`);
    }
  }

  async getPendingDrivers() {
    return this.prisma.driver.findMany({
      where: {
        verificationStatus: VerificationStatus.PENDING,
      },
      include: {
        user: true,
        vehicles: true
      },
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

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async verifyDriver(driverId: number, status: VerificationStatus, rejectionReason?: string) {
    if (status === VerificationStatus.REJECTED && !rejectionReason) {
      throw new Error('Rejection reason is required when rejecting a driver');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        verificationStatus: status,
        rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null,
      },
    });
  }

  async getVehiclesForVerification() {
    return this.prisma.vehicle.findMany({
      where: { isActive: false, deletedAt: null },
      include: { driver: { include: { user: true } } },
    });
  }

  async verifyVehicle(vehicleId: number, isActive: boolean) {
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive },
    });
  }

  async getAllRides() {
    return this.prisma.ride.findMany({
      include: {
        driver: {
          include: {
            user: true,
          },
        },
        bookings: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async flagSuspiciousRide(rideId: number, isSuspicious: boolean) {
    return this.prisma.ride.update({
      where: { id: rideId },
      data: { isSuspicious },
    });
  }

  async getAllComplaints() {
    return this.prisma.complaint.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateComplaintStatus(complaintId: number, status: ComplaintStatus) {
    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: { status },
    });
  }

  async getDashboardStats() {
    try {
      const [
        totalUsers,
        activeDrivers,
        activeRides,
        pendingComplaints,
        totalRevenue
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.driver.count({
          where: { verificationStatus: VerificationStatus.VERIFIED },
        }),
        this.prisma.ride.count({
          where: { status: RideStatus.SCHEDULED },
        }),
        this.prisma.complaint.count({
          where: { status: ComplaintStatus.OPEN },
        }),
        Promise.resolve(0),
      ]);

      return {
        totalUsers,
        activeDrivers,
        activeRides,
        pendingComplaints,
        totalRevenue,
      };
    } catch (error) {
      this.logger.error(`Error in getDashboardStats: ${error.message}`, error.stack);
      throw error;
    }
  }

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

  async updateSystemSettings(data: any) {
    return this.prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { ...data, id: 1 },
    });
  }
}
