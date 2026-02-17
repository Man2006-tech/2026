import { IsEnum } from 'class-validator';

export enum RideStatus {
  SCHEDULED = 'SCHEDULED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateRideStatusDto {
  @IsEnum(RideStatus)
  status: RideStatus;
}
