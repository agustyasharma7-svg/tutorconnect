import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import {
  RegisterStudentDto,
  RegisterTutorDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private otpKey(email: string) {
    return `otp:${email.toLowerCase()}`;
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private assertNotSuspended(user: { status: UserStatus }) {
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }
  }

  private requireJwtSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
    const value = this.config.get<string>(key)?.trim();
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (!value) {
      if (isProd) {
        throw new Error(`${key} is required when NODE_ENV=production`);
      }
      return key === 'JWT_ACCESS_SECRET'
        ? 'dev-access-secret-min-32-chars!!'
        : 'dev-refresh-secret-min-32-chars!';
    }
    if (
      isProd &&
      (value.includes('change-me') ||
        value.includes('dev-access') ||
        value.includes('dev-refresh'))
    ) {
      throw new Error(`${key} must not use a development placeholder in production`);
    }
    return value;
  }

  /** Parse JWT expiry env like `15m`, `7d`, or raw seconds. */
  private parseExpiresIn(
    value: string | undefined,
    fallbackSeconds: number,
  ): number {
    if (!value) return fallbackSeconds;
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const m = trimmed.match(/^(\d+)([smhd])$/i);
    if (!m) return fallbackSeconds;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === 's') return n;
    if (unit === 'm') return n * 60;
    if (unit === 'h') return n * 3600;
    if (unit === 'd') return n * 86400;
    return fallbackSeconds;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: UserRole;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessExpires = this.parseExpiresIn(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
      900,
    );
    const refreshExpires = this.parseExpiresIn(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN'),
      604800,
    );
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.requireJwtSecret('JWT_ACCESS_SECRET'),
      expiresIn: accessExpires,
    });
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.requireJwtSecret('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpires,
      },
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: this.hashRefreshToken(refreshToken) },
    });
    return { accessToken, refreshToken };
  }

  private formatUser(user: {
    id: string;
    email: string;
    mobile: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    locale: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      name: user.name,
      role: user.role,
      status: user.status,
      locale: user.locale,
    };
  }

  async registerStudent(dto: RegisterStudentDto) {
    this.assertSoftLaunchAccess(dto.email, dto.inviteCode);
    await this.assertUnique(dto.mobile, dto.email);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email.toLowerCase(),
        role: UserRole.STUDENT,
        locale: dto.locale ?? 'en',
        status: UserStatus.PENDING_VERIFICATION,
        student: {
          create: { preferredLanguage: dto.locale ?? 'en' },
        },
      },
    });
    await this.sendOtpInternal(user.email);
    return { message: 'Student registered. OTP sent to email.', userId: user.id };
  }

  async registerTutor(dto: RegisterTutorDto) {
    this.assertSoftLaunchAccess(dto.email, dto.inviteCode);
    await this.assertUnique(dto.mobile, dto.email);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email.toLowerCase(),
        role: UserRole.TUTOR,
        qualification: dto.qualification,
        locale: dto.locale ?? 'en',
        status: UserStatus.PENDING_VERIFICATION,
        tutor: { create: {} },
      },
    });
    await this.sendOtpInternal(user.email);
    return { message: 'Tutor registered. OTP sent to email.', userId: user.id };
  }

  /**
   * Soft launch gate (Phase 7D.3): when SOFT_LAUNCH_INVITE_ONLY=true,
   * registration requires a matching invite code or allowlisted email.
   */
  private assertSoftLaunchAccess(email: string, inviteCode?: string) {
    const enabled =
      this.config.get<string>('SOFT_LAUNCH_INVITE_ONLY')?.trim() === 'true';
    if (!enabled) return;

    const allowlist = (this.config.get<string>('SOFT_LAUNCH_ALLOWLIST_EMAILS') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist.includes(email.toLowerCase())) return;

    const codes = (this.config.get<string>('SOFT_LAUNCH_INVITE_CODES') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const code = inviteCode?.trim().toLowerCase() ?? '';
    if (code && codes.includes(code)) return;

    throw new BadRequestException(
      'Invite-only soft launch: provide a valid invite code or use an allowlisted email',
    );
  }

  private async assertUnique(mobile: string, email: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ mobile }, { email: email.toLowerCase() }] },
    });
    if (existing) {
      throw new ConflictException(
        'Mobile or email already registered. One account per role only.',
      );
    }
  }

  async sendOtp(dto: SendOtpDto) {
    const email = dto.email.toLowerCase();
    if (dto.purpose === 'login') {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new NotFoundException('No account found with this email');
      this.assertNotSuspended(user);
    }
    await this.sendOtpInternal(email);
    return { message: 'OTP sent to email' };
  }

  private async sendOtpInternal(email: string) {
    const otp = this.generateOtp();
    const ttl = Number(this.config.get('OTP_TTL_SECONDS') ?? 300);
    await this.redis.set(this.otpKey(email), this.hashOtp(otp), ttl);
    await this.mail.sendOtp(email, otp);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.toLowerCase();
    const stored = await this.redis.get(this.otpKey(email));
    if (!stored || stored !== this.hashOtp(dto.otp)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redis.del(this.otpKey(email));

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    this.assertNotSuspended(existing);

    const user = await this.prisma.user.update({
      where: { email },
      data: { status: UserStatus.ACTIVE },
    });

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.formatUser(user) };
  }

  async loginWithPassword(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    this.assertNotSuspended(user);

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.formatUser(user) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        role: UserRole;
      }>(refreshToken, {
        secret: this.requireJwtSecret('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user?.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      this.assertNotSuspended(user);
      const incoming = this.hashRefreshToken(refreshToken);
      if (incoming !== user.refreshTokenHash) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null },
        });
        throw new UnauthorizedException('Invalid refresh token');
      }
      const tokens = await this.issueTokens(user);
      return { ...tokens, user: this.formatUser(user) };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }

  /** Revoke refresh token hash (logout). Idempotent if token missing/invalid. */
  async logout(refreshToken?: string | null) {
    if (!refreshToken) return { ok: true };
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.requireJwtSecret('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user?.refreshTokenHash) return { ok: true };
      const incoming = this.hashRefreshToken(refreshToken);
      if (incoming === user.refreshTokenHash) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null },
        });
      }
    } catch {
      /* ignore invalid token on logout */
    }
    return { ok: true };
  }

  async setPassword(userId: string, password: string) {
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      throw new BadRequestException(
        'Password must be 8+ chars with letters and numbers',
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { message: 'Password set successfully' };
  }

  async resetPassword(email: string, otp: string, password: string) {
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      throw new BadRequestException(
        'Password must be 8+ chars with letters and numbers',
      );
    }
    const key = this.otpKey(email.toLowerCase());
    const stored = await this.redis.get(key);
    if (!stored || stored !== this.hashOtp(otp)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redis.del(key);
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash, refreshTokenHash: null },
    });
    return { message: 'Password reset successfully' };
  }
}
