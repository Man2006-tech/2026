import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
