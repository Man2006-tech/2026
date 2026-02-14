import { IsString, IsNotEmpty, Length, IsEnum, IsInt, Min, Max } from 'class-validator';

export class RegisterDriverDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(13, 15)
  cnic: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  carName: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  carColor: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  licenseNumber: string;

  @IsEnum(['ECONOMY', 'COMFORT'])
  carType: 'ECONOMY' | 'COMFORT';

  @IsInt()
  @Min(1)
  @Max(7)
  numberOfSeats: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  carNumberPlate: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  profession: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  organization: string;
}