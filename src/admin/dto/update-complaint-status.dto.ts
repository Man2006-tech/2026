import { IsNotEmpty } from 'class-validator';

export class UpdateComplaintStatusDto {
  @IsNotEmpty()
  status: string;
}
