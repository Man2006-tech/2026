import { IsEnum, IsNotEmpty } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;
}
