'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Row = {
  tutorId: string;
  name: string;
  email: string;
  documents: { id: string; type: string; fileName: string; piiMasked?: string; fileUrl?: string }[];
};

export default function AdminVerificationPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [viewer, setViewer] = useState<{
    fileUrl: string;
    fileName: string;
    piiMasked: string;
  } | null>(null);

  const load = (access: string) =>
    apiWithAuth<Row[]>('/admin/verification/queue', access).then(setRows);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'ADMIN') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const approve = async (tutorId: string) => {
    try {
      await apiWithAuth(`/admin/verification/${tutorId}/approve`, token, {
        method: 'POST',
        body: '{}',
      });
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    try {
      await apiWithAuth(`/admin/verification/${rejectId}/reject`, token, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setRejectId(null);
      setReason('');
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const viewDoc = async (id: string) => {
    try {
      const doc = await apiWithAuth<{
        fileUrl: string;
        fileName: string;
        piiMasked: string;
      }>(`/admin/verification/documents/${id}`, token);
      setViewer(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 flex justify-between">
          <h1 className="text-2xl font-bold">{t('verificationQueue')}</h1>
          <Link href={`/${locale}/dashboard/admin`} className="text-blue-600">
            {tc('back')}
          </Link>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!rows.length && <p className="text-gray-600">{t('verificationEmpty')}</p>}
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.tutorId} className="rounded-lg bg-white p-4 shadow">
              <p className="font-medium">
                {r.name} · {r.email}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {r.documents.map((d) => (
                  <li key={d.id}>
                    {d.type} · {d.fileName} · {d.piiMasked}
                    <button
                      type="button"
                      className="ml-2 text-blue-600 underline"
                      onClick={() => viewDoc(d.id)}
                    >
                      {t('viewDoc')}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white"
                  onClick={() => approve(r.tutorId)}
                >
                  {t('approve')}
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1.5 text-sm"
                  onClick={() => {
                    setRejectId(r.tutorId);
                    setReason('');
                  }}
                >
                  {t('reject')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {viewer && (
          <div className="mt-6 rounded border bg-white p-4">
            <p className="font-medium">{viewer.fileName}</p>
            <p className="text-sm text-gray-600">
              {t('maskedId')}: {viewer.piiMasked}
            </p>
            <a
              href={viewer.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-blue-600 underline"
            >
              {t('openFile')}
            </a>
            <button
              type="button"
              className="ml-4 text-sm"
              onClick={() => setViewer(null)}
            >
              {tc('cancel')}
            </button>
          </div>
        )}

        {rejectId && (
          <div className="mt-6 space-y-2 rounded border bg-white p-4">
            <textarea
              className="w-full rounded border px-3 py-2"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('rejectReason')}
            />
            <button
              type="button"
              className="rounded bg-red-600 px-4 py-2 text-white"
              onClick={reject}
            >
              {t('confirmReject')}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
