import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

export class UpdateRideDto {
  @IsDateString()
  departureDate: string;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/) // HH:MM format
  departureTime: string;

  @IsInt()
  @Min(1)
  availableSeats: number;
}
