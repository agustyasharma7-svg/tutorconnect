import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE } from './email.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
      }),
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [NotificationsService, EmailProcessor],
  exports: [NotificationsService, BullModule],
})
export class NotificationsModule {}
