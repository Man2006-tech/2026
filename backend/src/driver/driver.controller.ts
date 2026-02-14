import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DriverService } from './driver.service';
import { S3UploadService } from './upload/s3-upload.service';
import { multerImageOptions } from './upload/multer.config';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import {
  UpdateDriverStatusDto,
  UpdateDriverLocationDto,
} from './dto/update-driver-status.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// ─── Extract authenticated userId from JWT payload ────────────────────────────
function getUserId(req: any): number {
  return Number(req.user?.userId ?? req.user?.sub);
}

// ─────────────────────────────────────────────────────────────────────────────

@Controller('driver')
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(
    private readonly driverService: DriverService,
    private readonly s3UploadService: S3UploadService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // RULE: Fixed-string routes MUST be declared before parameterised (:id) routes
  // ══════════════════════════════════════════════════════════════════════════

  // ─── Documents ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/driver/documents
   * Upload CNIC & licence images (multipart/form-data)
   * Fields: cnicFront, cnicBack, licenseFront, licenseBack  (all optional individually)
   * Limits: 5 MB per file, JPEG/PNG/WebP/HEIC only
   */
  @Post('documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cnicFront', maxCount: 1 },
        { name: 'cnicBack', maxCount: 1 },
        { name: 'licenseFront', maxCount: 1 },
        { name: 'licenseBack', maxCount: 1 },
      ],
      multerImageOptions,
    ),
  )
  async uploadDocuments(
    @Request() req: any,
    @UploadedFiles()
    files: {
      cnicFront?: Express.Multer.File[];
      cnicBack?: Express.Multer.File[];
      licenseFront?: Express.Multer.File[];
      licenseBack?: Express.Multer.File[];
    } = {},
  ) {
    const userId = getUserId(req);
    this.logger.log(`POST /driver/documents — userId: ${userId}`);

    // Upload each present file to S3 in parallel
    const [cnicFrontUrl, cnicBackUrl, licenseFrontUrl, licenseBackUrl] =
      await Promise.all([
        files?.cnicFront
          ? this.s3UploadService.uploadFile(files.cnicFront[0], 'documents')
          : Promise.resolve(undefined),
        files?.cnicBack
          ? this.s3UploadService.uploadFile(files.cnicBack[0], 'documents')
          : Promise.resolve(undefined),
        files?.licenseFront
          ? this.s3UploadService.uploadFile(files.licenseFront[0], 'documents')
          : Promise.resolve(undefined),
        files?.licenseBack
          ? this.s3UploadService.uploadFile(files.licenseBack[0], 'documents')
          : Promise.resolve(undefined),
      ]);

    return this.driverService.updateDocuments(userId, {
      cnicFrontUrl,
      cnicBackUrl,
      licenseFrontUrl,
      licenseBackUrl,
    });
  }

  /**
   * POST /api/v1/driver/selfie
   * Upload driver selfie (multipart/form-data)
   * Field: selfie
   * Limit: 5 MB, JPEG/PNG/WebP/HEIC only
   */
  @Post('selfie')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'selfie', maxCount: 1 }],
      multerImageOptions,
    ),
  )
  async uploadSelfie(
    @Request() req: any,
    @UploadedFiles() files: { selfie?: Express.Multer.File[] } = {},
  ) {
    const userId = getUserId(req);
    this.logger.log(`POST /driver/selfie — userId: ${userId}`);

    const selfieUrl = files?.selfie
      ? await this.s3UploadService.uploadFile(files.selfie[0], 'documents')
      : undefined;

    return this.driverService.updateSelfie(userId, selfieUrl);
  }

  // ─── Profile ────────────────────────────────────────────────────────────

  /**
   * PUT /api/v1/driver/profile
   * Update driver's personal profile fields (JSON body)
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    const userId = getUserId(req);
    this.logger.log(`PUT /driver/profile — userId: ${userId}`);
    return this.driverService.updateDriverProfile(userId, dto);
  }

  /**
   * GET /api/v1/driver/status
   * Get the authenticated driver's verification status and vehicle list
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getVerificationStatus(@Request() req: any) {
    const userId = getUserId(req);
    this.logger.log(`GET /driver/status — userId: ${userId}`);
    return this.driverService.getDriverStatus(userId);
  }

  // ─── Vehicle Management ─────────────────────────────────────────────────

  /**
   * GET /api/v1/driver/vehicles?page=1&limit=10
   * List all non-deleted vehicles for the authenticated driver (paginated)
   */
  @Get('vehicles')
  @UseGuards(JwtAuthGuard)
  async getMyVehicles(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = getUserId(req);
    this.logger.log(
      `GET /driver/vehicles — userId: ${userId}, page: ${page}, limit: ${limit}`,
    );
    return this.driverService.getVehicles(userId, page, limit);
  }

  /**
   * POST /api/v1/driver/vehicle
   * Add a new vehicle (JSON body)
   */
  @Post('vehicle')
  @UseGuards(JwtAuthGuard)
  async addVehicle(@Request() req: any, @Body() dto: CreateVehicleDto) {
    const userId = getUserId(req);
    this.logger.log(`POST /driver/vehicle — userId: ${userId}`);
    return this.driverService.addVehicle(userId, dto);
  }

  /**
   * PUT /api/v1/driver/vehicle/:id
   * Update an existing vehicle (JSON body, partial)
   */
  @Put('vehicle/:id')
  @UseGuards(JwtAuthGuard)
  async updateVehicle(
    @Request() req: any,
    @Param('id', ParseIntPipe) vehicleId: number,
    @Body() dto: Partial<CreateVehicleDto>,
  ) {
    const userId = getUserId(req);
    return this.driverService.updateVehicle(userId, vehicleId, dto);
  }

  /**
   * DELETE /api/v1/driver/vehicle/:id
   * Soft-delete a vehicle
   */
  @Delete('vehicle/:id')
  @UseGuards(JwtAuthGuard)
  async deleteVehicle(
    @Request() req: any,
    @Param('id', ParseIntPipe) vehicleId: number,
  ) {
    const userId = getUserId(req);
    return this.driverService.deleteVehicle(userId, vehicleId);
  }

  /**
   * PUT /api/v1/driver/vehicle/:id/activate
   * Set one vehicle as active, deactivates all others (atomic)
   */
  @Put('vehicle/:id/activate')
  @UseGuards(JwtAuthGuard)
  async activateVehicle(
    @Request() req: any,
    @Param('id', ParseIntPipe) vehicleId: number,
  ) {
    const userId = getUserId(req);
    return this.driverService.setActiveVehicle(userId, vehicleId);
  }

  /**
   * POST /api/v1/driver/vehicle/:id/photos
   * Upload vehicle exterior photos (multipart/form-data)
   * Fields: photoFront, photoBack, photoSide  (all optional individually)
   * Limit: 5 MB per file, JPEG/PNG/WebP/HEIC only
   */
  @Post('vehicle/:id/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photoFront', maxCount: 1 },
        { name: 'photoBack', maxCount: 1 },
        { name: 'photoSide', maxCount: 1 },
      ],
      multerImageOptions,
    ),
  )
  async uploadVehiclePhotos(
    @Request() req: any,
    @Param('id', ParseIntPipe) vehicleId: number,
    @UploadedFiles()
    files: {
      photoFront?: Express.Multer.File[];
      photoBack?: Express.Multer.File[];
      photoSide?: Express.Multer.File[];
    },
  ) {
    const userId = getUserId(req);
    this.logger.log(
      `POST /driver/vehicle/${vehicleId}/photos — userId: ${userId}`,
    );

    const [photoFrontUrl, photoBackUrl, photoSideUrl] = await Promise.all([
      files.photoFront
        ? this.s3UploadService.uploadFile(files.photoFront[0], 'vehicles')
        : Promise.resolve(undefined),
      files.photoBack
        ? this.s3UploadService.uploadFile(files.photoBack[0], 'vehicles')
        : Promise.resolve(undefined),
      files.photoSide
        ? this.s3UploadService.uploadFile(files.photoSide[0], 'vehicles')
        : Promise.resolve(undefined),
    ]);

    return this.driverService.updateVehiclePhotos(userId, vehicleId, {
      photoFrontUrl,
      photoBackUrl,
      photoSideUrl,
    });
  }

  /**
   * POST /api/v1/driver/vehicle/:id/registration
   * Upload vehicle registration document photos (multipart/form-data)
   * Fields: registrationFront, registrationBack  (both optional individually)
   * Limit: 5 MB per file, JPEG/PNG/WebP/HEIC only
   */
  @Post('vehicle/:id/registration')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'registrationFront', maxCount: 1 },
        { name: 'registrationBack', maxCount: 1 },
      ],
      multerImageOptions,
    ),
  )
  async uploadVehicleRegistration(
    @Request() req: any,
    @Param('id', ParseIntPipe) vehicleId: number,
    @UploadedFiles()
    files: {
      registrationFront?: Express.Multer.File[];
      registrationBack?: Express.Multer.File[];
    },
  ) {
    const userId = getUserId(req);
    this.logger.log(
      `POST /driver/vehicle/${vehicleId}/registration — userId: ${userId}`,
    );

    const [registrationFrontUrl, registrationBackUrl] = await Promise.all([
      files.registrationFront
        ? this.s3UploadService.uploadFile(
            files.registrationFront[0],
            'vehicles',
          )
        : Promise.resolve(undefined),
      files.registrationBack
        ? this.s3UploadService.uploadFile(files.registrationBack[0], 'vehicles')
        : Promise.resolve(undefined),
    ]);

    return this.driverService.updateVehicleRegistration(userId, vehicleId, {
      registrationFrontUrl,
      registrationBackUrl,
    });
  }

  // ─── Availability & Location ─────────────────────────────────────────────

  /**
   * PUT /api/v1/driver/availability
   * Toggle online/offline status
   * Body: { "isOnline": true }
   */
  @Put('availability')
  @UseGuards(JwtAuthGuard)
  async updateAvailability(
    @Request() req: any,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    const userId = getUserId(req);
    return this.driverService.updateStatus(userId, dto);
  }

  /**
   * POST /api/v1/driver/location
   * Update real-time GPS coordinates
   * Body: { "latitude": 33.6844, "longitude": 73.0479 }
   */
  @Post('location')
  @UseGuards(JwtAuthGuard)
  async updateLocation(
    @Request() req: any,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    const userId = getUserId(req);
    return this.driverService.updateLocation(userId, dto);
  }

  // ─── Public endpoints — no auth required ─────────────────────────────────
  // NOTE: These MUST be last — :id matches anything including "status", "vehicles" etc.

  /**
   * GET /api/v1/driver/:id
   * Public driver profile (used by passengers to view driver info)
   */
  @Get(':id')
  async getDriverProfile(@Param('id', ParseIntPipe) id: number) {
    return this.driverService.getDriverProfile(id);
  }

  /**
   * GET /api/v1/driver/:id/ratings
   * Public driver rating summary
   */
  @Get(':id/ratings')
  async getDriverRatings(@Param('id', ParseIntPipe) id: number) {
    return this.driverService.getDriverRatingSummary(id);
  }
}
