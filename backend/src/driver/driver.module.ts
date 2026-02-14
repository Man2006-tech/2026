import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { S3UploadService } from './upload/s3-upload.service';
import { RolesGuard } from '../auth/roles.guard';

// ConfigModule and PrismaModule are both @Global() so they don't strictly need
// to be re-imported here, but PrismaModule is listed for explicitness.
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [DriverController],
  providers: [DriverService, S3UploadService, RolesGuard],
  exports: [DriverService],
})
export class DriverModule {}
