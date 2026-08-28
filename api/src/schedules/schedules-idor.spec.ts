import { ForbiddenException } from '@nestjs/common';
import { AgreementStatus } from '@prisma/client';
import { SchedulesService } from './schedules.service';

describe('SchedulesService.resolveStudentTutorId (7A.5)', () => {
  it('rejects tutorId without an ACTIVE/PENDING agreement', async () => {
    const prisma = {
      agreement: {
        findMany: jest.fn().mockResolvedValue([
          {
            match: { tutorId: 'tutor-allowed' },
          },
        ]),
      },
    };
    const svc = new SchedulesService(prisma as never);
    await expect(
      svc.resolveStudentTutorId('student-1', 'tutor-other'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows tutorId when student has matching agreement', async () => {
    const prisma = {
      agreement: {
        findMany: jest.fn().mockResolvedValue([
          {
            status: AgreementStatus.ACTIVE,
            match: { tutorId: 'tutor-allowed' },
          },
        ]),
      },
    };
    const svc = new SchedulesService(prisma as never);
    await expect(
      svc.resolveStudentTutorId('student-1', 'tutor-allowed'),
    ).resolves.toBe('tutor-allowed');
  });

  it('defaults to latest allowed tutor when tutorId omitted', async () => {
    const prisma = {
      agreement: {
        findMany: jest.fn().mockResolvedValue([
          { match: { tutorId: 'tutor-latest' } },
          { match: { tutorId: 'tutor-older' } },
        ]),
      },
    };
    const svc = new SchedulesService(prisma as never);
    await expect(svc.resolveStudentTutorId('student-1')).resolves.toBe(
      'tutor-latest',
    );
  });
});
