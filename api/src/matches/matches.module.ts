import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { TutorsModule } from '../tutors/tutors.module';
import { MatchesController } from './matches.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [StudentsModule, TutorsModule],
  controllers: [MatchesController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchesModule {}
