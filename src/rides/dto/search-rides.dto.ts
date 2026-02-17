import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class SearchRidesDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsDateString()
  departureDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
