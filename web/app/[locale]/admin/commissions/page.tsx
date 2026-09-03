'use client';

import { Alert, Button, ButtonLink, Card, EmptyState, FormField, PageHeader, Textarea } from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Commission = {
  id: string;
  status: string;
  grossAmount: number;
  taxableAmount: number;
  gstAmount: number;
  tutorName?: string;
  studentName?: string;
  waivedReason?: string | null;
  dueAt?: string | null;
  createdAt: string;
};

export default function AdminCommissionsPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<Commission[]>([]);
  const [error, setError] = useState('');
  const [waiveId, setWaiveId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = (access: string) =>
    apiWithAuth<Commission[]>('/admin/commissions', access).then(setRows);

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

  const submitWaive = async (e: FormEvent) => {
    e.preventDefault();
    if (!waiveId) return;
    try {
      await apiWithAuth(`/admin/commissions/${waiveId}/waive`, token, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setWaiveId(null);
      setReason('');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          title={t('commissionsTitle')}
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
          <EmptyState title={t('commissionsEmpty')} />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <p className="font-medium text-ink">
                    {r.tutorName ?? 'Tutor'} → {r.studentName ?? 'Student'} — ₹
                    {r.grossAmount}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {tc('status')}: {r.status} · GST ₹{r.gstAmount}
                    {r.dueAt
                      ? ` · due ${new Date(r.dueAt).toLocaleDateString()}`
                      : ''}
                  </p>
                  {r.waivedReason && (
                    <p className="mt-1 text-sm text-ink-muted">
                      {t('waived')}: {r.waivedReason}
                    </p>
                  )}
                  {(r.status === 'GENERATED' || r.status === 'OVERDUE') && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-2 text-amber-800"
                      onClick={() => {
                        setWaiveId(r.id);
                        setReason('');
                      }}
                    >
                      {t('waive')}
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}

        {waiveId && (
          <Card className="mt-6">
            <form onSubmit={submitWaive} className="space-y-3">
              <p className="font-medium text-ink">{t('waiveTitle')}</p>
              <FormField label={t('waiveReason')} id="admin-waive-reason">
                {(id) => (
                  <Textarea
                    id={id}
                    required
                    minLength={5}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                )}
              </FormField>
              <div className="flex gap-2">
                <Button type="submit">{t('confirmWaive')}</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setWaiveId(null)}
                >
                  {tc('cancel')}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </main>
  );
}
