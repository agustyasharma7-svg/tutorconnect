import type { AxiosRequestConfig, Method } from 'axios';
import {
  apiClient,
  clearApiCache,
  downloadBlob,
  getErrorMessage,
  resolveApiBaseUrl,
  uploadForm,
} from './api-client';

export { apiClient, clearApiCache, downloadBlob, getErrorMessage, resolveApiBaseUrl, uploadForm };

/** Legacy fetch-style options mapped to Axios. */
export type ApiOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
} & Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'headers'>;

function headersToRecord(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
}

function bodyToData(body?: BodyInit | null): unknown {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

function toAxiosConfig(path: string, options: ApiOptions = {}): AxiosRequestConfig {
  const { method, body, headers, ...rest } = options;
  return {
    ...rest,
    url: path,
    method: (method?.toLowerCase() ?? 'get') as Method,
    data: bodyToData(body),
    headers: headersToRecord(headers),
  };
}

/** Typed JSON API — returns response body directly. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { data } = await apiClient.request<T>(toAxiosConfig(path, options));
  return data;
}

/** Authenticated call — Bearer from token arg or session (interceptor fallback). */
export async function apiWithAuth<T>(
  path: string,
  token?: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers as HeadersInit | undefined);
  const jwt = token && token !== 'cookie' ? token : undefined;
  if (jwt) {
    headers.set('Authorization', `Bearer ${jwt}`);
  }
  return api<T>(path, { ...options, headers });
}

export function assetUrl(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = resolveApiBaseUrl();
  const origin = base.startsWith('http') ? base.replace(/\/api\/v1$/, '') : '';
  return `${origin}${path}`;
}
