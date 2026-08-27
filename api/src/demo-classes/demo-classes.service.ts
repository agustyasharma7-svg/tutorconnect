import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DemoClassStatus,
  MatchStatus,
  RequirementMode,
  SlotSource,
  TeachingMode,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { MailService } from '../mail/mail.service';
import { StudentsService } from '../students/students.service';
import { TutorsService } from '../tutors/tutors.service';
import { SchedulesService } from '../schedules/schedules.service';
import { BookDemoDto, UpdateDemoStatusDto } from './dto/demo.dto';

@Injectable()
export class DemoClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly students: StudentsService,
    private readonly tutors: TutorsService,
    private readonly schedules: SchedulesService,
  ) {}

  private joinDetails(mode: TeachingMode, pincode?: string | null) {
    if (mode === TeachingMode.ONLINE) {
      return `Join link (platform): https://meet.tutorconnect.in/demo/${Date.now().toString(36)}`;
    }
    return `Offline demo address shared via platform near pincode ${pincode ?? 'N/A'}. Contact hidden until agreement.`;
  }

  async book(userId: string, dto: BookDemoDto) {
    const { student } = await this.students.ensureProfile(userId);
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      include: {
        requirement: true,
        tutor: { include: { user: true } },
        demoClasses: true,
      },
    });
    if (!match || match.requirement.studentId !== student.id) {
      throw new NotFoundException('Match not found');
    }
    if (match.status !== MatchStatus.SHORTLISTED) {
      throw new BadRequestException('Demo only allowed after shortlist');
    }
    if (match.demoClasses.length > 0) {
      throw new BadRequestException(
        'Only one demo per tutor–student pair per requirement',
      );
    }

    const mode =
      dto.mode ??
      (match.requirement.mode === RequirementMode.OFFLINE
        ? TeachingMode.OFFLINE
        : TeachingMode.ONLINE);

    const startAt = this.schedules.parseIstDateTime(dto.scheduledAt);
    const durationMins = dto.durationMins ?? 45;
    const endAt = new Date(startAt.getTime() + durationMins * 60 * 1000);
    if (startAt.getTime() < Date.now() + 30 * 60 * 1000) {
      throw new BadRequestException('Demo must be at least 30 minutes from now');
    }

    await this.schedules.assertNoConflict(match.tutorId, startAt, endAt);

    const demo = await this.prisma.$transaction(async (tx) => {
      const d = await tx.demoClass.create({
        data: {
          matchId: match.id,
          scheduledAt: startAt,
          durationMins,
          mode,
          status: DemoClassStatus.SCHEDULED,
          joinDetails: this.joinDetails(mode, match.requirement.pincode),
        },
      });
      await tx.scheduleSlot.create({
        data: {
          tutorId: match.tutorId,
          startAt,
          endAt,
          status: 'OCCUPIED',
          source: SlotSource.DEMO,
          demoClassId: d.id,
          mode,
        },
      });
      return d;
    });

    const studentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    void this.mail
      .sendDemoScheduled(match.tutor.user.email, {
        name: match.tutor.user.name,
        when: startAt.toISOString(),
        mode,
      })
      .catch(() => undefined);
    if (studentUser) {
      void this.mail
        .sendDemoScheduled(studentUser.email, {
          name: studentUser.name,
          when: startAt.toISOString(),
          mode,
        })
        .catch(() => undefined);
    }

    await this.audit.log({
      actorId: userId,
      action: 'DEMO_BOOKED',
      entityType: 'DemoClass',
      entityId: demo.id,
    });

    return this.getOne(userId, demo.id, UserRole.STUDENT);
  }

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.STUDENT) {
      const { student } = await this.students.ensureProfile(userId);
      return this.prisma.demoClass.findMany({
        where: { match: { requirement: { studentId: student.id } } },
        include: {
          match: {
            include: {
              tutor: { include: { user: { select: { name: true } } } },
              requirement: {
                include: { subject: true, class: true },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      });
    }
    const { tutor } = await this.tutors.ensureProfile(userId);
    return this.prisma.demoClass.findMany({
      where: { match: { tutorId: tutor.id } },
      include: {
        match: {
          include: {
            requirement: {
              include: {
                subject: true,
                class: true,
                student: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getOne(userId: string, id: string, role: UserRole) {
    const demo = await this.prisma.demoClass.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            tutor: { include: { user: true } },
            requirement: {
              include: {
                subject: true,
                class: true,
                board: true,
                student: { include: { user: true } },
              },
            },
          },
        },
      },
    });
    if (!demo) throw new NotFoundException('Demo not found');

    if (role === UserRole.STUDENT) {
      const { student } = await this.students.ensureProfile(userId);
      if (demo.match.requirement.studentId !== student.id) {
        throw new ForbiddenException();
      }
    } else if (role === UserRole.TUTOR) {
      const { tutor } = await this.tutors.ensureProfile(userId);
      if (demo.match.tutorId !== tutor.id) throw new ForbiddenException();
    }

    return {
      id: demo.id,
      status: demo.status,
      scheduledAt: demo.scheduledAt,
      durationMins: demo.durationMins,
      mode: demo.mode,
      joinDetails: demo.joinDetails,
      tutorName: demo.match.tutor.user.name,
      studentName: demo.match.requirement.student.user.name,
      subject: demo.match.requirement.subject,
      class: demo.match.requirement.class,
      board: demo.match.requirement.board,
      matchId: demo.matchId,
      contactHidden: true,
    };
  }

  async updateStatus(userId: string, id: string, dto: UpdateDemoStatusDto) {
    const demo = await this.prisma.demoClass.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            requirement: {
              include: { student: { include: { user: true } } },
            },
            tutor: { include: { user: true } },
          },
        },
      },
    });
    if (!demo) throw new NotFoundException('Demo not found');

    const student = await this.prisma.student.findUnique({ where: { userId } });
    const tutor = await this.prisma.tutor.findUnique({ where: { userId } });
    const isStudent =
      student && demo.match.requirement.studentId === student.id;
    const isTutor = tutor && demo.match.tutorId === tutor.id;
    if (!isStudent && !isTutor) throw new ForbiddenException();

    if (demo.status !== DemoClassStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot change status from ${demo.status} — only SCHEDULED demos can be updated`,
      );
    }

    const allowed: DemoClassStatus[] = [
      DemoClassStatus.COMPLETED,
      DemoClassStatus.CANCELLED,
      DemoClassStatus.NO_SHOW,
    ];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException('Invalid status transition');
    }

    // NO_SHOW: either party may mark; typically after scheduled time
    if (dto.status === DemoClassStatus.NO_SHOW && !isTutor && !isStudent) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.demoClass.update({
        where: { id },
        data: { status: dto.status },
      });
      await tx.scheduleSlot.updateMany({
        where: { demoClassId: id, status: 'OCCUPIED' },
        data: { status: 'RELEASED' },
      });
      return d;
    });

    const tutorUser = demo.match.tutor.user;
    const studentUser = demo.match.requirement.student.user;

    if (dto.status === DemoClassStatus.COMPLETED) {
      void this.mail
        .sendDemoCompleted(tutorUser.email, { name: tutorUser.name })
        .catch(() => undefined);
      void this.mail
        .sendDemoCompleted(studentUser.email, { name: studentUser.name })
        .catch(() => undefined);
    } else {
      void this.mail
        .sendDemoCancelled(tutorUser.email, {
          name: tutorUser.name,
          status: dto.status,
        })
        .catch(() => undefined);
      void this.mail
        .sendDemoCancelled(studentUser.email, {
          name: studentUser.name,
          status: dto.status,
        })
        .catch(() => undefined);
    }

    await this.audit.log({
      actorId: userId,
      action: 'DEMO_STATUS',
      entityType: 'DemoClass',
      entityId: id,
      metadata: { status: dto.status },
    });

    return updated;
  }
}
