import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RequirementMode } from '@prisma/client';

export class ApplyMatchDto {
  @IsString()
  requirementId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(200000)
  proposedFee?: number;
}

export class InviteMatchDto {
  @IsString()
  requirementId!: string;

  @IsString()
  tutorId!: string;
}

export class SearchTutorsQueryDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  boardId?: string;

  @IsOptional()
  @IsEnum(RequirementMode)
  mode?: RequirementMode;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  @Max(38)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(68)
  @Max(98)
  longitude?: number;
}
