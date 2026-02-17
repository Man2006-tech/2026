import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class RegisterPassengerDto {
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
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  district: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  country: string;

  @IsString()
  @IsOptional()
  profileImage?: string;
}
