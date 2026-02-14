import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateOfBirth must be a valid ISO 8601 date string' },
  )
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'], {
    message: 'gender must be MALE, FEMALE, or OTHER',
  })
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  drivingExperience?: number;

  // e.g. ["Mon","Tue","Wed"]
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableWeekdays?: string[];

  // e.g. ["09:00-17:00"]
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableTimeSlots?: string[];
}
