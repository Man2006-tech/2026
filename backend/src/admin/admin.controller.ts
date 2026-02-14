import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Role,
  UserStatus,
  VerificationStatus,
  ComplaintStatus,
} from '@prisma/client';
import { RejectDriverDto } from '../driver/dto/reject-driver.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateRideSuspicionDto } from './dto/update-ride-suspicion.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  @Get('users')
  async getUsers() {
    this.logger.log('GET /admin/users');
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  async getUserProfile(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /admin/users/${id}`);
    return this.adminService.getUserProfile(id);
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    this.logger.log(`PUT /admin/users/${id}/status - ${dto.status}`);
    return this.adminService.updateUserStatus(id, dto.status);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER & VEHICLE VERIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────

  @Get('driver-verifications')
  async getPendingDrivers() {
    this.logger.log('GET /admin/driver-verifications');
    return this.adminService.getPendingDrivers();
  }

  @Get('driver-verifications/:id')
  async getDriverDetails(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /admin/driver-verifications/${id}`);
    return this.adminService.getDriverDetails(id);
  }

  @Put('driver-verifications/:id/verify')
  async verifyDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDriverDto & { status: VerificationStatus },
  ) {
    this.logger.log(
      `PUT /admin/driver-verifications/${id}/verify - ${dto.status}`,
    );
    return this.adminService.verifyDriver(
      id,
      dto.status,
      dto.status === VerificationStatus.REJECTED
        ? dto.rejectionReason
        : undefined,
    );
  }

  @Get('vehicle-verifications')
  async getPendingVehicles() {
    this.logger.log('GET /admin/vehicle-verifications');
    return this.adminService.getVehiclesForVerification();
  }

  @Put('vehicle-verifications/:id/verify')
  async verifyVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    this.logger.log(
      `PUT /admin/vehicle-verifications/${id}/verify - ${isActive}`,
    );
    return this.adminService.verifyVehicle(id, isActive);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RIDE & BOOKING OVERSIGHT
  // ─────────────────────────────────────────────────────────────────────────

  @Get('rides')
  async getAllRides() {
    this.logger.log('GET /admin/rides');
    return this.adminService.getAllRides();
  }

  @Put('rides/:id/suspicion')
  async toggleRideSuspicion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRideSuspicionDto,
  ) {
    this.logger.log(`PUT /admin/rides/${id}/suspicion - ${dto.isSuspicious}`);
    return this.adminService.toggleRideSuspicion(id, dto.isSuspicious);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLAINTS & SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  @Get('complaints')
  async getComplaints() {
    this.logger.log('GET /admin/complaints');
    return this.adminService.getComplaints();
  }

  @Put('complaints/:id/status')
  async updateComplaintStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    this.logger.log(`PUT /admin/complaints/${id}/status - ${dto.status}`);
    return this.adminService.updateComplaintStatus(id, dto.status);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD & STATISTICS
  // ─────────────────────────────────────────────────────────────────────────

  @Get('dashboard')
  async getDashboardStats() {
    this.logger.log('GET /admin/dashboard');
    return this.adminService.getDashboardStats();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM SETTINGS
  // ─────────────────────────────────────────────────────────────────────────

  @Get('settings')
  async getSystemSettings() {
    this.logger.log('GET /admin/settings');
    return this.adminService.getSystemSettings();
  }

  @Put('settings')
  async updateSystemSettings(@Body() dto: UpdateSystemSettingsDto) {
    this.logger.log('PUT /admin/settings');
    return this.adminService.updateSystemSettings(dto);
  }
}
