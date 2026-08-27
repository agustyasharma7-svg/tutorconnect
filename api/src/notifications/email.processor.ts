import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EMAIL_QUEUE, EmailJobData } from './email.constants';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { notificationId, to, subject, text, html } = job.data;
    const attempts = job.attemptsMade + 1;
    try {
      await this.mail.sendRaw(to, subject, text, html);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          attempts,
          sentAt: new Date(),
          lastError: null,
        },
      });
      this.logger.log(`Email job ${job.id} sent (notification ${notificationId})`);
    } catch (err) {
      const lastError = err instanceof Error ? err.message : String(err);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { attempts, lastError },
      });
      this.logger.warn(
        `Email job ${job.id} attempt ${attempts} failed: ${lastError}`,
      );
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<EmailJobData> | undefined, err: Error) {
    if (!job) return;
    const max = job.opts.attempts ?? 1;
    if (job.attemptsMade >= max) {
      await this.prisma.notification.update({
        where: { id: job.data.notificationId },
        data: {
          status: NotificationStatus.FAILED,
          lastError: err.message,
          attempts: job.attemptsMade,
        },
      });
    }
  }
}
