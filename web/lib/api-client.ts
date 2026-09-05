import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import {
  clearAuth,
  getAccessToken,
  getCsrfToken,
  getRefreshToken,
  persistTokens,
} from './auth';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** GET cache lifetime in ms (0 = disabled). Default from env. */
    cacheTtl?: number;
    /** Skip TTL cache read/write for this request. */
    skipCache?: boolean;
    /** Coalesce identical in-flight requests (GET default true). */
    dedupe?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _attempt?: number;
  }
}

type RetryConfig = InternalAxiosRequestConfig;

type NestErrorBody = {
  message?: string | string[];
  error?: string;
};

type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

export const API_MAX_ATTEMPTS = 3;

export const DEFAULT_API_CACHE_TTL_MS = Number(
  process.env.NEXT_PUBLIC_API_CACHE_TTL_MS ?? 30_000,
);

const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AxiosResponse>>();

export function clearApiCache() {
  responseCache.clear();
  inFlight.clear();
}

export function resolveApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  if (typeof window === 'undefined') {
    return env.replace(/\/$/, '');
  }
  try {
    const u = new URL(env, window.location.origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return '/api/v1';
    }
  } catch {
    if (env.startsWith('/')) return env.replace(/\/$/, '');
  }
  return env.replace(/\/$/, '');
}

function isAuthPath(path: string) {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/otp') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/password/reset') ||
    path.startsWith('/auth/refresh')
  );
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const locale = window.location.pathname.split('/')[1] || 'en';
  if (!window.location.pathname.includes('/auth/login')) {
    window.location.assign(`/${locale}/auth/login`);
  }
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as NestErrorBody | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
    return error.message || 'Request failed';
  }
  return error instanceof Error ? error.message : 'Request failed';
}

function stableSerialize(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'object') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function authFingerprint(config: AxiosRequestConfig): string {
  const headers = config.headers;
  if (!headers) return getAccessToken() || 'anon';
  if (typeof (headers as { get?: (k: string) => string }).get === 'function') {
    const auth = (headers as { get: (k: string) => string }).get('Authorization');
    if (auth) return auth;
  }
  const record = headers as Record<string, string>;
  if (record.Authorization) return record.Authorization;
  return getAccessToken() || 'anon';
}

export function buildRequestKey(config: AxiosRequestConfig): string {
  const method = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '';
  const params = stableSerialize(config.params);
  const data = config.data instanceof FormData ? '[form]' : stableSerialize(config.data);
  const auth = authFingerprint(config);
  return `${method}:${url}:${params}:${data}:${auth}`;
}

function isReadMethod(method: string) {
  return ['GET', 'HEAD'].includes(method.toUpperCase());
}

function isCacheable(config: AxiosRequestConfig): boolean {
  const method = (config.method ?? 'get').toUpperCase();
  if (!isReadMethod(method)) return false;
  if (config.skipCache) return false;
  if (config.responseType && config.responseType !== 'json') return false;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return false;
  const path = config.url ?? '';
  if (isAuthPath(path)) return false;
  return resolveCacheTtl(config) > 0;
}

function resolveCacheTtl(config: AxiosRequestConfig): number {
  if (config.cacheTtl !== undefined) return config.cacheTtl;
  return isReadMethod(config.method ?? 'get') ? DEFAULT_API_CACHE_TTL_MS : 0;
}

function readCache(key: string): unknown | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return hit.data;
}

function writeCache(key: string, data: unknown, ttl: number) {
  if (ttl <= 0) return;
  responseCache.set(key, { data, expiresAt: Date.now() + ttl });
}

function invalidateCacheForUrl(url: string) {
  const path = url.split('?')[0];
  for (const key of Array.from(responseCache.keys())) {
    if (key.includes(`:${path}:`)) {
      responseCache.delete(key);
    }
  }
}

function isNetworkError(error: AxiosError): boolean {
  return (
    !error.response &&
    (error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error')
  );
}

function isRetryable(error: unknown, method: string): boolean {
  // Never retry mutating requests — register/login etc. are not idempotent.
  // A timed-out POST can succeed on the server; retry then returns 409.
  if (!isReadMethod(method)) return false;
  if (!isAxiosError(error)) return true;
  if (error.config?._retry) return false;
  if (isNetworkError(error)) return true;
  const status = error.response?.status;
  if (!status) return false;
  if (status === 401 || status === 403 || status === 404) return false;
  return status === 408 || status === 429 || status >= 500;
}

function retryDelayMs(attempt: number): number {
  const base = 300 * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 120);
  return base + jitter;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCachedResponse<T>(
  config: AxiosRequestConfig,
  data: T,
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config as InternalAxiosRequestConfig,
    request: {},
  };
}

let refreshInFlight: Promise<boolean> | null = null;

type QueueItem = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: RetryConfig;
};

let failedQueue: QueueItem[] = [];

function flushQueue(error: unknown | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
      return;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    resolve(apiClient(config));
  });
  failedQueue = [];
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  const { data } = await axios.post<{
    accessToken?: string;
    refreshToken?: string;
  }>(
    `${resolveApiBaseUrl()}/auth/refresh`,
    refresh ? { refreshToken: refresh } : {},
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
      },
      validateStatus: (s) => s < 500,
    },
  );
  if (!data.accessToken || !data.refreshToken) return false;
  persistTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return true;
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      config.headers.set('X-CSRF-Token', csrf);
    }
  }

  const path = config.url ?? '';
  const jwt = getAccessToken();
  if (
    jwt &&
    jwt !== 'cookie' &&
    !isAuthPath(path) &&
    !config.headers.Authorization
  ) {
    config.headers.set('Authorization', `Bearer ${jwt}`);
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const path = original?.url ?? '';

    if (!original || status !== 401 || path.startsWith('/auth/') || original._retry) {
      return Promise.reject(error);
    }

    if (refreshInFlight) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: original });
      });
    }

    original._retry = true;
    refreshInFlight = tryRefresh()
      .then((ok) => {
        if (!ok) {
          const err = new Error(getErrorMessage(error));
          flushQueue(err, null);
          clearAuth();
          clearApiCache();
          redirectToLogin();
          throw err;
        }
        const jwt = getAccessToken();
        const bearer = jwt && jwt !== 'cookie' ? jwt : null;
        flushQueue(null, bearer);
        if (bearer) {
          original.headers.Authorization = `Bearer ${bearer}`;
        }
        clearApiCache();
        return true;
      })
      .finally(() => {
        refreshInFlight = null;
      });

    try {
      await refreshInFlight;
      return apiClient(original);
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(getErrorMessage(e)));
    }
  },
);

const axiosRequest = apiClient.request.bind(apiClient) as <
  T = unknown,
  D = unknown,
>(
  config: AxiosRequestConfig<D>,
) => Promise<AxiosResponse<T, D>>;

async function requestWithPolicy<T = unknown, D = unknown>(
  config: AxiosRequestConfig<D>,
): Promise<AxiosResponse<T, D>> {
  const method = (config.method ?? 'get').toUpperCase();
  const key = buildRequestKey(config);
  const cacheable = isCacheable(config);
  const ttl = resolveCacheTtl(config);
  const shouldDedupe =
    config.dedupe ?? (isReadMethod(method) && config.responseType !== 'blob');

  if (cacheable) {
    const cached = readCache(key);
    if (cached !== null) {
      return toCachedResponse<T>(config, cached as T);
    }
  }

  if (shouldDedupe) {
    const pending = inFlight.get(key);
    if (pending) {
      return pending as Promise<AxiosResponse<T, D>>;
    }
  }

  const run = async (): Promise<AxiosResponse<T, D>> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await axiosRequest<T, D>({
          ...config,
          _attempt: attempt,
        } as InternalAxiosRequestConfig<D>);

        if (cacheable) {
          writeCache(key, response.data, ttl);
        }

        const mutating = !isReadMethod(method);
        if (mutating && config.url) {
          invalidateCacheForUrl(config.url);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt >= API_MAX_ATTEMPTS || !isRetryable(error, method)) {
          break;
        }
        await sleep(retryDelayMs(attempt));
      }
    }

    throw new Error(getErrorMessage(lastError));
  };

  const promise = run().finally(() => {
    inFlight.delete(key);
  });

  if (shouldDedupe) {
    inFlight.set(key, promise as Promise<AxiosResponse>);
  }

  return promise;
};

(apiClient as unknown as { request: typeof requestWithPolicy }).request =
  requestWithPolicy;

export async function uploadForm<T>(
  path: string,
  formData: FormData,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.post<T>(path, formData, {
    ...config,
    skipCache: true,
    dedupe: false,
  });
  return data;
}

export async function downloadBlob(path: string, filename: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(path, {
    responseType: 'blob',
    skipCache: true,
    dedupe: false,
  });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
