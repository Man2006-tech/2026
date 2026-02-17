import { IsInt, IsPositive, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @IsNotEmpty()
  rideId: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  seatsBooked: number;
}
