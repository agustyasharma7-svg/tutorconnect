import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlotSource, SlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';

/** Session reminders ~1h before OCCUPIED agreement slots (Redis dedupe). */
@Injectable()
export class SessionReminderService {
  private readonly logger = new Logger(SessionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendUpcomingSessionReminders() {
    const now = Date.now();
    const windowStart = new Date(now + 50 * 60 * 1000);
    const windowEnd = new Date(now + 70 * 60 * 1000);

    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        status: SlotStatus.OCCUPIED,
        source: SlotSource.AGREEMENT,
        startAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        tutor: { include: { user: true } },
        agreement: {
          include: {
            match: {
              include: {
                requirement: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
      take: 40,
    });

    for (const slot of slots) {
      const key = `session-reminder:${slot.id}`;
      const already = await this.redis.get(key);
      if (already) continue;

      const when = slot.startAt.toISOString();
      const tutor = slot.tutor.user;
      const student = slot.agreement?.match.requirement.student.user;
      try {
        await this.mail.sendSessionReminder(tutor.email, {
          name: tutor.name,
          when,
          mode: slot.mode ?? undefined,
        });
        if (student) {
          await this.mail.sendSessionReminder(student.email, {
            name: student.name,
            when,
            mode: slot.mode ?? undefined,
          });
        }
        await this.redis.set(key, '1', 6 * 60 * 60);
        this.logger.log(`Session reminder sent for slot ${slot.id}`);
      } catch (err) {
        this.logger.warn(
          `Session reminder failed for ${slot.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
