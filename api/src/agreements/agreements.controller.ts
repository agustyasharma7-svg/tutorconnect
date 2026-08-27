import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AgreementsService } from './agreements.service';
import { GenerateAgreementDto, SignAgreementDto } from './dto/agreement.dto';

@ApiTags('agreements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreements: AgreementsService) {}

  @Post('generate')
  @Roles(UserRole.STUDENT)
  generate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateAgreementDto) {
    return this.agreements.generate(user.sub, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  list(@CurrentUser() user: JwtPayload) {
    return this.agreements.listMine(user.sub, user.role as UserRole);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.agreements.getOne(user.sub, id, user.role as UserRole);
  }

  @Post(':id/sign')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  sign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SignAgreementDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    return this.agreements.sign(user.sub, id, user.role as UserRole, ip, dto);
  }
}
