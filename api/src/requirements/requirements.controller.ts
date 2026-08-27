import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirementsService } from './requirements.service';
import {
  UpdateRequirementDto,
  UpsertRequirementDto,
} from './dto/requirement.dto';

@ApiTags('requirements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  create(@CurrentUser() user: JwtPayload, @Body() dto: UpsertRequirementDto) {
    return this.requirements.create(user.sub, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT)
  listMine(@CurrentUser() user: JwtPayload) {
    return this.requirements.listMine(user.sub);
  }

  @Get('open')
  @Roles(UserRole.TUTOR, UserRole.ADMIN)
  listOpen() {
    return this.requirements.listOpenForTutor();
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requirements.getOne(user.sub, id, user.role as UserRole);
  }

  @Patch(':id')
  @Roles(UserRole.STUDENT)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.requirements.update(user.sub, id, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.STUDENT)
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requirements.publish(user.sub, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.STUDENT)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requirements.cancel(user.sub, id);
  }

  @Post(':id/complete')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.requirements.complete(user.sub, id, user.role as UserRole);
  }
}
