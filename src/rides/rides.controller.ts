import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Put,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RidesService } from './rides.service';
import { VerifiedDriverGuard } from 'src/common/guards/verified-driver.guard';
import { CreateRideDto } from './dto/create-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';
import { UpdateRideDto } from './dto/update-ride.dto';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  // ========================================
  // PUBLIC ENDPOINTS
  // ========================================

  // Browse upcoming rides
  @Get('upcoming')
  async getUpcomingRides(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ridesService.getUpcomingRides({ from, to, page, limit });
  }

  // View single ride (public)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ridesService.findOne(id);
  }

  // ========================================
  // AUTHENTICATED ENDPOINTS
  // ========================================

  // Search for rides (with filters)
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query() dto: SearchRidesDto) {
    return this.ridesService.search(dto);
  }

  // ========================================
  // DRIVER ENDPOINTS
  // ========================================

  // Create a ride (verified drivers only)
  @Post()
  @UseGuards(JwtAuthGuard, VerifiedDriverGuard)
  async create(@Request() req, @Body() dto: CreateRideDto) {
    return this.ridesService.create(req.user.id, dto);
  }

  // See my posted rides
  @Get('my-rides')
  @UseGuards(JwtAuthGuard)
  async getMyRides(@Request() req, @Query('status') status?: string) {
    return this.ridesService.getMyRides(req.user.id, status);
  }

  // Get passengers for my ride
  //   @Get(':id/passengers')
  //   @UseGuards(JwtAuthGuard)
  //   async getRidePassengers(@Param('id', ParseIntPipe) id: number, @Request() req) {
  //     return this.ridesService.getRidePassengers(id, req.user.id);
  //   }

  // Update ride details
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateRide(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: UpdateRideDto,
  ) {
    return this.ridesService.updateRide(id, req.user.id, dto);
  }

  // Change ride status
  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateRideStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: UpdateRideStatusDto,
  ) {
    return this.ridesService.updateRideStatus(id, req.user.id, dto);
  }

  // Cancel ride
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelRide(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ridesService.cancelRide(id, req.user.id);
  }
}
