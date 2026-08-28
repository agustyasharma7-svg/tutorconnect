import { createHash, randomBytes } from 'crypto';
import { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'tc_access';
export const REFRESH_COOKIE = 'tc_refresh';
export const CSRF_COOKIE = 'tc_csrf';

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function baseCookie(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function hashCsrf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function issueCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  opts?: { accessMaxAgeMs?: number; refreshMaxAgeMs?: number },
) {
  const accessMax = opts?.accessMaxAgeMs ?? 15 * 60 * 1000;
  const refreshMax = opts?.refreshMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
  const csrf = issueCsrfToken();

  res.cookie(ACCESS_COOKIE, tokens.accessToken, baseCookie(accessMax));
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, baseCookie(refreshMax));
  // Readable double-submit CSRF token (not httpOnly)
  res.cookie(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: refreshMax,
  });
}

export function clearAuthCookies(res: Response) {
  const clear: CookieOptions = {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
  res.cookie(ACCESS_COOKIE, '', clear);
  res.cookie(REFRESH_COOKIE, '', clear);
  res.cookie(CSRF_COOKIE, '', {
    ...clear,
    httpOnly: false,
  });
}
