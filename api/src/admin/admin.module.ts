import { Module } from '@nestjs/common';
import { CommissionsModule } from '../commissions/commissions.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [CommissionsModule],
  controllers: [AdminController],
})
export class AdminModule {}
