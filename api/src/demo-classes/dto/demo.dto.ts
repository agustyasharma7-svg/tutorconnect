import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DemoClassStatus, TeachingMode } from '@prisma/client';

export class BookDemoDto {
  @IsString()
  matchId!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(90)
  durationMins?: number;

  @IsOptional()
  @IsEnum(TeachingMode)
  mode?: TeachingMode;
}

export class UpdateDemoStatusDto {
  @IsEnum(DemoClassStatus)
  status!: DemoClassStatus;
}
