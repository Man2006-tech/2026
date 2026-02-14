import {
  IsString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CarType } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  carName: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  carColor: string;

  @IsEnum(CarType, { message: 'carType must be ECONOMY or COMFORT' })
  carType: CarType;

  @Type(() => Number) // ← Needed when value arrives as a string from form-data / query
  @IsInt()
  @Min(1)
  @Max(7)
  numberOfSeats: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  carNumberPlate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  modelYear?: number;
}
