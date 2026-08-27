import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgreementStatus,
  DisputeStatus,
  DisputeType,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    role: UserRole,
    dto: {
      agreementId: string;
      type: DisputeType;
      description: string;
      evidenceUrls?: string[];
    },
  ) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: dto.agreementId },
      include: {
        match: {
          include: {
            tutor: true,
            requirement: { include: { student: true } },
          },
        },
      },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (
      ![AgreementStatus.ACTIVE, AgreementStatus.COMPLETED].includes(
        agreement.status as never,
      )
    ) {
      throw new BadRequestException(
        'Dispute only for ACTIVE or COMPLETED agreements',
      );
    }

    const studentUserId = agreement.match.requirement.student.userId;
    const tutorUserId = agreement.match.tutor.userId;
    const allowed =
      role === UserRole.ADMIN ||
      (role === UserRole.STUDENT && userId === studentUserId) ||
      (role === UserRole.TUTOR && userId === tutorUserId);
    if (!allowed) throw new ForbiddenException();

    const dispute = await this.prisma.dispute.create({
      data: {
        agreementId: dto.agreementId,
        raisedByUserId: userId,
        type: dto.type,
        description: dto.description.trim(),
        evidenceUrls: (dto.evidenceUrls ?? []) as Prisma.InputJsonValue,
        status: DisputeStatus.OPEN,
      },
    });

    await this.audit.log({
      actorId: userId,
      action: 'DISPUTE_CREATED',
      entityType: 'Dispute',
      entityId: dispute.id,
      metadata: { agreementId: dto.agreementId, type: dto.type },
    });

    // Does not auto-cancel agreement
    return this.serialize(dispute.id);
  }

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return this.listAdmin();
    }
    const rows = await this.prisma.dispute.findMany({
      where: {
        OR: [
          { raisedByUserId: userId },
          {
            agreement: {
              match: {
                OR: [
                  { tutor: { userId } },
                  { requirement: { student: { userId } } },
                ],
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return Promise.all(rows.map((r) => this.serialize(r.id)));
  }

  async listAdmin() {
    const rows = await this.prisma.dispute.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return Promise.all(rows.map((r) => this.serialize(r.id)));
  }

  async close(
    adminId: string,
    id: string,
    resolution: string,
  ) {
    if (!resolution || resolution.trim().length < 5) {
      throw new BadRequestException('Resolution notes required');
    }
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (
      dispute.status === DisputeStatus.CLOSED ||
      dispute.status === DisputeStatus.RESOLVED
    ) {
      throw new BadRequestException('Dispute already closed');
    }

    await this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution: resolution.trim(),
        resolvedAt: new Date(),
        resolvedBy: adminId,
      },
    });

    await this.audit.log({
      actorId: adminId,
      action: 'DISPUTE_RESOLVED',
      entityType: 'Dispute',
      entityId: id,
    });

    return this.serialize(id);
  }

  async getOne(userId: string, role: UserRole, id: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        agreement: {
          include: {
            match: {
              include: {
                tutor: true,
                requirement: { include: { student: true } },
              },
            },
          },
        },
        raisedBy: { select: { id: true, name: true, role: true } },
      },
    });
    if (!d) throw new NotFoundException('Dispute not found');
    if (role !== UserRole.ADMIN) {
      const studentUserId = d.agreement.match.requirement.student.userId;
      const tutorUserId = d.agreement.match.tutor.userId;
      if (userId !== studentUserId && userId !== tutorUserId) {
        throw new ForbiddenException();
      }
    }
    return this.serialize(id);
  }

  private async serialize(id: string) {
    const d = await this.prisma.dispute.findUniqueOrThrow({
      where: { id },
      include: {
        raisedBy: { select: { id: true, name: true, role: true } },
        agreement: {
          select: {
            id: true,
            status: true,
            monthlyFee: true,
            matchId: true,
          },
        },
      },
    });
    return {
      id: d.id,
      agreementId: d.agreementId,
      type: d.type,
      status: d.status,
      description: d.description,
      resolution: d.resolution,
      evidenceUrls: d.evidenceUrls,
      raisedBy: d.raisedBy,
      agreement: d.agreement,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
    };
  }
}
