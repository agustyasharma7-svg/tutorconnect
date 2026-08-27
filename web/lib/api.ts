const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message ?? data.error ?? 'Request failed';
    throw new Error(msg);
  }
  return data as T;
}

export function apiWithAuth<T>(path: string, token: string, options: RequestInit = {}) {
  return api<T>(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export function assetUrl(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = API_URL.replace(/\/api\/v1$/, '');
  return `${base}${path}`;
}
