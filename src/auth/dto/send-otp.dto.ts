import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  phone: string;
}