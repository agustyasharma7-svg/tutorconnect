import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { CommissionOverdueService } from './commission-overdue.service';

@Module({
  imports: [CloudinaryModule, NotificationsModule],
  controllers: [CommissionsController],
  providers: [CommissionsService, CommissionOverdueService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
