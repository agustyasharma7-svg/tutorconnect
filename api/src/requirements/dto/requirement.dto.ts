import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RequirementMode, WeekDay } from '@prisma/client';

export class UpsertRequirementDto {
  @IsString()
  subjectId!: string;

  @IsString()
  classId!: string;

  @IsString()
  boardId!: string;

  @IsInt()
  @Min(500)
  @Max(200000)
  budgetMin!: number;

  @IsInt()
  @Min(500)
  @Max(200000)
  budgetMax!: number;

  @IsEnum(RequirementMode)
  mode!: RequirementMode;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WeekDay, { each: true })
  scheduleDays!: WeekDay[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  scheduleTime?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(180)
  durationMins?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateRequirementDto {
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
  @IsInt()
  @Min(500)
  @Max(200000)
  budgetMin?: number;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(200000)
  budgetMax?: number;

  @IsOptional()
  @IsEnum(RequirementMode)
  mode?: RequirementMode;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WeekDay, { each: true })
  scheduleDays?: WeekDay[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  scheduleTime?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(180)
  durationMins?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
