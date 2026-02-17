import {
  IsInt,
  IsString,
  IsNotEmpty,
  Min,
  Max,
  IsOptional,
  MaxLength,
  IsArray,
} from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @IsNotEmpty()
  bookingId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(250)
  comment?: string;
}
