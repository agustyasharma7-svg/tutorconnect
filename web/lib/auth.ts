'use client';

import { AuthTokens, AuthUser } from './types';

const ACCESS_KEY = 'tc_access_token';
const REFRESH_KEY = 'tc_refresh_token';
const USER_KEY = 'tc_user';

export function saveAuth(tokens: AuthTokens, user: AuthUser) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
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
