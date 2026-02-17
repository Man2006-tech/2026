import { Module } from '@nestjs/common';
import { RideRequestsController } from './ride-requests.controller';
import { RideRequestsService } from './ride-requests.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RideRequestsController],
  providers: [RideRequestsService],
  exports: [RideRequestsService],
})
export class RideRequestsModule {}
