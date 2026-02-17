import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

// dto/create-ride.dto.ts
export class CreateRideDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsDateString()
  departureDate: string; // "2026-02-15"

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/) // HH:MM format
  departureTime: string; // "14:00"

  @IsInt()
  @Min(1)
  availableSeats: number;
}
