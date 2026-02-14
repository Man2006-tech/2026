import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectDriverDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionReason: string;
}
