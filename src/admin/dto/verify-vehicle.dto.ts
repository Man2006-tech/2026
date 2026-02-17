import { IsBoolean, IsNotEmpty } from 'class-validator';

export class VerifyVehicleDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
