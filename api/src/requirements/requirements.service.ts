import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgreementStatus,
  MatchStatus,
  RequirementMode,
  RequirementStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { StudentsService } from '../students/students.service';
import { geocodePincode } from '../common/geo';
import { MatchingService } from '../matches/matching.service';
import { UpdateRequirementDto, UpsertRequirementDto } from './dto/requirement.dto';

const DRAFT_EDITABLE: RequirementStatus[] = [RequirementStatus.DRAFT];
const CANCELABLE: RequirementStatus[] = [
  RequirementStatus.DRAFT,
  RequirementStatus.OPEN,
  RequirementStatus.APPLIED,
  RequirementStatus.SHORTLISTED,
  RequirementStatus.MATCHED,
];

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly students: StudentsService,
    private readonly matching: MatchingService,
  ) {}

  private serialize(req: {
    id: string;
    studentId: string;
    subjectId: string;
    classId: string;
    boardId: string;
    budgetMin: number;
    budgetMax: number;
    mode: RequirementMode;
    scheduleDays: string[];
    scheduleTime: string | null;
    durationMins: number;
    pincode: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
    status: RequirementStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    subject?: { id: string; nameEn: string; nameHi: string };
    class?: { id: string; nameEn: string; nameHi: string };
    board?: { id: string; nameEn: string; nameHi: string };
    matches?: unknown[];
  }) {
    return {
      id: req.id,
      studentId: req.studentId,
      subjectId: req.subjectId,
      classId: req.classId,
      boardId: req.boardId,
      budgetMin: req.budgetMin,
      budgetMax: req.budgetMax,
      mode: req.mode,
      scheduleDays: req.scheduleDays,
      scheduleTime: req.scheduleTime,
      durationMins: req.durationMins,
      pincode: req.pincode,
      address: req.address,
      latitude: req.latitude,
      longitude: req.longitude,
      notes: req.notes,
      status: req.status,
      publishedAt: req.publishedAt,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      subject: req.subject,
      class: req.class,
      board: req.board,
      matchCount: Array.isArray(req.matches) ? req.matches.length : undefined,
    };
  }

  private include = {
    subject: true,
    class: true,
    board: true,
    matches: { select: { id: true } },
  } as const;

  private validateLocation(mode: RequirementMode, pincode?: string | null) {
    if ((mode === RequirementMode.OFFLINE || mode === RequirementMode.BOTH) && !pincode) {
      throw new BadRequestException('Pincode is required for offline/both mode');
    }
  }

  private locationFields(mode: RequirementMode, pincode?: string | null, address?: string | null) {
    this.validateLocation(mode, pincode);
    if (!pincode) {
      return { pincode: null, address: address ?? null, latitude: null, longitude: null };
    }
    const coords = geocodePincode(pincode);
    return {
      pincode,
      address: address ?? null,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  async create(userId: string, dto: UpsertRequirementDto) {
    const { student } = await this.students.ensureProfile(userId);
    if (dto.budgetMax < dto.budgetMin) {
      throw new BadRequestException('budgetMax must be >= budgetMin');
    }
    const loc = this.locationFields(dto.mode, dto.pincode, dto.address);
    const req = await this.prisma.requirement.create({
      data: {
        studentId: student.id,
        subjectId: dto.subjectId,
        classId: dto.classId,
        boardId: dto.boardId,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        mode: dto.mode,
        scheduleDays: dto.scheduleDays,
        scheduleTime: dto.scheduleTime,
        durationMins: dto.durationMins ?? 60,
        notes: dto.notes,
        status: RequirementStatus.DRAFT,
        ...loc,
      },
      include: this.include,
    });
    await this.audit.log({
      actorId: userId,
      action: 'REQUIREMENT_CREATED',
      entityType: 'Requirement',
      entityId: req.id,
    });
    return this.serialize(req);
  }

  async listMine(userId: string) {
    const { student } = await this.students.ensureProfile(userId);
    const rows = await this.prisma.requirement.findMany({
      where: { studentId: student.id },
      include: this.include,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async getOne(userId: string, id: string, role: UserRole) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      include: {
        ...this.include,
        student: { include: { user: { select: { name: true } } } },
      },
    });
    if (!req) throw new NotFoundException('Requirement not found');

    if (role === UserRole.STUDENT) {
      const { student } = await this.students.ensureProfile(userId);
      if (req.studentId !== student.id) throw new ForbiddenException();
    } else if (role === UserRole.TUTOR) {
      if (
        ![
          RequirementStatus.OPEN,
          RequirementStatus.APPLIED,
          RequirementStatus.SHORTLISTED,
        ].includes(req.status as never)
      ) {
        throw new ForbiddenException('Requirement is not open');
      }
    } else if (role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    return {
      ...this.serialize(req),
      studentName: role === UserRole.STUDENT || role === UserRole.ADMIN ? req.student.user.name : undefined,
    };
  }

  async update(userId: string, id: string, dto: UpdateRequirementDto) {
    const { student } = await this.students.ensureProfile(userId);
    const existing = await this.prisma.requirement.findUnique({ where: { id } });
    if (!existing || existing.studentId !== student.id) {
      throw new NotFoundException('Requirement not found');
    }
    if (!DRAFT_EDITABLE.includes(existing.status)) {
      throw new BadRequestException('Only draft requirements can be edited');
    }
    const budgetMin = dto.budgetMin ?? existing.budgetMin;
    const budgetMax = dto.budgetMax ?? existing.budgetMax;
    if (budgetMax < budgetMin) {
      throw new BadRequestException('budgetMax must be >= budgetMin');
    }
    const mode = dto.mode ?? existing.mode;
    const pincode = dto.pincode !== undefined ? dto.pincode : existing.pincode;
    const address = dto.address !== undefined ? dto.address : existing.address;
    const loc = this.locationFields(mode, pincode, address);

    const req = await this.prisma.requirement.update({
      where: { id },
      data: {
        subjectId: dto.subjectId,
        classId: dto.classId,
        boardId: dto.boardId,
        budgetMin,
        budgetMax,
        mode,
        scheduleDays: dto.scheduleDays,
        scheduleTime: dto.scheduleTime,
        durationMins: dto.durationMins,
        notes: dto.notes,
        ...loc,
      },
      include: this.include,
    });
    await this.audit.log({
      actorId: userId,
      action: 'REQUIREMENT_UPDATED',
      entityType: 'Requirement',
      entityId: id,
      metadata: dto as object,
    });
    return this.serialize(req);
  }

  async publish(userId: string, id: string) {
    const { student } = await this.students.ensureProfile(userId);
    const existing = await this.prisma.requirement.findUnique({ where: { id } });
    if (!existing || existing.studentId !== student.id) {
      throw new NotFoundException('Requirement not found');
    }
    if (existing.status !== RequirementStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be published');
    }
    this.validateLocation(existing.mode, existing.pincode);
    if (!existing.scheduleDays.length) {
      throw new BadRequestException('Schedule days are required');
    }

    const req = await this.prisma.requirement.update({
      where: { id },
      data: {
        status: RequirementStatus.OPEN,
        publishedAt: new Date(),
      },
      include: this.include,
    });

    await this.audit.log({
      actorId: userId,
      action: 'REQUIREMENT_PUBLISHED',
      entityType: 'Requirement',
      entityId: id,
    });

    // Free publish — notify top matched tutors (non-blocking for response)
    void this.matching.notifyTopMatches(id).catch(() => undefined);

    return this.serialize(req);
  }

  async cancel(userId: string, id: string) {
    const { student } = await this.students.ensureProfile(userId);
    const existing = await this.prisma.requirement.findUnique({ where: { id } });
    if (!existing || existing.studentId !== student.id) {
      throw new NotFoundException('Requirement not found');
    }
    if (!CANCELABLE.includes(existing.status)) {
      throw new BadRequestException('Cannot cancel at this status');
    }
    const req = await this.prisma.requirement.update({
      where: { id },
      data: { status: RequirementStatus.CANCELLED },
      include: this.include,
    });
    await this.audit.log({
      actorId: userId,
      action: 'REQUIREMENT_CANCELLED',
      entityType: 'Requirement',
      entityId: id,
    });
    return this.serialize(req);
  }

  async complete(userId: string, id: string, role: UserRole) {
    const existing = await this.prisma.requirement.findUnique({
      where: { id },
      include: {
        student: true,
        matches: {
          where: { status: MatchStatus.MATCHED },
          include: { agreement: true },
        },
      },
    });
    if (!existing) throw new NotFoundException('Requirement not found');
    if (role !== UserRole.STUDENT && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    if (role === UserRole.STUDENT && existing.student.userId !== userId) {
      throw new ForbiddenException();
    }
    if (existing.status !== RequirementStatus.ACTIVE) {
      throw new BadRequestException(
        'Only ACTIVE requirements can be marked COMPLETED',
      );
    }
    const activeAgreement = existing.matches
      .map((m) => m.agreement)
      .find((a) => a && a.status === AgreementStatus.ACTIVE);
    if (!activeAgreement) {
      throw new BadRequestException('No ACTIVE agreement linked');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.requirement.update({
        where: { id },
        data: { status: RequirementStatus.COMPLETED },
      });
      await tx.agreement.update({
        where: { id: activeAgreement.id },
        data: { status: AgreementStatus.COMPLETED },
      });
    });

    await this.audit.log({
      actorId: userId,
      action: 'REQUIREMENT_COMPLETED',
      entityType: 'Requirement',
      entityId: id,
      metadata: { agreementId: activeAgreement.id },
    });

    const req = await this.prisma.requirement.findUniqueOrThrow({
      where: { id },
      include: this.include,
    });
    return this.serialize(req);
  }

  async listOpenForTutor() {
    const rows = await this.prisma.requirement.findMany({
      where: {
        status: {
          in: [
            RequirementStatus.OPEN,
            RequirementStatus.APPLIED,
            RequirementStatus.SHORTLISTED,
          ],
        },
      },
      include: this.include,
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
    // Pre-agreement privacy: hide exact address/coords from open browse
    return rows.map((r) => {
      const s = this.serialize(r);
      return {
        ...s,
        address: null,
        latitude: null,
        longitude: null,
        // keep pincode for coarse location / offline filter only
      };
    });
  }
}
