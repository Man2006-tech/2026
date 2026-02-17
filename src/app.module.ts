import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { RidesModule } from './rides/rides.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RideRequestsModule } from './ride-requests/ride-requests.module';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    RidesModule,
    AdminModule,
    BookingsModule,
    ReviewsModule,
    RideRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
