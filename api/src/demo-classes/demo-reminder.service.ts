import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DemoClassStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Enqueues demo reminders via BullMQ ~1 hour before (runs every 5 minutes). */
@Injectable()
export class DemoReminderService {
  private readonly logger = new Logger(DemoReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendUpcomingReminders() {
    const now = Date.now();
    const windowStart = new Date(now + 50 * 60 * 1000);
    const windowEnd = new Date(now + 70 * 60 * 1000);

    const demos = await this.prisma.demoClass.findMany({
      where: {
        status: DemoClassStatus.SCHEDULED,
        reminderSentAt: null,
        scheduledAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        match: {
          include: {
            tutor: { include: { user: true } },
            requirement: {
              include: { student: { include: { user: true } } },
            },
          },
        },
      },
      take: 50,
    });

    for (const demo of demos) {
      const when = demo.scheduledAt.toISOString();
      const tutor = demo.match.tutor.user;
      const student = demo.match.requirement.student.user;
      try {
        await this.notifications.enqueueEmail({
          userId: tutor.id,
          event: 'DEMO_REMINDER',
          to: tutor.email,
          subject: 'Demo class reminder — starts in about 1 hour',
          text: `Hi ${tutor.name}, reminder: your demo is at ${when} (${demo.mode}). Open TutorConnect for join details.`,
          html: `<p>Hi ${tutor.name},</p><p>Your demo starts in about <strong>1 hour</strong> — <strong>${when}</strong> (${demo.mode}).</p>`,
          payload: { demoId: demo.id },
        });
        await this.notifications.enqueueEmail({
          userId: student.id,
          event: 'DEMO_REMINDER',
          to: student.email,
          subject: 'Demo class reminder — starts in about 1 hour',
          text: `Hi ${student.name}, reminder: your demo is at ${when} (${demo.mode}). Open TutorConnect for join details.`,
          html: `<p>Hi ${student.name},</p><p>Your demo starts in about <strong>1 hour</strong> — <strong>${when}</strong> (${demo.mode}).</p>`,
          payload: { demoId: demo.id },
        });
        await this.prisma.demoClass.update({
          where: { id: demo.id },
          data: { reminderSentAt: new Date() },
        });
        this.logger.log(`Demo reminder queued for ${demo.id}`);
      } catch (err) {
        this.logger.warn(
          `Demo reminder failed for ${demo.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
