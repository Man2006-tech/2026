import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
  Length,
} from 'class-validator';

export class CreateRideRequestDto {
  // FROM location (matches frontend "From" field)
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  from: string;

  // TO location (matches frontend "To" field)
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  to: string;

  // Preferred earliest departure date
  @IsDateString()
  @IsNotEmpty()
  earliestDate: string; // "2026-02-20"

  // Preferred earliest departure time (matches frontend "Earliest" time)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  earliestTime: string; // "17:30" (matches frontend "Today, 5:30 PM")

  // Preferred latest departure time (matches frontend "Latest" time)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  latestTime: string; // "19:00" (matches frontend "Today, 7:00 PM")

  // Seats needed (matches frontend "Seats Needed" with +/- buttons)
  @IsInt()
  @Min(1)
  @Max(7)
  seatsNeeded: number;

  // Offer per seat (matches frontend "Offer per seat: $15-20")
  @IsNumber()
  @Min(0)
  @IsOptional()
  offerPerSeat?: number;
}
