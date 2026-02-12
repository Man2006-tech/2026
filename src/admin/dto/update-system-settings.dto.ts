import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSystemSettingsDto {
  @IsNumber()
  @IsOptional()
  baseFare?: number;

  @IsNumber()
  @IsOptional()
  perKmRate?: number;

  @IsNumber()
  @IsOptional()
  surgeMultiplier?: number;

  @IsString()
  @IsOptional()
  safetyMessage?: string;

  @IsString()
  @IsOptional()
  announcement?: string;
}
