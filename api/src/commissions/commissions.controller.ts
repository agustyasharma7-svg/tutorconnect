import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommissionsService } from './commissions.service';

@ApiTags('commissions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.TUTOR)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.commissions.listForTutor(user.sub);
  }

  @Get(':id')
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.commissions.getForTutor(user.sub, id);
  }
}
