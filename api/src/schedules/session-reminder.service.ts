import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlotSource, SlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Session reminders via BullMQ ~1h before OCCUPIED agreement slots. */
@Injectable()
export class SessionReminderService {
  private readonly logger = new Logger(SessionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
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
      const modeSuffix = slot.mode ? ` (${slot.mode})` : '';
      try {
        await this.notifications.enqueueEmail({
          userId: tutor.id,
          event: 'SESSION_REMINDER',
          to: tutor.email,
          subject: 'Session reminder — starts in about 1 hour',
          text: `Hi ${tutor.name}, reminder: your tuition session is at ${when}${modeSuffix}.`,
          html: `<p>Hi ${tutor.name},</p><p>Your session starts in about <strong>1 hour</strong> — <strong>${when}</strong>${modeSuffix}.</p>`,
          payload: { slotId: slot.id },
        });
        if (student) {
          await this.notifications.enqueueEmail({
            userId: student.id,
            event: 'SESSION_REMINDER',
            to: student.email,
            subject: 'Session reminder — starts in about 1 hour',
            text: `Hi ${student.name}, reminder: your tuition session is at ${when}${modeSuffix}.`,
            html: `<p>Hi ${student.name},</p><p>Your session starts in about <strong>1 hour</strong> — <strong>${when}</strong>${modeSuffix}.</p>`,
            payload: { slotId: slot.id },
          });
        }
        await this.redis.set(key, '1', 6 * 60 * 60);
        this.logger.log(`Session reminder queued for slot ${slot.id}`);
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
