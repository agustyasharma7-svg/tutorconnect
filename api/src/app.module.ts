import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { TutorsModule } from './tutors/tutors.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminModule } from './admin/admin.module';
import { RequirementsModule } from './requirements/requirements.module';
import { MatchesModule } from './matches/matches.module';
import { SchedulesModule } from './schedules/schedules.module';
import { DemoClassesModule } from './demo-classes/demo-classes.module';
import { AgreementsModule } from './agreements/agreements.module';
import { CommissionsModule } from './commissions/commissions.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VerificationModule } from './verification/verification.module';
import { RatingsModule } from './ratings/ratings.module';
import { DisputesModule } from './disputes/disputes.module';
import { ChatModule } from './chat/chat.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 30,
      },
    ]),
    PrismaModule,
    RedisModule,
    MailModule,
    CloudinaryModule,
    CommonModule,
    NotificationsModule,
    AuthModule,
    StudentsModule,
    TutorsModule,
    CatalogModule,
    AdminModule,
    RequirementsModule,
    MatchesModule,
    SchedulesModule,
    DemoClassesModule,
    AgreementsModule,
    CommissionsModule,
    PaymentsModule,
    VerificationModule,
    RatingsModule,
    DisputesModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
