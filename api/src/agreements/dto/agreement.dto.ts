import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TeachingMode, WeekDay } from '@prisma/client';

export class AgreementScheduleItemDto {
  @IsEnum(WeekDay)
  day!: WeekDay;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsOptional()
  @IsEnum(TeachingMode)
  mode?: TeachingMode;
}

export class GenerateAgreementDto {
  @IsString()
  matchId!: string;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(200000)
  monthlyFee?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AgreementScheduleItemDto)
  schedule?: AgreementScheduleItemDto[];
}

export class SignAgreementDto {
  @IsOptional()
  @IsString()
  acknowledge?: string;
}
