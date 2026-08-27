import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgreementStatus,
  RequirementStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    role: UserRole,
    dto: { agreementId: string; score: number; review?: string },
  ) {
    if (dto.score < 1 || dto.score > 5) {
      throw new BadRequestException('Score must be 1–5');
    }
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
    if (agreement.match.requirement.status !== RequirementStatus.COMPLETED) {
      throw new BadRequestException(
        'Ratings only allowed after requirement is COMPLETED',
      );
    }

    const studentUserId = agreement.match.requirement.student.userId;
    const tutorUserId = agreement.match.tutor.userId;
    let rateeUserId: string;
    if (role === UserRole.STUDENT && userId === studentUserId) {
      rateeUserId = tutorUserId;
    } else if (role === UserRole.TUTOR && userId === tutorUserId) {
      rateeUserId = studentUserId;
    } else {
      throw new ForbiddenException();
    }

    const existing = await this.prisma.rating.findUnique({
      where: {
        agreementId_raterUserId: {
          agreementId: dto.agreementId,
          raterUserId: userId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('You already rated this engagement');
    }

    const rating = await this.prisma.rating.create({
      data: {
        agreementId: dto.agreementId,
        raterUserId: userId,
        rateeUserId,
        score: dto.score,
        review: dto.review?.trim() || null,
      },
    });

    if (rateeUserId === tutorUserId) {
      await this.refreshTutorAggregate(agreement.match.tutorId);
    }

    await this.audit.log({
      actorId: userId,
      action: 'RATING_CREATED',
      entityType: 'Rating',
      entityId: rating.id,
      metadata: { agreementId: dto.agreementId, score: dto.score },
    });

    return rating;
  }

  private async refreshTutorAggregate(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) return;
    const agg = await this.prisma.rating.aggregate({
      where: { rateeUserId: tutor.userId },
      _avg: { score: true },
      _count: { score: true },
    });
    await this.prisma.tutor.update({
      where: { id: tutorId },
      data: {
        ratingAvg: agg._avg.score
          ? Math.round(agg._avg.score * 10) / 10
          : null,
        ratingCount: agg._count.score,
      },
    });
  }

  async listForAgreement(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        match: {
          include: {
            tutor: true,
            requirement: { include: { student: true } },
          },
        },
        ratings: true,
      },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');
    const studentUserId = agreement.match.requirement.student.userId;
    const tutorUserId = agreement.match.tutor.userId;
    if (userId !== studentUserId && userId !== tutorUserId) {
      throw new ForbiddenException();
    }
    return {
      requirementStatus: agreement.match.requirement.status,
      agreementStatus: agreement.status,
      myRating: agreement.ratings.find((r) => r.raterUserId === userId) ?? null,
      ratings: agreement.ratings.map((r) => ({
        id: r.id,
        score: r.score,
        review: r.review,
        raterUserId: r.raterUserId,
        createdAt: r.createdAt,
      })),
    };
  }
}
