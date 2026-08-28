'use client';

import { AuthTokens, AuthUser } from './types';
import { apiClient, clearApiCache } from './api-client';

const USER_KEY = 'tc_user';
const ACCESS_KEY = 'tc_access_token';
const REFRESH_KEY = 'tc_refresh_token';
const CSRF_COOKIE = 'tc_csrf';

/** Read CSRF double-submit token from document cookie. */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function persistTokens(tokens: AuthTokens) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

/**
 * Persist session user. JWTs also go in httpOnly cookies (API Set-Cookie).
 * Access/refresh are kept in sessionStorage so cross-origin localhost
 * (web :3000 → API :3001) can still send Authorization: Bearer.
 */
export function saveAuth(tokens: AuthTokens, user: AuthUser) {
  persistTokens(tokens);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  }
  clearApiCache();
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(REFRESH_KEY);
}

/**
 * Real JWT from sessionStorage, or a sentinel when only cookie session exists.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const jwt = sessionStorage.getItem(ACCESS_KEY);
  if (jwt) return jwt;
  return getStoredUser() ? 'cookie' : null;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function dashboardPath(role: string, locale: string): string {
  const map: Record<string, string> = {
    STUDENT: 'student',
    TUTOR: 'tutor',
    ADMIN: 'admin',
  };
  return `/${locale}/dashboard/${map[role] ?? 'student'}`;
}

/** Clear cookies server-side + local user cache. */
export async function logoutSession() {
  try {
    const refresh = getRefreshToken();
    await apiClient.post(
      '/auth/logout',
      refresh ? { refreshToken: refresh } : {},
    );
  } catch {
    /* still clear local */
  }
  clearAuth();
}
