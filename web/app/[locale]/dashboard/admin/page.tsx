'use client';

import { Button, ButtonLink, Card, PageHeader, PageSkeleton } from '@/components/ui';
import { apiWithAuth, downloadBlob } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Metrics = {
  users: { students: number; tutors: number; mau30d: number };
  revenue: {
    registrationGross: number;
    commissionGross: number;
    totalGross: number;
  };
  ops: {
    pendingVerifications: number;
    openDisputes: number;
    overdueCommissions: number;
  };
};

type Audit = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
};

export default function AdminDashboard() {
  const t = useTranslations('dashboard');
  const ta = useTranslations('admin');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [ready, setReady] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    const stored = getStoredUser();
    const access = getAccessToken();
    if (!stored || !access || stored.role !== 'ADMIN') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setReady(true);
    Promise.all([
      apiWithAuth<Metrics['users']>('/admin/metrics/users', access),
      apiWithAuth<Metrics['revenue']>('/admin/metrics/revenue', access),
      apiWithAuth<Metrics['ops']>('/admin/metrics/operations', access),
      apiWithAuth<{ items: Audit[] }>('/admin/audit-logs?limit=20', access),
    ]).then(([users, revenue, ops, audit]) => {
      setMetrics({ users, revenue, ops });
      setAudits(audit.items);
    });
  }, [locale, router]);

  if (!ready) {
    return (
      <PageSkeleton />
    );
  }

  const revMax = metrics
    ? Math.max(
        metrics.revenue.registrationGross,
        metrics.revenue.commissionGross,
        1,
      )
    : 1;

  const downloadCsv = (path: string, filename: string) => {
    downloadBlob(path, filename).catch(() => {
      /* ignore */
    });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader title={t('admin')} />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/${locale}/admin/verification`} size="sm">
            {ta('verificationQueue')}
          </ButtonLink>
          <ButtonLink
            href={`/${locale}/admin/commissions`}
            variant="secondary"
            size="sm"
          >
            {t('commissions')}
          </ButtonLink>
          <ButtonLink
            href={`/${locale}/disputes`}
            variant="secondary"
            size="sm"
          >
            {ta('disputes')}
          </ButtonLink>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv('/admin/export/users.csv', 'users.csv')}
          >
            {ta('exportUsers')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadCsv('/admin/export/revenue.csv', 'revenue.csv')
            }
          >
            {ta('exportRevenue')}
          </Button>
        </div>

        {metrics && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm text-ink-muted">{ta('users')}</p>
                <p className="text-2xl font-semibold text-ink">
                  {metrics.users.students + metrics.users.tutors}
                </p>
                <p className="text-xs text-ink-muted">
                  S {metrics.users.students} · T {metrics.users.tutors} · MAU{' '}
                  {metrics.users.mau30d}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-ink-muted">{ta('revenue')}</p>
                <p className="text-2xl font-semibold text-ink">
                  ₹{metrics.revenue.totalGross}
                </p>
                <p className="text-xs text-ink-muted">
                  Reg ₹{metrics.revenue.registrationGross} · Com ₹
                  {metrics.revenue.commissionGross}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-ink-muted">{ta('operations')}</p>
                <p className="text-2xl font-semibold text-ink">
                  {metrics.ops.pendingVerifications}
                </p>
                <p className="text-xs text-ink-muted">
                  Pending verify · Disputes {metrics.ops.openDisputes} · Overdue{' '}
                  {metrics.ops.overdueCommissions}
                </p>
              </Card>
            </div>

            <Card className="mt-6 p-4">
              <p className="mb-3 text-sm font-medium text-ink">
                {ta('revenueSplit')}
              </p>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-ink-muted">
                    <span>Registration</span>
                    <span>₹{metrics.revenue.registrationGross}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-cream-dark">
                    <div
                      className="h-full rounded-full bg-sky-600"
                      style={{
                        width: `${(metrics.revenue.registrationGross / revMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-ink-muted">
                    <span>Commission</span>
                    <span>₹{metrics.revenue.commissionGross}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-cream-dark">
                    <div
                      className="h-full rounded-full bg-amber-600"
                      style={{
                        width: `${(metrics.revenue.commissionGross / revMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        <h2 className="mb-3 mt-10 text-lg font-semibold text-ink">
          {ta('auditLogs')}
        </h2>
        <ul className="space-y-2 text-sm">
          {audits.map((a) => (
            <li key={a.id}>
              <Card className="px-3 py-2">
                {a.action} · {a.entityType} {a.entityId?.slice(0, 8)} ·{' '}
                {new Date(a.createdAt).toLocaleString()}
              </Card>
            </li>
          ))}
        </ul>
      </main>
  );
}
