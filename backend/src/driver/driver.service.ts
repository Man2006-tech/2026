import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import {
  UpdateDriverStatusDto,
  UpdateDriverLocationDto,
} from './dto/update-driver-status.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateDocumentsDto } from './dto/update-documents.dto';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async findDriverByUserId(userId: number) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return driver;
  }

  private async findVehicleForDriver(vehicleId: number, driverId: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.driverId !== driverId)
      throw new ForbiddenException('You do not own this vehicle');
    return vehicle;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENTS
  // ─────────────────────────────────────────────────────────────────────────

  async updateDocuments(userId: number, documents: UpdateDocumentsDto) {
    const driver = await this.findDriverByUserId(userId);

    const updateData: Record<string, string> = {};
    if (documents.cnicFrontUrl)
      updateData['cnicFrontUrl'] = documents.cnicFrontUrl;
    if (documents.cnicBackUrl)
      updateData['cnicBackUrl'] = documents.cnicBackUrl;
    if (documents.licenseFrontUrl)
      updateData['licenseFrontUrl'] = documents.licenseFrontUrl;
    if (documents.licenseBackUrl)
      updateData['licenseBackUrl'] = documents.licenseBackUrl;

    if (Object.keys(updateData).length === 0)
      throw new BadRequestException('No document files were uploaded');

    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { ...updateData, verificationStatus: 'PENDING' },
      select: {
        id: true,
        verificationStatus: true,
        cnicFrontUrl: true,
        cnicBackUrl: true,
        licenseFrontUrl: true,
        licenseBackUrl: true,
        updatedAt: true,
      },
    });
  }

  async updateSelfie(userId: number, selfieUrl?: string) {
    if (!selfieUrl)
      throw new BadRequestException('No selfie file was uploaded');
    const driver = await this.findDriverByUserId(userId);

    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { selfieUrl },
      select: { id: true, selfieUrl: true, updatedAt: true },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE
  // ─────────────────────────────────────────────────────────────────────────

  async updateDriverProfile(userId: number, dto: UpdateDriverProfileDto) {
    const driver = await this.findDriverByUserId(userId);

    const data: Record<string, any> = {};
    if (dto.dateOfBirth !== undefined)
      data['dateOfBirth'] = new Date(dto.dateOfBirth);
    if (dto.gender !== undefined) data['gender'] = dto.gender;
    if (dto.emergencyContact !== undefined)
      data['emergencyContact'] = dto.emergencyContact;
    if (dto.drivingExperience !== undefined)
      data['drivingExperience'] = dto.drivingExperience;
    if (dto.availableWeekdays !== undefined)
      data['availableWeekdays'] = dto.availableWeekdays;
    if (dto.availableTimeSlots !== undefined)
      data['availableTimeSlots'] = dto.availableTimeSlots;

    if (Object.keys(data).length === 0)
      throw new BadRequestException('No profile fields were provided');

    return this.prisma.driver.update({
      where: { id: driver.id },
      data,
      select: {
        id: true,
        name: true,
        gender: true,
        dateOfBirth: true,
        emergencyContact: true,
        drivingExperience: true,
        availableWeekdays: true,
        availableTimeSlots: true,
        updatedAt: true,
      },
    });
  }

  async getDriverStatus(userId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        vehicles: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    return {
      verificationStatus: driver.verificationStatus,
      rejectionReason: driver.rejectionReason ?? null,
      isOnline: driver.isOnline,
      location:
        driver.latitude !== null && driver.longitude !== null
          ? { latitude: driver.latitude, longitude: driver.longitude }
          : null,
      vehicles: driver.vehicles,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VEHICLE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async addVehicle(userId: number, dto: CreateVehicleDto) {
    const driver = await this.findDriverByUserId(userId);

    const duplicate = await this.prisma.vehicle.findFirst({
      where: {
        carNumberPlate: dto.carNumberPlate.toUpperCase(),
        deletedAt: null,
      },
    });
    if (duplicate)
      throw new BadRequestException(
        `Number plate '${dto.carNumberPlate}' is already in use`,
      );

    return this.prisma.vehicle.create({
      data: {
        carName: dto.carName,
        carColor: dto.carColor,
        carType: dto.carType,
        numberOfSeats: dto.numberOfSeats,
        carNumberPlate: dto.carNumberPlate.toUpperCase(),
        modelYear: dto.modelYear,
        driverId: driver.id,
        isActive: false,
      },
    });
  }

  async updateVehicle(
    userId: number,
    vehicleId: number,
    dto: Partial<CreateVehicleDto>,
  ) {
    const driver = await this.findDriverByUserId(userId);
    await this.findVehicleForDriver(vehicleId, driver.id);

    const data = { ...dto };
    if (data.carNumberPlate)
      data.carNumberPlate = data.carNumberPlate.toUpperCase();

    return this.prisma.vehicle.update({ where: { id: vehicleId }, data });
  }

  async deleteVehicle(userId: number, vehicleId: number) {
    const driver = await this.findDriverByUserId(userId);
    await this.findVehicleForDriver(vehicleId, driver.id);

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, carNumberPlate: true, deletedAt: true },
    });
  }

  /**
   * List non-deleted vehicles with pagination.
   * Default: page 1, 10 per page.
   */
  async getVehicles(userId: number, page = 1, limit = 10) {
    const driver = await this.findDriverByUserId(userId);
    const skip = (page - 1) * limit;

    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where: { driverId: driver.id, deletedAt: null },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({
        where: { driverId: driver.id, deletedAt: null },
      }),
    ]);

    return {
      data: vehicles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVehicleById(vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async setActiveVehicle(userId: number, vehicleId: number) {
    const driver = await this.findDriverByUserId(userId);
    await this.findVehicleForDriver(vehicleId, driver.id);

    await this.prisma.$transaction([
      this.prisma.vehicle.updateMany({
        where: { driverId: driver.id },
        data: { isActive: false },
      }),
      this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isActive: true },
      }),
    ]);

    return this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VEHICLE MEDIA
  // ─────────────────────────────────────────────────────────────────────────

  async updateVehiclePhotos(
    userId: number,
    vehicleId: number,
    photos: {
      photoFrontUrl?: string;
      photoBackUrl?: string;
      photoSideUrl?: string;
    },
  ) {
    const driver = await this.findDriverByUserId(userId);
    await this.findVehicleForDriver(vehicleId, driver.id);

    const data: Record<string, string> = {};
    if (photos.photoFrontUrl) data['photoFrontUrl'] = photos.photoFrontUrl;
    if (photos.photoBackUrl) data['photoBackUrl'] = photos.photoBackUrl;
    if (photos.photoSideUrl) data['photoSideUrl'] = photos.photoSideUrl;

    if (Object.keys(data).length === 0)
      throw new BadRequestException('No photo files were uploaded');

    return this.prisma.vehicle.update({ where: { id: vehicleId }, data });
  }

  async updateVehicleRegistration(
    userId: number,
    vehicleId: number,
    docs: { registrationFrontUrl?: string; registrationBackUrl?: string },
  ) {
    const driver = await this.findDriverByUserId(userId);
    await this.findVehicleForDriver(vehicleId, driver.id);

    const data: Record<string, string> = {};
    if (docs.registrationFrontUrl)
      data['registrationFrontUrl'] = docs.registrationFrontUrl;
    if (docs.registrationBackUrl)
      data['registrationBackUrl'] = docs.registrationBackUrl;

    if (Object.keys(data).length === 0)
      throw new BadRequestException('No registration files were uploaded');

    return this.prisma.vehicle.update({ where: { id: vehicleId }, data });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS & LOCATION
  // ─────────────────────────────────────────────────────────────────────────

  async updateStatus(userId: number, dto: UpdateDriverStatusDto) {
    const driver = await this.findDriverByUserId(userId);
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { isOnline: dto.isOnline },
      select: { id: true, isOnline: true, updatedAt: true },
    });
  }

  /**
   * Update GPS coordinates as separate lat/lng Float columns.
   * This replaces the old string "lat,lng" approach.
   * The Trip module can now query: WHERE latitude BETWEEN x AND y AND longitude BETWEEN a AND b
   */
  async updateLocation(userId: number, dto: UpdateDriverLocationDto) {
    const driver = await this.findDriverByUserId(userId);
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        updatedAt: true,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC PROFILE
  // ─────────────────────────────────────────────────────────────────────────

  async getDriverProfile(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        vehicles: { where: { isActive: true, deletedAt: null } },
        user: { select: { profileImage: true } },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  /**
   * Returns the driver rating.
   * totalTrips is a placeholder — the Trip module will supply the real count
   * by joining the trips table. When Trip module is ready, replace the 0
   * with: this.prisma.trip.count({ where: { driverId, status: 'COMPLETED' } })
   */
  async getDriverRatingSummary(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, rating: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return {
      driverId: driver.id,
      rating: driver.rating ?? 0,
      totalTrips: 0, // TODO: replace with Trip module count when available
    };
  }
}
