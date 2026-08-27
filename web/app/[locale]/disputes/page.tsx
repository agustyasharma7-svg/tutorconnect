'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Dispute = {
  id: string;
  type: string;
  status: string;
  description: string;
  resolution?: string | null;
  agreementId: string;
};

const TYPES = ['PAYMENT', 'CONDUCT', 'SCHEDULE', 'QUALITY', 'OTHER'];

export default function DisputesPage() {
  const t = useTranslations('disputes');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [rows, setRows] = useState<Dispute[]>([]);
  const [agreementId, setAgreementId] = useState(params.get('agreementId') ?? '');
  const [type, setType] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const load = (access: string) =>
    apiWithAuth<Dispute[]>('/disputes', access).then(setRows);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    setRole(user.role);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const uploadEvidence = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/disputes/evidence/upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? 'Upload failed');
    setEvidenceUrls((prev) => [...prev, json.url]);
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiWithAuth('/disputes', token, {
        method: 'POST',
        body: JSON.stringify({
          agreementId,
          type,
          description,
          evidenceUrls,
        }),
      });
      setDescription('');
      setEvidenceUrls([]);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const resolve = async () => {
    if (!resolveId) return;
    try {
      await apiWithAuth(`/disputes/${resolveId}/resolve`, token, {
        method: 'POST',
        body: JSON.stringify({ resolution }),
      });
      setResolveId(null);
      setResolution('');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('title')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {role !== 'ADMIN' && (
          <form onSubmit={create} className="mb-8 space-y-3 rounded-lg bg-white p-4 shadow">
            <input
              className="w-full rounded border px-3 py-2"
              placeholder={t('agreementId')}
              value={agreementId}
              onChange={(e) => setAgreementId(e.target.value)}
              required
            />
            <select
              className="w-full rounded border px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <textarea
              className="w-full rounded border px-3 py-2"
              rows={3}
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description')}
            />
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadEvidence(f).catch((err) => setError(String(err)));
              }}
            />
            {!!evidenceUrls.length && (
              <p className="text-xs text-gray-500">
                {evidenceUrls.length} {t('evidenceAttached')}
              </p>
            )}
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
              {t('create')}
            </button>
          </form>
        )}

        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <p className="font-medium">
                {r.type} · {r.status}
              </p>
              <p className="text-sm text-gray-600">{r.description}</p>
              {r.resolution && (
                <p className="mt-1 text-sm text-green-700">
                  {t('resolution')}: {r.resolution}
                </p>
              )}
              {role === 'ADMIN' &&
                (r.status === 'OPEN' || r.status === 'UNDER_REVIEW') && (
                  <button
                    type="button"
                    className="mt-2 text-sm text-blue-600 underline"
                    onClick={() => setResolveId(r.id)}
                  >
                    {t('resolve')}
                  </button>
                )}
            </li>
          ))}
        </ul>

        {resolveId && (
          <div className="mt-6 space-y-2 rounded border bg-white p-4">
            <textarea
              className="w-full rounded border px-3 py-2"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder={t('resolutionNotes')}
            />
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white"
              onClick={resolve}
            >
              {t('confirmResolve')}
            </button>
          </div>
        )}

        <Link
          href={`/${locale}/dashboard/${role.toLowerCase()}`}
          className="mt-6 inline-block text-blue-600"
        >
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
