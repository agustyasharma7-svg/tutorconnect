import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AgreementStatus,
  Prisma,
  SlotSource,
  SlotStatus,
  TeachingMode,
  WeekDay,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const BUFFER_MINUTES = 15;

const WEEKDAY_INDEX: Record<WeekDay, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** IST offset +05:30 — store as UTC Date from IST wall clock strings if needed. */
  parseIstDateTime(isoLocal: string): Date {
    if (/Z$|[+-]\d{2}:\d{2}$/.test(isoLocal)) {
      return new Date(isoLocal);
    }
    return new Date(`${isoLocal}+05:30`);
  }

  /** Format Prisma @db.Date as YYYY-MM-DD. */
  formatDateOnly(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** YYYY-MM-DD for a Date in Asia/Kolkata. */
  istDateKey(d: Date): string {
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return this.formatDateOnly(ist);
  }

  private dateOnlyUtc(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  async assertNoException(tutorId: string, startAt: Date, endAt: Date) {
    const keys = new Set([this.istDateKey(startAt), this.istDateKey(endAt)]);
    for (const key of keys) {
      const hit = await this.prisma.tutorAvailabilityException.findUnique({
        where: {
          tutorId_date: { tutorId, date: this.dateOnlyUtc(key) },
        },
      });
      if (hit) {
        throw new BadRequestException(
          `Tutor is unavailable on ${key}${hit.reason ? ` (${hit.reason})` : ''} — exception date`,
        );
      }
    }
  }

  async assertNoConflict(
    tutorId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ) {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
    await this.assertNoException(tutorId, startAt, endAt);

    const bufferMs = BUFFER_MINUTES * 60 * 1000;
    const windowStart = new Date(startAt.getTime() - bufferMs);
    const windowEnd = new Date(endAt.getTime() + bufferMs);

    const conflicts = await this.prisma.scheduleSlot.findMany({
      where: {
        tutorId,
        status: SlotStatus.OCCUPIED,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startAt: { lt: windowEnd },
        endAt: { gt: windowStart },
      },
      take: 5,
    });

    const real = conflicts.filter((c) => {
      const ok =
        endAt.getTime() + bufferMs <= c.startAt.getTime() ||
        c.endAt.getTime() + bufferMs <= startAt.getTime();
      return !ok;
    });

    if (real.length) {
      throw new BadRequestException(
        `Slot conflicts with an occupied booking (15-minute buffer required)`,
      );
    }
  }

  async createOccupiedSlot(data: {
    tutorId: string;
    startAt: Date;
    endAt: Date;
    source: SlotSource;
    agreementId?: string;
    demoClassId?: string;
    mode?: TeachingMode;
  }) {
    await this.assertNoConflict(data.tutorId, data.startAt, data.endAt);
    return this.prisma.scheduleSlot.create({
      data: {
        tutorId: data.tutorId,
        startAt: data.startAt,
        endAt: data.endAt,
        status: SlotStatus.OCCUPIED,
        source: data.source,
        agreementId: data.agreementId,
        demoClassId: data.demoClassId,
        mode: data.mode,
      },
    });
  }

  async occupyAgreementSlots(
    tutorId: string,
    agreementId: string,
    scheduleJson: {
      day: WeekDay;
      startTime: string;
      endTime: string;
      mode?: TeachingMode;
    }[],
    weeks = 4,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const created = [];
    const now = new Date();
    for (let w = 0; w < weeks; w++) {
      for (const row of scheduleJson) {
        const startAt = this.nextOccurrence(row.day, row.startTime, w, now);
        let endAt = this.nextOccurrence(row.day, row.endTime, w, now);
        if (endAt <= startAt) {
          endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
        }
        if (startAt < now) continue;
        try {
          await this.assertNoConflict(tutorId, startAt, endAt);
        } catch {
          continue;
        }
        const slot = await db.scheduleSlot.create({
          data: {
            tutorId,
            startAt,
            endAt,
            status: SlotStatus.OCCUPIED,
            source: SlotSource.AGREEMENT,
            agreementId,
            mode: row.mode,
          },
        });
        created.push(slot);
      }
    }
    return created;
  }

  private nextOccurrence(
    day: WeekDay,
    timeHm: string,
    weekOffset: number,
    from: Date,
  ): Date {
    const [hh, mm] = timeHm.split(':').map(Number);
    const targetDow = WEEKDAY_INDEX[day];
    const istNow = new Date(from.getTime() + 5.5 * 60 * 60 * 1000);
    const base = new Date(
      Date.UTC(
        istNow.getUTCFullYear(),
        istNow.getUTCMonth(),
        istNow.getUTCDate(),
        hh,
        mm || 0,
        0,
      ),
    );
    const asUtc = new Date(base.getTime() - 5.5 * 60 * 60 * 1000);
    const curDow = new Date(from.getTime() + 5.5 * 60 * 60 * 1000).getUTCDay();
    let addDays = (targetDow - curDow + 7) % 7;
    if (addDays === 0 && asUtc <= from) addDays = 7;
    addDays += weekOffset * 7;
    return new Date(asUtc.getTime() + addDays * 24 * 60 * 60 * 1000);
  }

  async releaseSlot(studentUserId: string, slotId: string) {
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: {
        agreement: {
          include: {
            match: {
              include: {
                requirement: { include: { student: true } },
                tutor: { include: { user: true } },
              },
            },
          },
        },
      },
    });
    if (!slot || slot.status !== SlotStatus.OCCUPIED || !slot.agreement) {
      throw new BadRequestException('Slot cannot be released');
    }
    if (slot.agreement.match.requirement.student.userId !== studentUserId) {
      throw new BadRequestException('Only the student can release this slot');
    }
    const updated = await this.prisma.scheduleSlot.update({
      where: { id: slotId },
      data: { status: SlotStatus.RELEASED },
    });
    return {
      slot: updated,
      tutorEmail: slot.agreement.match.tutor.user.email,
      tutorName: slot.agreement.match.tutor.user.name,
    };
  }

  async resolveStudentTutorId(studentUserId: string, tutorId?: string) {
    const allowed = await this.prisma.agreement.findMany({
      where: {
        status: {
          in: [AgreementStatus.ACTIVE, AgreementStatus.PENDING_TUTOR_SIGN],
        },
        match: { requirement: { student: { userId: studentUserId } } },
      },
      include: { match: true },
      orderBy: { createdAt: 'desc' },
    });
    const allowedTutorIds = new Set(allowed.map((a) => a.match.tutorId));
    if (tutorId) {
      if (!allowedTutorIds.has(tutorId)) {
        throw new ForbiddenException(
          'No active agreement with this tutor',
        );
      }
      return tutorId;
    }
    return allowed[0]?.match.tutorId ?? null;
  }

  async calendar(tutorId: string, from: Date, to: Date) {
    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        tutorId,
        startAt: { gte: from, lte: to },
      },
      orderBy: { startAt: 'asc' },
    });
    const availability = await this.prisma.tutorAvailability.findMany({
      where: { tutorId },
    });
    const exceptions = await this.prisma.tutorAvailabilityException.findMany({
      where: {
        tutorId,
        date: {
          gte: this.dateOnlyUtc(this.istDateKey(from)),
          lte: this.dateOnlyUtc(this.istDateKey(to)),
        },
      },
      orderBy: { date: 'asc' },
    });
    const bufferMs = BUFFER_MINUTES * 60 * 1000;
    return {
      timezone: 'Asia/Kolkata',
      bufferMinutes: BUFFER_MINUTES,
      availability,
      exceptions: exceptions.map((e) => ({
        id: e.id,
        date: this.formatDateOnly(e.date),
        reason: e.reason,
      })),
      slots: slots.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        source: s.source,
        agreementId: s.agreementId,
        demoClassId: s.demoClassId,
        mode: s.mode,
        bufferBeforeStartAt: new Date(s.startAt.getTime() - bufferMs),
        bufferAfterEndAt: new Date(s.endAt.getTime() + bufferMs),
      })),
    };
  }

  async listExceptions(tutorId: string) {
    const rows = await this.prisma.tutorAvailabilityException.findMany({
      where: { tutorId },
      orderBy: { date: 'asc' },
    });
    return rows.map((e) => ({
      id: e.id,
      date: this.formatDateOnly(e.date),
      reason: e.reason,
    }));
  }

  async addException(tutorId: string, dateYmd: string, reason?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    try {
      const row = await this.prisma.tutorAvailabilityException.create({
        data: {
          tutorId,
          date: this.dateOnlyUtc(dateYmd),
          reason: reason?.trim() || null,
        },
      });
      return {
        id: row.id,
        date: dateYmd,
        reason: row.reason,
      };
    } catch {
      throw new BadRequestException('Exception date already exists');
    }
  }

  async removeException(tutorId: string, id: string) {
    const row = await this.prisma.tutorAvailabilityException.findFirst({
      where: { id, tutorId },
    });
    if (!row) throw new BadRequestException('Exception not found');
    await this.prisma.tutorAvailabilityException.delete({ where: { id } });
    return { ok: true };
  }
}
