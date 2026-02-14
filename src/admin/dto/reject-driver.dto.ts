import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class RejectDriverDto {
    @IsEnum(VerificationStatus)
    @IsNotEmpty()
    status: VerificationStatus;

    @IsString()
    @IsOptional()
    rejectionReason?: string;
}
