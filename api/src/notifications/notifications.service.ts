import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { NotificationStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EMAIL_QUEUE, EmailJobData } from './email.constants';

const MAX_ATTEMPTS = 3;

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private queueReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  onModuleInit() {
    this.queueReady = true;
    this.logger.log('Email BullMQ queue ready');
  }

  /**
   * Persist notification + enqueue BullMQ email job (3 attempts, exponential backoff).
   * Falls back to sync send if queue add fails.
   */
  async enqueueEmail(params: {
    userId: string;
    event: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    payload?: Prisma.InputJsonValue;
  }) {
    const row = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        event: params.event,
        channel: 'EMAIL',
        payload: params.payload,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      await this.emailQueue.add(
        'send',
        {
          notificationId: row.id,
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html,
        },
        {
          attempts: MAX_ATTEMPTS,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );
      return row.id;
    } catch (err) {
      this.logger.warn(
        `BullMQ enqueue failed, falling back to sync send: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return this.sendSync(row.id, params);
    }
  }

  private async sendSync(
    notificationId: string,
    params: {
      to: string;
      subject: string;
      text: string;
      html: string;
    },
  ) {
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.mail.sendRaw(
          params.to,
          params.subject,
          params.text,
          params.html,
        );
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            attempts: attempt,
            sentAt: new Date(),
            lastError: null,
          },
        });
        return notificationId;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { attempts: attempt, lastError },
        });
      }
    }
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.FAILED, lastError },
    });
    return notificationId;
  }
}
