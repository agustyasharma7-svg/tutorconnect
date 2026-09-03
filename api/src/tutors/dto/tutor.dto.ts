import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeachingMode, WeekDay } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateTutorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({ enum: ['en', 'hi'] })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class UpdateTutorSubjectsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  subjectIds!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  classIds!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  boardIds!: string[];

  @ApiPropertyOptional({ description: 'Required when Subject "Other" is selected' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  otherSubjects?: string;

  @ApiPropertyOptional({ description: 'Required when Class "Other" is selected' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  otherClasses?: string;

  @ApiPropertyOptional({ description: 'Required when Board "Other" is selected' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  otherBoards?: string;
}

export class AvailabilitySlotDto {
  @ApiProperty({ enum: WeekDay })
  @IsEnum(WeekDay)
  day!: WeekDay;

  @ApiProperty({ example: '16:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @ApiProperty({ enum: TeachingMode })
  @IsEnum(TeachingMode)
  mode!: TeachingMode;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}

export class UpdateLocationDto {
  @ApiPropertyOptional({ enum: [5, 10, 20] })
  @IsOptional()
  @IsInt()
  teachingRadiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  @Max(38)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(68)
  @Max(98)
  longitude?: number;
}

export class RegistrationFeeChoiceDto {
  @ApiProperty({ enum: ['PAY_NOW', 'EARN_FIRST'] })
  @IsIn(['PAY_NOW', 'EARN_FIRST'])
  choice!: 'PAY_NOW' | 'EARN_FIRST';
}
