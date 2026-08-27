import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchStatus,
  RequirementMode,
  RequirementStatus,
  TeachingMode,
  WeekDay,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { MailService } from '../mail/mail.service';
import { StudentsService } from '../students/students.service';
import { TutorsService } from '../tutors/tutors.service';
import { geocodePincode, distancesFromPoint, distancesFromRequirement } from '../common/geo';
import {
  ApplyMatchDto,
  InviteMatchDto,
  SearchTutorsQueryDto,
} from './dto/match.dto';
import { scoreTutor } from './matching-score';

const TOP_N = 10;

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly students: StudentsService,
    private readonly tutors: TutorsService,
  ) {}

  private publicTutorCard(tutor: {
    id: string;
    bio: string | null;
    experienceYears: number | null;
    photoUrl: string | null;
    teachingRadiusKm: number | null;
    pincode: string | null;
    isVerified?: boolean;
    ratingAvg?: number | null;
    ratingCount?: number;
    user: { name: string; qualification: string | null };
    subjects: { subject: { id: string; nameEn: string; nameHi: string } }[];
    classes: { class: { id: string; nameEn: string; nameHi: string } }[];
    boards: { board: { id: string; nameEn: string; nameHi: string } }[];
  }, score?: number, distanceKm?: number | null) {
    return {
      id: tutor.id,
      name: tutor.user.name,
      qualification: tutor.user.qualification,
      bio: tutor.bio,
      experienceYears: tutor.experienceYears,
      photoUrl: tutor.photoUrl,
      teachingRadiusKm: tutor.teachingRadiusKm,
      pincode: tutor.pincode,
      isVerified: tutor.isVerified ?? false,
      ratingAvg: tutor.ratingAvg ?? null,
      ratingCount: tutor.ratingCount ?? 0,
      subjects: tutor.subjects.map((s) => s.subject),
      classes: tutor.classes.map((c) => c.class),
      boards: tutor.boards.map((b) => b.board),
      // Contact hidden pre-agreement (FR-DEMO-003)
      score,
      distanceKm: distanceKm ?? null,
    };
  }

  private scheduleOverlap(
    reqDays: WeekDay[],
    reqMode: RequirementMode,
    availability: { day: WeekDay; mode: TeachingMode }[],
  ): number {
    if (!availability.length) return 0;
    let hits = 0;
    for (const day of reqDays) {
      const slots = availability.filter((a) => a.day === day);
      if (!slots.length) continue;
      if (reqMode === RequirementMode.BOTH) {
        hits += 1;
      } else if (
        slots.some(
          (s) =>
            (reqMode === RequirementMode.ONLINE && s.mode === TeachingMode.ONLINE) ||
            (reqMode === RequirementMode.OFFLINE && s.mode === TeachingMode.OFFLINE),
        )
      ) {
        hits += 1;
      }
    }
    return reqDays.length ? hits / reqDays.length : 0;
  }

  private scoreTutor = scoreTutor;

  async rankEligibleTutors(requirementId: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
    });
    if (!req) throw new NotFoundException('Requirement not found');

    const tutors = await this.prisma.tutor.findMany({
      where: {
        isDiscoverable: true,
        subjects: { some: { subjectId: req.subjectId } },
        classes: { some: { classId: req.classId } },
        boards: { some: { boardId: req.boardId } },
      },
      include: {
        user: { select: { name: true, email: true, qualification: true, locale: true } },
        subjects: { include: { subject: true } },
        classes: { include: { class: true } },
        boards: { include: { board: true } },
        availability: true,
      },
    });

    const needsGeo =
      req.mode === RequirementMode.OFFLINE || req.mode === RequirementMode.BOTH;

    // PostGIS ST_DWithin — tutors outside teaching radius are omitted from the map
    const distanceByTutor = needsGeo
      ? await distancesFromRequirement(this.prisma, requirementId)
      : new Map<string, number>();

    const ranked = tutors
      .map((tutor) => {
        const scheduleScore = this.scheduleOverlap(
          req.scheduleDays,
          req.mode,
          tutor.availability,
        );
        let distanceKm: number | null = null;
        if (needsGeo) {
          if (!distanceByTutor.has(tutor.id)) {
            // No PostGIS hit → outside radius or missing location
            return null;
          }
          distanceKm = distanceByTutor.get(tutor.id) ?? null;
        }
        const score = this.scoreTutor({
          scheduleScore,
          distanceKm,
          radiusKm: tutor.teachingRadiusKm,
          experienceYears: tutor.experienceYears,
          needsGeo,
          isVerified: tutor.isVerified,
          ratingAvg: tutor.ratingAvg,
        });
        if (score < 0) return null;
        return { tutor, score, distanceKm };
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => b.score - a.score);

    return { req, ranked };
  }

  async notifyTopMatches(requirementId: string) {
    const { req, ranked } = await this.rankEligibleTutors(requirementId);
    if (req.status === RequirementStatus.CANCELLED) return { notified: 0 };

    const top = ranked.slice(0, TOP_N);
    let notified = 0;
    for (const row of top) {
      try {
        await this.mail.sendRequirementMatchAlert(row.tutor.user.email, {
          tutorName: row.tutor.user.name,
          subject: 'a new tutoring requirement',
          budgetMin: req.budgetMin,
          budgetMax: req.budgetMax,
          mode: req.mode,
        });
        notified += 1;
      } catch {
        // continue notifying others
      }
    }
    await this.audit.log({
      action: 'REQUIREMENT_MATCH_NOTIFY',
      entityType: 'Requirement',
      entityId: requirementId,
      metadata: { notified, topN: top.length },
    });
    return { notified };
  }

  async searchTutors(query: SearchTutorsQueryDto) {
    const needsGeo = query.mode === 'OFFLINE' || query.mode === 'BOTH';
    let origin: { latitude: number; longitude: number } | null = null;
    if (query.pincode) origin = geocodePincode(query.pincode);

    const tutors = await this.prisma.tutor.findMany({
      where: {
        isDiscoverable: true,
        ...(query.subjectId
          ? { subjects: { some: { subjectId: query.subjectId } } }
          : {}),
        ...(query.classId ? { classes: { some: { classId: query.classId } } } : {}),
        ...(query.boardId ? { boards: { some: { boardId: query.boardId } } } : {}),
      },
      include: {
        user: { select: { name: true, qualification: true } },
        subjects: { include: { subject: true } },
        classes: { include: { class: true } },
        boards: { include: { board: true } },
        availability: true,
      },
      take: 200,
    });

    const usePostgis = !!needsGeo && !!origin;
    const distanceByTutor = usePostgis
      ? await distancesFromPoint(
          this.prisma,
          origin!.latitude,
          origin!.longitude,
          tutors.map((t) => t.id),
        )
      : new Map<string, number>();

    const mode = (query.mode as RequirementMode | undefined) ?? RequirementMode.BOTH;
    const results = tutors
      .map((tutor) => {
        let distanceKm: number | null = null;
        if (usePostgis) {
          if (!distanceByTutor.has(tutor.id)) return null;
          distanceKm = distanceByTutor.get(tutor.id) ?? null;
        }
        const scheduleScore = this.scheduleOverlap(
          [WeekDay.MON, WeekDay.WED, WeekDay.FRI],
          mode,
          tutor.availability,
        );
        const score = this.scoreTutor({
          scheduleScore,
          distanceKm,
          radiusKm: tutor.teachingRadiusKm,
          experienceYears: tutor.experienceYears,
          needsGeo: usePostgis,
          isVerified: tutor.isVerified,
          ratingAvg: tutor.ratingAvg,
        });
        if (score < 0) return null;
        return this.publicTutorCard(tutor, score, distanceKm);
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return results;
  }

  async getPublicTutor(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        user: { select: { name: true, qualification: true } },
        subjects: { include: { subject: true } },
        classes: { include: { class: true } },
        boards: { include: { board: true } },
        availability: true,
      },
    });
    if (!tutor || !tutor.isDiscoverable) {
      throw new NotFoundException('Tutor not found');
    }
    return {
      ...this.publicTutorCard(tutor),
      availability: tutor.availability.map((a) => ({
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
        mode: a.mode,
      })),
    };
  }

  private async assertTutorEligible(
    tutorId: string,
    requirementId: string,
  ) {
    const req = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
    });
    if (!req) throw new NotFoundException('Requirement not found');
    if (
      ![
        RequirementStatus.OPEN,
        RequirementStatus.APPLIED,
        RequirementStatus.SHORTLISTED,
      ].includes(req.status as never)
    ) {
      throw new BadRequestException('Requirement is not accepting applications');
    }

    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        subjects: true,
        classes: true,
        boards: true,
      },
    });
    if (!tutor?.isDiscoverable) {
      throw new BadRequestException('Complete your profile to apply');
    }
    const okSubject = tutor.subjects.some((s) => s.subjectId === req.subjectId);
    const okClass = tutor.classes.some((c) => c.classId === req.classId);
    const okBoard = tutor.boards.some((b) => b.boardId === req.boardId);
    if (!okSubject || !okClass || !okBoard) {
      throw new BadRequestException(
        'Cannot apply outside your subject/class/board',
      );
    }
    return { req, tutor };
  }

  async apply(userId: string, dto: ApplyMatchDto) {
    const { tutor } = await this.tutors.ensureProfile(userId);
    const { req } = await this.assertTutorEligible(tutor.id, dto.requirementId);

    const existing = await this.prisma.match.findUnique({
      where: {
        requirementId_tutorId: {
          requirementId: dto.requirementId,
          tutorId: tutor.id,
        },
      },
      include: { application: true },
    });
    if (existing?.application) {
      throw new BadRequestException('Already applied');
    }
    if (
      existing &&
      [MatchStatus.REJECTED, MatchStatus.WITHDRAWN].includes(existing.status as never)
    ) {
      throw new BadRequestException('Cannot re-apply after reject/withdraw');
    }

    const { ranked } = await this.rankEligibleTutors(dto.requirementId);
    const score = ranked.find((r) => r.tutor.id === tutor.id)?.score ?? 0;

    const match = await this.prisma.$transaction(async (tx) => {
      const m = existing
        ? await tx.match.update({
            where: { id: existing.id },
            data: { status: MatchStatus.APPLIED, score },
          })
        : await tx.match.create({
            data: {
              requirementId: dto.requirementId,
              tutorId: tutor.id,
              status: MatchStatus.APPLIED,
              score,
            },
          });

      await tx.application.create({
        data: {
          matchId: m.id,
          message: dto.message,
          proposedFee: dto.proposedFee,
        },
      });

      if (req.status === RequirementStatus.OPEN) {
        await tx.requirement.update({
          where: { id: req.id },
          data: { status: RequirementStatus.APPLIED },
        });
      }
      return m;
    });

    const student = await this.prisma.student.findUnique({
      where: { id: req.studentId },
      include: { user: true },
    });
    const tutorUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (student && tutorUser) {
      void this.mail
        .sendApplicationReceived(student.user.email, {
          studentName: student.user.name,
          tutorName: tutorUser.name,
        })
        .catch(() => undefined);
    }

    await this.audit.log({
      actorId: userId,
      action: 'MATCH_APPLIED',
      entityType: 'Match',
      entityId: match.id,
    });

    return this.getMatchDetail(match.id);
  }

  async invite(userId: string, dto: InviteMatchDto) {
    const { student } = await this.students.ensureProfile(userId);
    const req = await this.prisma.requirement.findUnique({
      where: { id: dto.requirementId },
    });
    if (!req || req.studentId !== student.id) {
      throw new NotFoundException('Requirement not found');
    }
    if (
      ![
        RequirementStatus.OPEN,
        RequirementStatus.APPLIED,
        RequirementStatus.SHORTLISTED,
      ].includes(req.status as never)
    ) {
      throw new BadRequestException('Cannot invite for this requirement');
    }

    await this.assertTutorEligible(dto.tutorId, dto.requirementId);

    const existing = await this.prisma.match.findUnique({
      where: {
        requirementId_tutorId: {
          requirementId: dto.requirementId,
          tutorId: dto.tutorId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('Tutor already invited or applied');
    }

    const { ranked } = await this.rankEligibleTutors(dto.requirementId);
    const score = ranked.find((r) => r.tutor.id === dto.tutorId)?.score ?? 0;

    const match = await this.prisma.match.create({
      data: {
        requirementId: dto.requirementId,
        tutorId: dto.tutorId,
        status: MatchStatus.INVITED,
        score,
      },
    });

    const tutor = await this.prisma.tutor.findUnique({
      where: { id: dto.tutorId },
      include: { user: true },
    });
    if (tutor) {
      void this.mail
        .sendRequirementMatchAlert(tutor.user.email, {
          tutorName: tutor.user.name,
          subject: 'an invitation to a requirement',
          budgetMin: req.budgetMin,
          budgetMax: req.budgetMax,
          mode: req.mode,
        })
        .catch(() => undefined);
    }

    await this.audit.log({
      actorId: userId,
      action: 'MATCH_INVITED',
      entityType: 'Match',
      entityId: match.id,
    });

    return this.getMatchDetail(match.id);
  }

  async shortlist(userId: string, matchId: string) {
    const match = await this.ownedStudentMatch(userId, matchId);
    if (![MatchStatus.APPLIED, MatchStatus.INVITED].includes(match.status as never)) {
      throw new BadRequestException('Cannot shortlist this match');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const m = await tx.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.SHORTLISTED },
      });
      if (
        [RequirementStatus.OPEN, RequirementStatus.APPLIED].includes(
          match.requirement.status as never,
        )
      ) {
        await tx.requirement.update({
          where: { id: match.requirementId },
          data: { status: RequirementStatus.SHORTLISTED },
        });
      }
      return m;
    });

    void this.mail
      .sendShortlisted(match.tutor.user.email, {
        tutorName: match.tutor.user.name,
      })
      .catch(() => undefined);

    await this.audit.log({
      actorId: userId,
      action: 'MATCH_SHORTLISTED',
      entityType: 'Match',
      entityId: matchId,
    });
    return this.getMatchDetail(updated.id);
  }

  async reject(userId: string, matchId: string) {
    await this.ownedStudentMatch(userId, matchId);
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.REJECTED },
    });
    await this.audit.log({
      actorId: userId,
      action: 'MATCH_REJECTED',
      entityType: 'Match',
      entityId: matchId,
    });
    return this.getMatchDetail(updated.id);
  }

  async withdraw(userId: string, matchId: string) {
    const { tutor } = await this.tutors.ensureProfile(userId);
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.tutorId !== tutor.id) {
      throw new NotFoundException('Match not found');
    }
    if (![MatchStatus.APPLIED, MatchStatus.INVITED].includes(match.status as never)) {
      throw new BadRequestException('Cannot withdraw');
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.WITHDRAWN },
    });
    await this.audit.log({
      actorId: userId,
      action: 'MATCH_WITHDRAWN',
      entityType: 'Match',
      entityId: matchId,
    });
    return this.getMatchDetail(updated.id);
  }

  private async ownedStudentMatch(userId: string, matchId: string) {
    const { student } = await this.students.ensureProfile(userId);
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        requirement: true,
        tutor: { include: { user: true } },
      },
    });
    if (!match || match.requirement.studentId !== student.id) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  async studentInbox(userId: string, requirementId?: string) {
    const { student } = await this.students.ensureProfile(userId);
    const matches = await this.prisma.match.findMany({
      where: {
        requirement: { studentId: student.id },
        ...(requirementId ? { requirementId } : {}),
        status: {
          in: [
            MatchStatus.APPLIED,
            MatchStatus.INVITED,
            MatchStatus.SHORTLISTED,
            MatchStatus.ACCEPTED,
            MatchStatus.MATCHED,
          ],
        },
      },
      include: {
        application: true,
        requirement: {
          include: { subject: true, class: true, board: true },
        },
        tutor: {
          include: {
            user: { select: { name: true, qualification: true } },
            subjects: { include: { subject: true } },
            classes: { include: { class: true } },
            boards: { include: { board: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return matches.map((m) => ({
      id: m.id,
      status: m.status,
      score: m.score,
      application: m.application,
      requirement: {
        id: m.requirement.id,
        status: m.requirement.status,
        budgetMin: m.requirement.budgetMin,
        budgetMax: m.requirement.budgetMax,
        mode: m.requirement.mode,
        subject: m.requirement.subject,
        class: m.requirement.class,
        board: m.requirement.board,
      },
      tutor: this.publicTutorCard(m.tutor, m.score),
    }));
  }

  async tutorMatches(userId: string) {
    const { tutor } = await this.tutors.ensureProfile(userId);
    const matches = await this.prisma.match.findMany({
      where: { tutorId: tutor.id },
      include: {
        application: true,
        requirement: {
          include: { subject: true, class: true, board: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return matches.map((m) => ({
      id: m.id,
      status: m.status,
      score: m.score,
      application: m.application,
      requirement: {
        id: m.requirement.id,
        status: m.requirement.status,
        budgetMin: m.requirement.budgetMin,
        budgetMax: m.requirement.budgetMax,
        mode: m.requirement.mode,
        scheduleDays: m.requirement.scheduleDays,
        scheduleTime: m.requirement.scheduleTime,
        subject: m.requirement.subject,
        class: m.requirement.class,
        board: m.requirement.board,
        pincode: m.requirement.pincode,
      },
    }));
  }

  async getMatchDetail(matchId: string) {
    const m = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        application: true,
        requirement: {
          include: { subject: true, class: true, board: true },
        },
        tutor: {
          include: {
            user: { select: { name: true, qualification: true } },
            subjects: { include: { subject: true } },
            classes: { include: { class: true } },
            boards: { include: { board: true } },
          },
        },
      },
    });
    if (!m) throw new NotFoundException('Match not found');
    return {
      id: m.id,
      status: m.status,
      score: m.score,
      application: m.application,
      requirement: {
        id: m.requirement.id,
        status: m.requirement.status,
        budgetMin: m.requirement.budgetMin,
        budgetMax: m.requirement.budgetMax,
        mode: m.requirement.mode,
        subject: m.requirement.subject,
        class: m.requirement.class,
        board: m.requirement.board,
      },
      tutor: this.publicTutorCard(m.tutor, m.score),
    };
  }
}
