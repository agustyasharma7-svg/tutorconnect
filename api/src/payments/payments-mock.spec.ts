import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

describe('PaymentsService mock mode (7A.2)', () => {
  function makeService(env: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new PaymentsService(
      {} as never,
      config,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  it('isMockMode is always false in production', () => {
    const svc = makeService({
      NODE_ENV: 'production',
      PAYMENTS_MOCK: 'true',
      RAZORPAY_KEY_ID: '',
    });
    expect(svc.isMockMode()).toBe(false);
  });

  it('isMockMode respects PAYMENTS_MOCK=true outside production', () => {
    const svc = makeService({
      NODE_ENV: 'development',
      PAYMENTS_MOCK: 'true',
    });
    expect(svc.isMockMode()).toBe(true);
  });

  it('isMockMode is false when PAYMENTS_MOCK=false even without Razorpay keys', () => {
    const svc = makeService({
      NODE_ENV: 'development',
      PAYMENTS_MOCK: 'false',
      RAZORPAY_KEY_ID: undefined,
    });
    expect(svc.isMockMode()).toBe(false);
  });

  it('mockComplete throws ForbiddenException when PAYMENTS_MOCK=false', async () => {
    const svc = makeService({
      NODE_ENV: 'development',
      PAYMENTS_MOCK: 'false',
    });
    await expect(
      svc.mockComplete('user-1', { paymentId: 'pay-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mockComplete throws ForbiddenException in production', async () => {
    const svc = makeService({
      NODE_ENV: 'production',
      PAYMENTS_MOCK: 'true',
    });
    await expect(
      svc.mockComplete('user-1', { paymentId: 'pay-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
