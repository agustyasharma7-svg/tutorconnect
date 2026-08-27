import { Module } from '@nestjs/common';
import { TutorsModule } from '../tutors/tutors.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { SessionReminderService } from './session-reminder.service';

@Module({
  imports: [TutorsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SessionReminderService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
