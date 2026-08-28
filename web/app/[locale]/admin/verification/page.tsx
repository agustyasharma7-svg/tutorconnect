'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  FormField,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Row = {
  tutorId: string;
  name: string;
  email: string;
  documents: {
    id: string;
    type: string;
    fileName: string;
    piiMasked?: string;
    fileUrl?: string;
  }[];
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
    <AppFrame>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader
          title={t('verificationQueue')}
          actions={
            <ButtonLink
              href={`/${locale}/dashboard/admin`}
              variant="link"
              size="sm"
            >
              {tc('back')}
            </ButtonLink>
          }
        />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length ? (
          <EmptyState title={t('verificationEmpty')} />
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.tutorId}>
                <Card>
                  <p className="font-medium text-ink">
                    {r.name} · {r.email}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {r.documents.map((d) => (
                      <li key={d.id}>
                        {d.type} · {d.fileName} · {d.piiMasked}
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="ml-2"
                          onClick={() => viewDoc(d.id)}
                        >
                          {t('viewDoc')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => approve(r.tutorId)}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRejectId(r.tutorId);
                        setReason('');
                      }}
                    >
                      {t('reject')}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {viewer && (
          <Card className="mt-6">
            <p className="font-medium text-ink">{viewer.fileName}</p>
            <p className="text-sm text-ink-muted">
              {t('maskedId')}: {viewer.piiMasked}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                href={viewer.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand hover:underline"
              >
                {t('openFile')}
              </a>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setViewer(null)}
              >
                {tc('cancel')}
              </Button>
            </div>
          </Card>
        )}

        {rejectId && (
          <Card className="mt-6 space-y-3">
            <FormField label={t('rejectReason')} id="admin-reject-reason">
              {(id) => (
                <Textarea
                  id={id}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              )}
            </FormField>
            <Button type="button" variant="danger" onClick={reject}>
              {t('confirmReject')}
            </Button>
          </Card>
        )}
      </main>
    </AppFrame>
  );
}
