import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { TutorsModule } from '../tutors/tutors.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { DemoClassesController } from './demo-classes.controller';
import { DemoClassesService } from './demo-classes.service';
import { DemoReminderService } from './demo-reminder.service';

@Module({
  imports: [StudentsModule, TutorsModule, SchedulesModule],
  controllers: [DemoClassesController],
  providers: [DemoClassesService, DemoReminderService],
  exports: [DemoClassesService],
})
export class DemoClassesModule {}
