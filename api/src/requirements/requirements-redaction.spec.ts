import { UserRole, RequirementStatus, RequirementMode } from '@prisma/client';
import { RequirementsService } from './requirements.service';

describe('RequirementsService.getOne address redaction (7A.4)', () => {
  const row = {
    id: 'req-1',
    studentId: 'stu-1',
    subjectId: 'sub-1',
    classId: 'cls-1',
    boardId: 'brd-1',
    budgetMin: 1000,
    budgetMax: 2000,
    mode: RequirementMode.OFFLINE,
    scheduleDays: ['MON'],
    scheduleTime: '10:00',
    durationMins: 60,
    pincode: '110001',
    address: '12 Secret Lane',
    latitude: 28.6,
    longitude: 77.2,
    notes: null,
    status: RequirementStatus.OPEN,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    subject: { id: 'sub-1', nameEn: 'Math', nameHi: 'गणित' },
    class: { id: 'cls-1', nameEn: 'Class 10', nameHi: 'कक्षा 10' },
    board: { id: 'brd-1', nameEn: 'CBSE', nameHi: 'सीबीएसई' },
    matches: [],
    student: { user: { name: 'Student' } },
  };

  it('redacts address/coords for tutors', async () => {
    const prisma = {
      requirement: {
        findUnique: jest.fn().mockResolvedValue(row),
      },
    };
    const svc = new RequirementsService(
      prisma as never,
      { log: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await svc.getOne('tutor-user', 'req-1', UserRole.TUTOR);
    expect(result.address).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.pincode).toBe('110001');
  });

  it('keeps address for student owner', async () => {
    const prisma = {
      requirement: {
        findUnique: jest.fn().mockResolvedValue(row),
      },
    };
    const students = {
      ensureProfile: jest.fn().mockResolvedValue({ student: { id: 'stu-1' } }),
    };
    const svc = new RequirementsService(
      prisma as never,
      { log: jest.fn() } as never,
      students as never,
      {} as never,
      {} as never,
    );
    const result = await svc.getOne('student-user', 'req-1', UserRole.STUDENT);
    expect(result.address).toBe('12 Secret Lane');
    expect(result.latitude).toBe(28.6);
  });
});
