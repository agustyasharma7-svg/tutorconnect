import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { MatchesModule } from '../matches/matches.module';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';

@Module({
  imports: [StudentsModule, MatchesModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
