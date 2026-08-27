'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
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
  const tc = useTranslations('common');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    const stored = getStoredUser();
    const access = getAccessToken();
    if (!stored || !access || stored.role !== 'ADMIN') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
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

  if (!ready) return <p className="p-8">{tc('loading')}</p>;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  const revMax = metrics
    ? Math.max(metrics.revenue.registrationGross, metrics.revenue.commissionGross, 1)
    : 1;

  const downloadCsv = (path: string, filename: string) => {
    fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      });
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-bold">{t('admin')}</h1>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/admin/verification`}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            {ta('verificationQueue')}
          </Link>
          <Link href={`/${locale}/admin/commissions`} className="rounded border px-4 py-2">
            {t('commissions')}
          </Link>
          <Link href={`/${locale}/disputes`} className="rounded border px-4 py-2">
            {ta('disputes')}
          </Link>
          <button
            type="button"
            className="rounded border px-4 py-2"
            onClick={() => downloadCsv('/admin/export/users.csv', 'users.csv')}
          >
            {ta('exportUsers')}
          </button>
          <button
            type="button"
            className="rounded border px-4 py-2"
            onClick={() => downloadCsv('/admin/export/revenue.csv', 'revenue.csv')}
          >
            {ta('exportRevenue')}
          </button>
        </div>

        {metrics && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">{ta('users')}</p>
                <p className="text-2xl font-semibold">
                  {metrics.users.students + metrics.users.tutors}
                </p>
                <p className="text-xs text-gray-500">
                  S {metrics.users.students} · T {metrics.users.tutors} · MAU{' '}
                  {metrics.users.mau30d}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">{ta('revenue')}</p>
                <p className="text-2xl font-semibold">₹{metrics.revenue.totalGross}</p>
                <p className="text-xs text-gray-500">
                  Reg ₹{metrics.revenue.registrationGross} · Com ₹
                  {metrics.revenue.commissionGross}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-500">{ta('operations')}</p>
                <p className="text-2xl font-semibold">
                  {metrics.ops.pendingVerifications}
                </p>
                <p className="text-xs text-gray-500">
                  Pending verify · Disputes {metrics.ops.openDisputes} · Overdue{' '}
                  {metrics.ops.overdueCommissions}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-white p-4 shadow">
              <p className="mb-3 text-sm font-medium text-gray-700">{ta('revenueSplit')}</p>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-600">
                    <span>Registration</span>
                    <span>₹{metrics.revenue.registrationGross}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-gray-100">
                    <div
                      className="h-full bg-sky-600"
                      style={{
                        width: `${(metrics.revenue.registrationGross / revMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-600">
                    <span>Commission</span>
                    <span>₹{metrics.revenue.commissionGross}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-gray-100">
                    <div
                      className="h-full bg-amber-600"
                      style={{
                        width: `${(metrics.revenue.commissionGross / revMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <h2 className="mt-10 mb-3 text-lg font-semibold">{ta('auditLogs')}</h2>
        <ul className="space-y-2 text-sm">
          {audits.map((a) => (
            <li key={a.id} className="rounded border bg-white px-3 py-2">
              {a.action} · {a.entityType} {a.entityId?.slice(0, 8)} ·{' '}
              {new Date(a.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
