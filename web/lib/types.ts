export type UserRole = 'STUDENT' | 'TUTOR' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  mobile: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  locale: string;
}
