import { IsInt, IsPositive, IsNotEmpty } from 'class-validator';

export class CheckBookingEligibilityDto {
  @IsInt()
  @IsNotEmpty()
  rideId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  seatsNeeded: number;
}
