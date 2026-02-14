import { IsEnum, IsNotEmpty, IsString, IsOptional, Length } from 'class-validator';

export enum VerificationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    SUSPENDED = 'SUSPENDED',
    BANNED = 'BANNED',
}

export class RejectDriverDto {
    @IsNotEmpty()
    @IsEnum(VerificationStatus)
    status: VerificationStatus;

    @IsOptional()
    @IsString()
    @Length(1, 500)
    rejectionReason?: string;
}
