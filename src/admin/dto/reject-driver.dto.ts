import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class RejectDriverDto {
    @IsEnum(VerificationStatus)
    status: VerificationStatus;

    @IsString()
    @IsNotEmpty()
    @Length(1, 500)
    rejectionReason: string;
}
