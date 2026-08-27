import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';

describe('AuthService refresh rotation (integration-style)', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  const user = {
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
    user.passwordHash = await bcrypt.hash('Pass1234', 12);
  });

  beforeEach(async () => {
    user.refreshTokenHash = null;
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          if (data.refreshTokenHash !== undefined) {
            user.refreshTokenHash = data.refreshTokenHash;
          }
          return { ...user, id: where?.id ?? user.id, ...data };
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
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
    prisma.user.findUnique.mockImplementation(async () => ({ ...user }));
    const first = await service.loginWithPassword('a@test.com', 'Pass1234');
    expect(first.accessToken).toBeTruthy();
    expect(first.refreshToken).toBeTruthy();
    expect(prisma.user.update).toHaveBeenCalled();
    expect(user.refreshTokenHash).toBeTruthy();

    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    await expect(service.refresh(first.refreshToken)).rejects.toThrow(
      /Invalid refresh token/,
    );
  });
});
