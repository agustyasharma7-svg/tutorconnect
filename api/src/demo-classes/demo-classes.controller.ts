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
import { DemoClassesService } from './demo-classes.service';
import { BookDemoDto, UpdateDemoStatusDto } from './dto/demo.dto';

@ApiTags('demo-classes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('demo-classes')
export class DemoClassesController {
  constructor(private readonly demos: DemoClassesService) {}

  @Post('book')
  @Roles(UserRole.STUDENT)
  book(@CurrentUser() user: JwtPayload, @Body() dto: BookDemoDto) {
    return this.demos.book(user.sub, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  list(@CurrentUser() user: JwtPayload) {
    return this.demos.listMine(user.sub, user.role as UserRole);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demos.getOne(user.sub, id, user.role as UserRole);
  }

  @Patch(':id/status')
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  status(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDemoStatusDto,
  ) {
    return this.demos.updateStatus(user.sub, id, dto);
  }
}
