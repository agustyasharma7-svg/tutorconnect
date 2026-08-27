import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DemoClassStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/** Sends reminder ~1 hour before scheduled demos (runs every 5 minutes). */
@Injectable()
export class DemoReminderService {
  private readonly logger = new Logger(DemoReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
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
        await this.mail.sendDemoReminder(tutor.email, {
          name: tutor.name,
          when,
          mode: demo.mode,
        });
        await this.mail.sendDemoReminder(student.email, {
          name: student.name,
          when,
          mode: demo.mode,
        });
        await this.prisma.demoClass.update({
          where: { id: demo.id },
          data: { reminderSentAt: new Date() },
        });
        this.logger.log(`Demo reminder sent for ${demo.id}`);
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
