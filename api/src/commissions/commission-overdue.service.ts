import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommissionsService } from './commissions.service';

/** Hourly overdue scan + discoverability restriction for unpaid commissions. */
@Injectable()
export class CommissionOverdueService {
  private readonly logger = new Logger(CommissionOverdueService.name);

  constructor(private readonly commissions: CommissionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processOverdue() {
    const count = await this.commissions.processAllOverdue();
    if (count > 0) {
      this.logger.log(`Marked ${count} commission(s) overdue`);
    }
  }
}
