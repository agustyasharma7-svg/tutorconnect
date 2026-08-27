import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { TutorsModule } from '../tutors/tutors.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';

@Module({
  imports: [StudentsModule, TutorsModule, SchedulesModule, CommissionsModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
