'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Doc = {
  id: string;
  type: string;
  fileName: string;
  verificationStatus: string;
  piiMasked?: string;
};

type Ver = {
  verificationStatus: string;
  isVerified: boolean;
  verificationRejectReason?: string | null;
  documents: Doc[];
};

const TYPES = ['AADHAAR', 'PAN', 'DEGREE'] as const;

export default function VerificationPage() {
  const t = useTranslations('verification');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [data, setData] = useState<Ver | null>(null);
  const [type, setType] = useState<(typeof TYPES)[number]>('AADHAAR');
  const [docNumber, setDocNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = (access: string) =>
    apiWithAuth<Ver>('/tutors/me/verification', access).then(setData);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      if (docNumber.trim()) fd.append('documentNumber', docNumber.trim());
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/tutors/me/documents`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Upload failed');
      setData(json);
      setFile(null);
      setDocNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <p className="p-8">{error || tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('status')}: <strong>{data.verificationStatus}</strong>
          {data.isVerified ? ` · ${t('verified')}` : ''}
        </p>
        {data.verificationRejectReason && (
          <p className="mt-2 text-sm text-red-600">
            {t('rejectReason')}: {data.verificationRejectReason}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={submit} className="mt-6 space-y-3 rounded-lg bg-white p-4 shadow">
          <select
            className="w-full rounded border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          >
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`type_${x}`)}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder={t('documentNumber')}
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
          />
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {t('upload')}
          </button>
        </form>

        <ul className="mt-6 space-y-2">
          {data.documents.map((d) => (
            <li key={d.id} className="rounded border bg-white p-3 text-sm">
              {d.type} · {d.fileName} · {d.verificationStatus}
              {d.piiMasked ? ` · ${d.piiMasked}` : ''}
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/dashboard/tutor`} className="mt-6 inline-block text-blue-600">
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
