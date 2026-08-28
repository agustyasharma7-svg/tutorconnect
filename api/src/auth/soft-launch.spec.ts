import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';

describe('AuthService soft launch invite (7D.3)', () => {
  async function makeService(env: Record<string, string>) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: 'u1',
                email: 'new@test.com',
              }),
            },
          },
        },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
        { provide: MailService, useValue: { sendOtp: jest.fn() } },
        JwtService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();
    return moduleRef.get(AuthService);
  }

  it('blocks registration without invite when invite-only', async () => {
    const svc = await makeService({
      SOFT_LAUNCH_INVITE_ONLY: 'true',
      SOFT_LAUNCH_INVITE_CODES: 'beta-ok',
      OTP_TTL_SECONDS: '300',
    });
    await expect(
      svc.registerStudent({
        name: 'A',
        mobile: '9876543210',
        email: 'new@test.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows registration with valid invite code', async () => {
    const svc = await makeService({
      SOFT_LAUNCH_INVITE_ONLY: 'true',
      SOFT_LAUNCH_INVITE_CODES: 'beta-ok',
      OTP_TTL_SECONDS: '300',
      JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars!',
    });
    await expect(
      svc.registerStudent({
        name: 'A',
        mobile: '9876543210',
        email: 'new@test.com',
        inviteCode: 'beta-ok',
      }),
    ).resolves.toMatchObject({ userId: 'u1' });
  });

  it('allows invite codes case-insensitively', async () => {
    const svc = await makeService({
      SOFT_LAUNCH_INVITE_ONLY: 'true',
      SOFT_LAUNCH_INVITE_CODES: 'Beta-OK',
      OTP_TTL_SECONDS: '300',
      JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars!',
    });
    await expect(
      svc.registerStudent({
        name: 'A',
        mobile: '9876543210',
        email: 'new@test.com',
        inviteCode: 'beta-ok',
      }),
    ).resolves.toMatchObject({ userId: 'u1' });
  });

  it('allows allowlisted email without code', async () => {
    const svc = await makeService({
      SOFT_LAUNCH_INVITE_ONLY: 'true',
      SOFT_LAUNCH_ALLOWLIST_EMAILS: 'vip@test.com',
      OTP_TTL_SECONDS: '300',
      JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars!',
    });
    await expect(
      svc.registerStudent({
        name: 'A',
        mobile: '9876543210',
        email: 'vip@test.com',
      }),
    ).resolves.toMatchObject({ userId: 'u1' });
  });
});
