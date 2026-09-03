import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  DocumentType,
  RegistrationFeeStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { GeoService } from '../common/geo.service';
import {
  RegistrationFeeChoiceDto,
  UpdateAvailabilityDto,
  UpdateLocationDto,
  UpdateTutorProfileDto,
  UpdateTutorSubjectsDto,
} from './dto/tutor.dto';

@Injectable()
export class TutorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly geo: GeoService,
  ) {}

  async ensureProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.TUTOR) {
      throw new ForbiddenException('Tutor access only');
    }
    let tutor = await this.prisma.tutor.findUnique({ where: { userId } });
    if (!tutor) {
      tutor = await this.prisma.tutor.create({ data: { userId } });
    }
    return { user, tutor };
  }

  private completeness(tutor: {
    bio: string | null;
    experienceYears: number | null;
    photoUrl: string | null;
    teachingRadiusKm: number | null;
    isVerified: boolean;
    subjects: unknown[];
    classes: unknown[];
    boards: unknown[];
    availability: unknown[];
  }) {
    const checks = {
      bio: !!tutor.bio && tutor.bio.length >= 10,
      experience: tutor.experienceYears != null,
      photo: !!tutor.photoUrl,
      subjects: tutor.subjects.length > 0,
      classes: tutor.classes.length > 0,
      boards: tutor.boards.length > 0,
      availability: tutor.availability.length > 0,
      location: tutor.teachingRadiusKm != null,
      // Admin-approved ID docs — blocks fake profiles from search
      verification: tutor.isVerified,
    };
    const done = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    return {
      score: Math.round((done / total) * 100),
      checks,
      isComplete: done === total,
    };
  }

  async getMe(userId: string) {
    await this.ensureProfile(userId);
    const tutor = await this.prisma.tutor.findUniqueOrThrow({
      where: { userId },
      include: {
        user: true,
        subjects: { include: { subject: true } },
        classes: { include: { class: true } },
        boards: { include: { board: true } },
        availability: true,
        documents: true,
      },
    });
    const completeness = this.completeness(tutor);
    if (tutor.isDiscoverable !== completeness.isComplete) {
      await this.prisma.tutor.update({
        where: { id: tutor.id },
        data: { isDiscoverable: completeness.isComplete },
      });
      tutor.isDiscoverable = completeness.isComplete;
    }
    return {
      id: tutor.id,
      name: tutor.user.name,
      email: tutor.user.email,
      mobile: tutor.user.mobile,
      qualification: tutor.user.qualification,
      locale: tutor.user.locale,
      bio: tutor.bio,
      experienceYears: tutor.experienceYears,
      photoUrl: tutor.photoUrl,
      registrationFeeStatus: tutor.registrationFeeStatus,
      registrationFeeChoice: tutor.registrationFeeChoice,
      teachingRadiusKm: tutor.teachingRadiusKm,
      pincode: tutor.pincode,
      latitude: tutor.latitude,
      longitude: tutor.longitude,
      isDiscoverable: tutor.isDiscoverable,
      verificationStatus: tutor.verificationStatus,
      isVerified: tutor.isVerified,
      verificationRejectReason: tutor.verificationRejectReason,
      ratingAvg: tutor.ratingAvg,
      ratingCount: tutor.ratingCount,
      subjects: tutor.subjects.map((s) => s.subject),
      classes: tutor.classes.map((c) => c.class),
      boards: tutor.boards.map((b) => b.board),
      otherSubjects: tutor.otherSubjects,
      otherClasses: tutor.otherClasses,
      otherBoards: tutor.otherBoards,
      availability: tutor.availability,
      documents: tutor.documents,
      completeness,
    };
  }

  async refreshDiscoverable(tutorId: string) {
    const tutor = await this.prisma.tutor.findUniqueOrThrow({
      where: { id: tutorId },
      include: {
        subjects: true,
        classes: true,
        boards: true,
        availability: true,
      },
    });
    const completeness = this.completeness(tutor);
    await this.prisma.tutor.update({
      where: { id: tutorId },
      data: { isDiscoverable: completeness.isComplete },
    });
    return completeness;
  }

  async updateProfile(userId: string, dto: UpdateTutorProfileDto) {
    const { tutor } = await this.ensureProfile(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        qualification: dto.qualification,
        locale: dto.locale,
      },
    });
    await this.prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        bio: dto.bio,
        experienceYears: dto.experienceYears,
      },
    });
    await this.refreshDiscoverable(tutor.id);
    await this.audit.log({
      actorId: userId,
      action: 'TUTOR_PROFILE_UPDATED',
      entityType: 'Tutor',
      entityId: tutor.id,
    });
    return this.getMe(userId);
  }

  async updateSubjects(userId: string, dto: UpdateTutorSubjectsDto) {
    const { tutor } = await this.ensureProfile(userId);

    const [pickedSubjects, pickedClasses, pickedBoards] = await Promise.all([
      this.prisma.subject.findMany({ where: { id: { in: dto.subjectIds } } }),
      this.prisma.classLevel.findMany({ where: { id: { in: dto.classIds } } }),
      this.prisma.board.findMany({ where: { id: { in: dto.boardIds } } }),
    ]);

    if (pickedSubjects.length !== dto.subjectIds.length) {
      throw new BadRequestException('Invalid subject selection');
    }
    if (pickedClasses.length !== dto.classIds.length) {
      throw new BadRequestException('Invalid class selection');
    }
    if (pickedBoards.length !== dto.boardIds.length) {
      throw new BadRequestException('Invalid board selection');
    }

    const needsOtherSubject = pickedSubjects.some((s) => s.nameEn === 'Other');
    const needsOtherClass = pickedClasses.some((c) => c.nameEn === 'Other');
    const needsOtherBoard = pickedBoards.some((b) => b.nameEn === 'Other');

    const otherSubjects = needsOtherSubject
      ? dto.otherSubjects?.trim() || null
      : null;
    const otherClasses = needsOtherClass
      ? dto.otherClasses?.trim() || null
      : null;
    const otherBoards = needsOtherBoard
      ? dto.otherBoards?.trim() || null
      : null;

    if (needsOtherSubject && (!otherSubjects || otherSubjects.length < 2)) {
      throw new BadRequestException('Please specify the other subject');
    }
    if (needsOtherClass && (!otherClasses || otherClasses.length < 2)) {
      throw new BadRequestException('Please specify the other class');
    }
    if (needsOtherBoard && (!otherBoards || otherBoards.length < 2)) {
      throw new BadRequestException('Please specify the other board');
    }

    await this.prisma.$transaction([
      this.prisma.tutorSubject.deleteMany({ where: { tutorId: tutor.id } }),
      this.prisma.tutorClass.deleteMany({ where: { tutorId: tutor.id } }),
      this.prisma.tutorBoard.deleteMany({ where: { tutorId: tutor.id } }),
      this.prisma.tutorSubject.createMany({
        data: dto.subjectIds.map((subjectId) => ({
          tutorId: tutor.id,
          subjectId,
        })),
      }),
      this.prisma.tutorClass.createMany({
        data: dto.classIds.map((classId) => ({ tutorId: tutor.id, classId })),
      }),
      this.prisma.tutorBoard.createMany({
        data: dto.boardIds.map((boardId) => ({ tutorId: tutor.id, boardId })),
      }),
      this.prisma.tutor.update({
        where: { id: tutor.id },
        data: { otherSubjects, otherClasses, otherBoards },
      }),
    ]);
    await this.refreshDiscoverable(tutor.id);
    return this.getMe(userId);
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const { tutor } = await this.ensureProfile(userId);
    for (const slot of dto.slots) {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException('startTime must be before endTime');
      }
    }
    await this.prisma.$transaction([
      this.prisma.tutorAvailability.deleteMany({ where: { tutorId: tutor.id } }),
      this.prisma.tutorAvailability.createMany({
        data: dto.slots.map((s) => ({
          tutorId: tutor.id,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          mode: s.mode,
        })),
      }),
    ]);
    await this.refreshDiscoverable(tutor.id);
    return this.getMe(userId);
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const { tutor } = await this.ensureProfile(userId);
    if (
      dto.teachingRadiusKm != null &&
      ![5, 10, 20].includes(dto.teachingRadiusKm)
    ) {
      throw new BadRequestException('teachingRadiusKm must be 5, 10, or 20');
    }
    if (!dto.pincode && (dto.latitude == null || dto.longitude == null)) {
      throw new BadRequestException('pincode or latitude/longitude is required');
    }

    const resolved = await this.geo.resolveCoordinates({
      pincode: dto.pincode,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    await this.prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        teachingRadiusKm: dto.teachingRadiusKm,
        pincode: dto.pincode ?? tutor.pincode,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      },
    });
    await this.refreshDiscoverable(tutor.id);
    return this.getMe(userId);
  }

  async chooseRegistrationFee(userId: string, dto: RegistrationFeeChoiceDto) {
    const { tutor } = await this.ensureProfile(userId);
    if (
      tutor.registrationFeeStatus === RegistrationFeeStatus.PAID ||
      tutor.registrationFeeStatus === RegistrationFeeStatus.WAIVED
    ) {
      throw new BadRequestException('Registration fee choice already finalized');
    }
    await this.prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        registrationFeeStatus: RegistrationFeeStatus.PENDING,
        registrationFeeChoice: dto.choice,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: 'TUTOR_FEE_CHOICE',
      entityType: 'Tutor',
      entityId: tutor.id,
      metadata: { choice: dto.choice },
    });
    return {
      choice: dto.choice,
      registrationFeeStatus: RegistrationFeeStatus.PENDING,
      checkoutRequired: dto.choice === 'PAY_NOW',
      message:
        dto.choice === 'EARN_FIRST'
          ? 'Earn First selected. ₹199 will be added to first commission invoice.'
          : 'Pay Now selected. Complete ₹199 checkout to finish registration fee.',
    };
  }

  async savePhoto(
    userId: string,
    fileUrl: string,
    fileName: string,
    storageKey?: string,
  ) {
    const { tutor } = await this.ensureProfile(userId);
    await this.prisma.tutor.update({
      where: { id: tutor.id },
      data: { photoUrl: fileUrl },
    });
    await this.prisma.tutorDocument.create({
      data: {
        tutorId: tutor.id,
        type: DocumentType.PHOTO,
        fileUrl,
        fileName,
        ...(storageKey ? { storageKey } : {}),
      },
    });
    await this.refreshDiscoverable(tutor.id);
    return this.getMe(userId);
  }
}
