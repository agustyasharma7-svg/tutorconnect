import { Module } from '@nestjs/common';
import { TutorsModule } from '../tutors/tutors.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { SessionReminderService } from './session-reminder.service';

@Module({
  imports: [TutorsModule, NotificationsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SessionReminderService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
