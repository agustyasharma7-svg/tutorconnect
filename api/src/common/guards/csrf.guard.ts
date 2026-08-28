import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { CSRF_COOKIE } from '../../auth/auth-cookies';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF for cookie-authenticated mutating requests.
 * Skipped when Authorization: Bearer is present (API clients / mobile).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE.has(req.method.toUpperCase())) return true;

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return true;

    const cookieToken = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[CSRF_COOKIE];
    const headerToken =
      (req.headers['x-csrf-token'] as string | undefined)?.trim() ||
      (req.headers['x-xsrf-token'] as string | undefined)?.trim();

    // No cookie session → nothing to CSRF (unauthenticated or Bearer-only)
    if (!cookieToken) return true;

    if (!headerToken || headerToken !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
