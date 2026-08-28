import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller';

describe('AppController health (7B.4)', () => {
  it('liveness returns ok without dependency checks', () => {
    const ctrl = new AppController({} as never, {} as never);
    expect(ctrl.health()).toEqual(
      expect.objectContaining({ status: 'ok', service: 'tutorconnect-api' }),
    );
  });

  it('readiness succeeds when DB and Redis respond', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const redis = {
      getClient: () => ({ ping: jest.fn().mockResolvedValue('PONG') }),
    };
    const ctrl = new AppController(prisma as never, redis as never);
    await expect(ctrl.ready()).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        checks: { database: true, redis: true },
      }),
    );
  });

  it('readiness returns 503 when Redis is down', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([1]) };
    const redis = {
      getClient: () => ({
        ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      }),
    };
    const ctrl = new AppController(prisma as never, redis as never);
    await expect(ctrl.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
