import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RatingsService } from './ratings.service';

class CreateRatingDto {
  @IsUUID()
  agreementId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  review?: string;
}

@ApiTags('ratings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.STUDENT, UserRole.TUTOR)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRatingDto) {
    return this.ratings.create(user.sub, user.role as UserRole, dto);
  }

  @Get('agreement/:agreementId')
  forAgreement(
    @CurrentUser() user: JwtPayload,
    @Param('agreementId') agreementId: string,
  ) {
    return this.ratings.listForAgreement(user.sub, agreementId);
  }
}
