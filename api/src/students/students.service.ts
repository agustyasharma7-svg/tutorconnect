import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async ensureProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Student access only');
    }
    let student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      student = await this.prisma.student.create({
        data: { userId, preferredLanguage: user.locale },
      });
    }
    return { user, student };
  }

  async getMe(userId: string) {
    const { user, student } = await this.ensureProfile(userId);
    const requirementCount = await this.prisma.requirement.count({
      where: { studentId: student.id },
    });
    return {
      id: student.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      locale: user.locale,
      preferredLanguage: student.preferredLanguage,
      status: user.status,
      requirementCount,
    };
  }

  async updateMe(userId: string, dto: UpdateStudentDto) {
    const { user, student } = await this.ensureProfile(userId);

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const exists = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (exists) throw new ForbiddenException('Email already in use');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email?.toLowerCase(),
        locale: dto.locale,
      },
    });

    const updatedStudent = await this.prisma.student.update({
      where: { id: student.id },
      data: { preferredLanguage: dto.preferredLanguage },
    });

    await this.audit.log({
      actorId: userId,
      action: 'STUDENT_PROFILE_UPDATED',
      entityType: 'Student',
      entityId: student.id,
      metadata: dto as object,
    });

    const requirementCount = await this.prisma.requirement.count({
      where: { studentId: student.id },
    });

    return {
      id: updatedStudent.id,
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      locale: updatedUser.locale,
      preferredLanguage: updatedStudent.preferredLanguage,
      status: updatedUser.status,
      requirementCount,
    };
  }
}