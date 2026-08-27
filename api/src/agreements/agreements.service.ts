import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgreementStatus,
  MatchStatus,
  RequirementStatus,
  TeachingMode,
  UserRole,
  WeekDay,
} from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { MailService } from '../mail/mail.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { StudentsService } from '../students/students.service';
import { TutorsService } from '../tutors/tutors.service';
import { SchedulesService } from '../schedules/schedules.service';
import { CommissionsService } from '../commissions/commissions.service';
import { GenerateAgreementDto, SignAgreementDto } from './dto/agreement.dto';

type ScheduleRow = {
  day: WeekDay;
  startTime: string;
  endTime: string;
  mode?: TeachingMode;
};

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly cloudinary: CloudinaryService,
    private readonly students: StudentsService,
    private readonly tutors: TutorsService,
    private readonly schedules: SchedulesService,
    private readonly commissions: CommissionsService,
  ) {}

  private terms(data: {
    studentName: string;
    tutorName: string;
    subject: string;
    fee: number;
    schedule: ScheduleRow[];
  }) {
    const sched = data.schedule
      .map((s) => `${s.day} ${s.startTime}-${s.endTime} (${s.mode ?? 'ONLINE'})`)
      .join('; ');
    return (
      `TutorConnect India Tuition Agreement\n\n` +
      `Student: ${data.studentName}\n` +
      `Tutor: ${data.tutorName}\n` +
      `Subject: ${data.subject}\n` +
      `Monthly fee: INR ${data.fee}\n` +
      `Schedule: ${sched}\n\n` +
      `Both parties agree to the schedule and fee. Contact details are shared only after both signatures. ` +
      `Slots become OCCUPIED on activation. The student may release slots. A 15-minute buffer applies between sessions. ` +
      `Commission (if any) is handled separately by the platform and is not triggered by demo classes.`
    );
  }

  async generate(userId: string, dto: GenerateAgreementDto) {
    const { student } = await this.students.ensureProfile(userId);
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      include: {
        application: true,
        agreement: true,
        tutor: { include: { user: true } },
        requirement: {
          include: {
            subject: true,
            student: { include: { user: true } },
          },
        },
      },
    });
    if (!match || match.requirement.studentId !== student.id) {
      throw new NotFoundException('Match not found');
    }
    if (
      ![MatchStatus.SHORTLISTED, MatchStatus.ACCEPTED, MatchStatus.MATCHED].includes(
        match.status as never,
      )
    ) {
      throw new BadRequestException('Match must be shortlisted to generate agreement');
    }
    if (match.agreement) {
      return this.serialize(match.agreement.id);
    }

    const fee =
      dto.monthlyFee ??
      match.application?.proposedFee ??
      match.requirement.budgetMin;

    const schedule: ScheduleRow[] =
      dto.schedule?.length
        ? dto.schedule
        : match.requirement.scheduleDays.map((day) => ({
            day,
            startTime: match.requirement.scheduleTime ?? '17:00',
            endTime: this.addMinutes(
              match.requirement.scheduleTime ?? '17:00',
              match.requirement.durationMins,
            ),
            mode: TeachingMode.ONLINE,
          }));

    const termsText = this.terms({
      studentName: match.requirement.student.user.name,
      tutorName: match.tutor.user.name,
      subject: match.requirement.subject.nameEn,
      fee,
      schedule,
    });

    const agreement = await this.prisma.agreement.create({
      data: {
        matchId: match.id,
        monthlyFee: fee,
        scheduleJson: schedule,
        termsText,
        status: AgreementStatus.PENDING_STUDENT_SIGN,
      },
    });

    await this.audit.log({
      actorId: userId,
      action: 'AGREEMENT_GENERATED',
      entityType: 'Agreement',
      entityId: agreement.id,
    });

    return this.serialize(agreement.id);
  }

  private addMinutes(hm: string, mins: number) {
    const [h, m] = hm.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.STUDENT) {
      const { student } = await this.students.ensureProfile(userId);
      const rows = await this.prisma.agreement.findMany({
        where: { match: { requirement: { studentId: student.id } } },
        orderBy: { updatedAt: 'desc' },
      });
      return Promise.all(rows.map((r) => this.serialize(r.id)));
    }
    const { tutor } = await this.tutors.ensureProfile(userId);
    const rows = await this.prisma.agreement.findMany({
      where: { match: { tutorId: tutor.id } },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.serialize(r.id)));
  }

  async serialize(id: string) {
    const a = await this.prisma.agreement.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            tutor: { include: { user: { select: { name: true } } } },
            requirement: {
              include: {
                subject: true,
                class: true,
                student: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
        slots: {
          where: { status: 'OCCUPIED' },
          orderBy: { startAt: 'asc' },
          take: 20,
        },
      },
    });
    if (!a) throw new NotFoundException('Agreement not found');
    return {
      id: a.id,
      status: a.status,
      monthlyFee: a.monthlyFee,
      scheduleJson: a.scheduleJson,
      termsText: a.termsText,
      pdfUrl: a.pdfUrl,
      studentSignedAt: a.studentSignedAt,
      tutorSignedAt: a.tutorSignedAt,
      studentName: a.match.requirement.student.user.name,
      tutorName: a.match.tutor.user.name,
      subject: a.match.requirement.subject,
      class: a.match.requirement.class,
      matchId: a.matchId,
      requirementId: a.match.requirementId,
      requirementStatus: a.match.requirement.status,
      occupiedSlots: a.slots,
      contactVisible:
        a.status === AgreementStatus.ACTIVE ||
        a.status === AgreementStatus.COMPLETED,
    };
  }

  async getOne(userId: string, id: string, role: UserRole) {
    const a = await this.prisma.agreement.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            requirement: { include: { student: true } },
          },
        },
      },
    });
    if (!a) throw new NotFoundException('Agreement not found');
    if (role === UserRole.STUDENT) {
      const { student } = await this.students.ensureProfile(userId);
      if (a.match.requirement.studentId !== student.id) throw new ForbiddenException();
    } else if (role === UserRole.TUTOR) {
      const { tutor } = await this.tutors.ensureProfile(userId);
      if (a.match.tutorId !== tutor.id) throw new ForbiddenException();
    }
    return this.serialize(id);
  }

  async sign(userId: string, id: string, role: UserRole, ip: string, _dto: SignAgreementDto) {
    const a = await this.prisma.agreement.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            tutor: { include: { user: true } },
            requirement: {
              include: {
                subject: true,
                student: { include: { user: true } },
              },
            },
          },
        },
      },
    });
    if (!a) throw new NotFoundException('Agreement not found');

    if (role === UserRole.STUDENT) {
      const { student } = await this.students.ensureProfile(userId);
      if (a.match.requirement.studentId !== student.id) throw new ForbiddenException();
      if (a.studentSignedAt) throw new BadRequestException('Already signed');
      if (
        ![
          AgreementStatus.PENDING_STUDENT_SIGN,
          AgreementStatus.PENDING_TUTOR_SIGN,
          AgreementStatus.DRAFT,
        ].includes(a.status as never)
      ) {
        throw new BadRequestException('Cannot sign in current status');
      }
      await this.prisma.agreement.update({
        where: { id },
        data: {
          studentSignedAt: new Date(),
          studentSignIp: ip,
          status: a.tutorSignedAt
            ? AgreementStatus.ACTIVE
            : AgreementStatus.PENDING_TUTOR_SIGN,
        },
      });
    } else if (role === UserRole.TUTOR) {
      const { tutor } = await this.tutors.ensureProfile(userId);
      if (a.match.tutorId !== tutor.id) throw new ForbiddenException();
      if (a.tutorSignedAt) throw new BadRequestException('Already signed');
      if (!a.studentSignedAt && a.status === AgreementStatus.PENDING_STUDENT_SIGN) {
        throw new BadRequestException('Waiting for student signature');
      }
      await this.prisma.agreement.update({
        where: { id },
        data: {
          tutorSignedAt: new Date(),
          tutorSignIp: ip,
          status: a.studentSignedAt
            ? AgreementStatus.ACTIVE
            : AgreementStatus.PENDING_STUDENT_SIGN,
        },
      });
    } else {
      throw new ForbiddenException();
    }

    const refreshed = await this.prisma.agreement.findUniqueOrThrow({
      where: { id },
      include: {
        match: {
          include: {
            tutor: { include: { user: true } },
            requirement: {
              include: { student: { include: { user: true } } },
            },
          },
        },
      },
    });
    if (refreshed.status === AgreementStatus.ACTIVE) {
      await this.activate(id);
    } else {
      await this.audit.log({
        actorId: userId,
        action: 'AGREEMENT_SIGNED',
        entityType: 'Agreement',
        entityId: id,
        metadata: { role },
      });
      // Notify the other party that one signature is in
      if (role === UserRole.STUDENT) {
        void this.mail
          .sendAgreementSigned(refreshed.match.tutor.user.email, {
            name: refreshed.match.tutor.user.name,
            signerRole: 'Student',
          })
          .catch(() => undefined);
      } else {
        void this.mail
          .sendAgreementSigned(
            refreshed.match.requirement.student.user.email,
            {
              name: refreshed.match.requirement.student.user.name,
              signerRole: 'Tutor',
            },
          )
          .catch(() => undefined);
      }
    }

    return this.serialize(id);
  }

  private async activate(agreementId: string) {
    const a = await this.prisma.agreement.findUniqueOrThrow({
      where: { id: agreementId },
      include: {
        match: {
          include: {
            tutor: { include: { user: true } },
            requirement: {
              include: {
                subject: true,
                student: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    const schedule = a.scheduleJson as ScheduleRow[];
    await this.schedules.occupyAgreementSlots(
      a.match.tutorId,
      a.id,
      schedule,
      4,
    );

    const pdf = await this.buildPdf(a);
    const uploaded = await this.cloudinary.uploadRawPdf(
      pdf,
      `agreement-${a.id}.pdf`,
      'tutorconnect/agreements',
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.agreement.update({
        where: { id: a.id },
        data: {
          pdfUrl: uploaded.secure_url,
          pdfStorageKey: uploaded.public_id,
          status: AgreementStatus.ACTIVE,
        },
      });
      await tx.match.update({
        where: { id: a.matchId },
        data: { status: MatchStatus.MATCHED },
      });
      await tx.requirement.update({
        where: { id: a.match.requirementId },
        data: { status: RequirementStatus.ACTIVE },
      });
    });

    void this.mail
      .sendAgreementActive(a.match.requirement.student.user.email, {
        name: a.match.requirement.student.user.name,
      })
      .catch(() => undefined);
    void this.mail
      .sendAgreementActive(a.match.tutor.user.email, {
        name: a.match.tutor.user.name,
      })
      .catch(() => undefined);

    await this.audit.log({
      action: 'AGREEMENT_ACTIVE',
      entityType: 'Agreement',
      entityId: a.id,
    });

    void this.commissions.generateForAgreement(a.id).catch(() => undefined);
  }

  private async buildPdf(a: {
    id: string;
    termsText: string;
    monthlyFee: number;
    studentSignedAt: Date | null;
    tutorSignedAt: Date | null;
    match: {
      tutor: { user: { name: string } };
      requirement: {
        subject: { nameEn: string };
        student: { user: { name: string } };
      };
    };
  }) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    const draw = (text: string, size = 11, b = false) => {
      const lines = text.match(/.{1,90}/g) ?? [text];
      for (const line of lines) {
        page.drawText(line, {
          x: 50,
          y,
          size,
          font: b ? bold : font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= size + 6;
      }
    };
    draw('TutorConnect India — Tuition Agreement', 16, true);
    y -= 10;
    draw(a.termsText, 11);
    y -= 20;
    draw(
      `Student signed: ${a.studentSignedAt?.toISOString() ?? '—'}`,
      10,
    );
    draw(`Tutor signed: ${a.tutorSignedAt?.toISOString() ?? '—'}`, 10);
    draw(`Agreement ID: ${a.id}`, 9);
    return Buffer.from(await doc.save());
  }
}
