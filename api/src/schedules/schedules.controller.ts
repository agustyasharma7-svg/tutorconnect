import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { SchedulesService } from './schedules.service';
import { TutorsService } from '../tutors/tutors.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../common/audit.service';

class AddExceptionDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  reason?: string;
}

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(
    private readonly schedules: SchedulesService,
    private readonly tutors: TutorsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  @Get('calendar')
  @Roles(UserRole.TUTOR, UserRole.STUDENT, UserRole.ADMIN)
  async calendar(
    @CurrentUser() user: JwtPayload,
    @Query('tutorId') tutorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let id = tutorId;
    if (user.role === UserRole.TUTOR) {
      const { tutor } = await this.tutors.ensureProfile(user.sub);
      id = tutor.id;
    } else if (user.role === UserRole.STUDENT) {
      id =
        (await this.schedules.resolveStudentTutorId(user.sub, tutorId)) ??
        undefined;
    }
    if (!id) {
      throw new BadRequestException(
        'tutorId query param is required (or activate an agreement first)',
      );
    }
    const start = from ? new Date(from) : new Date();
    const end = to
      ? new Date(to)
      : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    return this.schedules.calendar(id, start, end);
  }

  @Get('exceptions')
  @Roles(UserRole.TUTOR)
  async listExceptions(@CurrentUser() user: JwtPayload) {
    const { tutor } = await this.tutors.ensureProfile(user.sub);
    return this.schedules.listExceptions(tutor.id);
  }

  @Post('exceptions')
  @Roles(UserRole.TUTOR)
  async addException(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddExceptionDto,
  ) {
    const { tutor } = await this.tutors.ensureProfile(user.sub);
    const row = await this.schedules.addException(
      tutor.id,
      dto.date,
      dto.reason,
    );
    await this.audit.log({
      actorId: user.sub,
      action: 'AVAILABILITY_EXCEPTION_ADDED',
      entityType: 'TutorAvailabilityException',
      entityId: row.id,
      metadata: { date: dto.date },
    });
    return row;
  }

  @Delete('exceptions/:id')
  @Roles(UserRole.TUTOR)
  async removeException(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const { tutor } = await this.tutors.ensureProfile(user.sub);
    const result = await this.schedules.removeException(tutor.id, id);
    await this.audit.log({
      actorId: user.sub,
      action: 'AVAILABILITY_EXCEPTION_REMOVED',
      entityType: 'TutorAvailabilityException',
      entityId: id,
    });
    return result;
  }

  @Post('slots/:id/release')
  @Roles(UserRole.STUDENT)
  async release(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.schedules.releaseSlot(user.sub, id);
    void this.mail
      .sendSlotReleased(result.tutorEmail, { name: result.tutorName })
      .catch(() => undefined);
    await this.audit.log({
      actorId: user.sub,
      action: 'SLOT_RELEASED',
      entityType: 'ScheduleSlot',
      entityId: id,
    });
    return result.slot;
  }
}
