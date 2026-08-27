'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type ThreadRow = {
  agreementId: string;
  threadId: string | null;
  agreementStatus: string;
  studentName: string;
  tutorName: string;
  subject?: string | null;
  lastMessage?: { body: string; createdAt: string } | null;
  canSend: boolean;
};

export default function ChatListPage() {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || (user.role !== 'STUDENT' && user.role !== 'TUTOR')) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setRole(user.role);
    apiWithAuth<ThreadRow[]>('/chat/threads', access)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('title')}</h1>
        <p className="mb-6 text-sm text-gray-600">{t('unlockHint')}</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!rows.length && <p className="text-gray-600">{t('empty')}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.agreementId}>
              <Link
                href={`/${locale}/chat/${r.agreementId}`}
                className="block rounded-lg bg-white p-4 shadow hover:bg-gray-50"
              >
                <p className="font-medium">
                  {r.studentName} ↔ {r.tutorName}
                </p>
                <p className="text-xs text-gray-500">
                  {r.subject ?? ''} · {r.agreementStatus}
                  {r.canSend ? ` · ${t('canSend')}` : ` · ${t('readOnly')}`}
                </p>
                {r.lastMessage && (
                  <p className="mt-1 truncate text-sm text-gray-600">
                    {r.lastMessage.body}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
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
