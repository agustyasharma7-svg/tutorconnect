import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock };

  const baseUser = {
    id: 'user-1',
    email: 'a@test.com',
    mobile: '9000000001',
    name: 'Test',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    locale: 'en',
    passwordHash: '',
    refreshTokenHash: null as string | null,
  };

  beforeAll(async () => {
    baseUser.passwordHash = await bcrypt.hash('Pass1234', 12);
  });

  beforeEach(async () => {
    baseUser.status = UserStatus.ACTIVE;
    baseUser.refreshTokenHash = null;
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const next = { ...baseUser, id: where?.id ?? baseUser.id, ...data };
          if (data.refreshTokenHash !== undefined) {
            baseUser.refreshTokenHash = data.refreshTokenHash;
          }
          if (data.status !== undefined) {
            baseUser.status = data.status;
          }
          return next;
        }),
      },
    };
    redis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: MailService, useValue: { sendOtp: jest.fn() } },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars!!',
                JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars!',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
                OTP_TTL_SECONDS: '300',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('issues tokens on password login and rotates refresh hash', async () => {
    prisma.user.findUnique.mockImplementation(async () => ({ ...baseUser }));
    const first = await service.loginWithPassword('a@test.com', 'Pass1234');
    expect(first.accessToken).toBeTruthy();
    expect(first.refreshToken).toBeTruthy();
    expect(prisma.user.update).toHaveBeenCalled();
    expect(baseUser.refreshTokenHash).toBeTruthy();

    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    await expect(service.refresh(first.refreshToken)).rejects.toThrow(
      /Invalid refresh token/,
    );
  });

  it('refuses password login for SUSPENDED users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      status: UserStatus.SUSPENDED,
    });
    await expect(
      service.loginWithPassword('a@test.com', 'Pass1234'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses OTP verify for SUSPENDED users and does not activate them', async () => {
    const otp = '123456';
    redis.get.mockResolvedValue(
      createHash('sha256').update(otp).digest('hex'),
    );
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      status: UserStatus.SUSPENDED,
    });
    await expect(
      service.verifyOtp({ email: 'a@test.com', otp }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: UserStatus.ACTIVE }),
      }),
    );
  });

  it('stores OTP hashed in Redis', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser });
    await service.sendOtp({ email: 'a@test.com', purpose: 'login' });
    expect(redis.set).toHaveBeenCalled();
    const stored = redis.set.mock.calls[0][1] as string;
    expect(stored).toMatch(/^[a-f0-9]{64}$/);
    expect(stored).not.toMatch(/^\d{6}$/);
  });

  it('refuses refresh for SUSPENDED users', async () => {
    prisma.user.findUnique.mockImplementation(async () => ({ ...baseUser }));
    const tokens = await service.loginWithPassword('a@test.com', 'Pass1234');
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      status: UserStatus.SUSPENDED,
      refreshTokenHash: baseUser.refreshTokenHash,
    });
    await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
