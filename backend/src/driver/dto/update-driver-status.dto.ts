import {
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateDriverStatusDto {
  /**
   * Online/offline toggle.
   * Accepts JSON boolean true/false or string "true"/"false".
   */
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
    return value;
  })
  @IsBoolean({ message: 'isOnline must be true or false' })
  isOnline: boolean;
}

export class UpdateDriverLocationDto {
  /**
   * Latitude — must be between -90 and 90.
   * Stored as a separate column for future geospatial queries in the Trip module.
   */
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90, { message: 'latitude must be >= -90' })
  @Max(90, { message: 'latitude must be <= 90' })
  latitude: number;

  /**
   * Longitude — must be between -180 and 180.
   */
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180, { message: 'longitude must be >= -180' })
  @Max(180, { message: 'longitude must be <= 180' })
  longitude: number;
}
