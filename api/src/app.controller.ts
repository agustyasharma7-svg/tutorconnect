import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness — process is up (no dependency checks). */
  @Get('health')
  health() {
    return { status: 'ok', service: 'tutorconnect-api', version: '0.1.0' };
  }

  /** Readiness — DB + Redis must respond (Phase 7B.4). */
  @Get('health/ready')
  async ready() {
    const checks: { database: boolean; redis: boolean } = {
      database: false,
      redis: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      const pong = await this.redis.getClient().ping();
      checks.redis = pong === 'PONG';
    } catch {
      checks.redis = false;
    }

    if (!checks.database || !checks.redis) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'tutorconnect-api',
        checks,
      });
    }

    return {
      status: 'ready',
      service: 'tutorconnect-api',
      checks,
    };
  }
}
