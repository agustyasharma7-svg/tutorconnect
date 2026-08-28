import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { ACCESS_COOKIE } from '../auth-cookies';

function resolveAccessSecret(config: ConfigService): string {
  const value = config.get<string>('JWT_ACCESS_SECRET')?.trim();
  const isProd = config.get<string>('NODE_ENV') === 'production';
  if (!value) {
    if (isProd) {
      throw new Error('JWT_ACCESS_SECRET is required when NODE_ENV=production');
    }
    return 'dev-access-secret-min-32-chars!!';
  }
  if (
    isProd &&
    (value.includes('change-me') || value.includes('dev-access'))
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET must not use a development placeholder in production',
    );
  }
  return value;
}

function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[ACCESS_COOKIE];
  return token || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: resolveAccessSecret(config),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Invalid or suspended account');
    }
    return { sub: user.id, email: user.email, role: user.role };
  }
}
