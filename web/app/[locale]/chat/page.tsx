'use client';

import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
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
    <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title={t('title')} description={t('unlockHint')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length ? (
          <EmptyState title={t('empty')} />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.agreementId}>
                <Link href={`/${locale}/chat/${r.agreementId}`} className="block">
                  <Card className="p-4 transition hover:border-brand/40">
                    <p className="font-medium text-ink">
                      {r.studentName} ↔ {r.tutorName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {r.subject ?? ''} · {r.agreementStatus}
                      {r.canSend ? ` · ${t('canSend')}` : ` · ${t('readOnly')}`}
                    </p>
                    {r.lastMessage && (
                      <p className="mt-1 truncate text-sm text-ink-muted">
                        {r.lastMessage.body}
                      </p>
                    )}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {role && (
          <Link
            href={`/${locale}/dashboard/${role.toLowerCase()}`}
            className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
          >
            {tc('back')}
          </Link>
        )}
      </main>
  );
}
