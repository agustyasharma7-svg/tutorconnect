'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

export default function RegisterStudentPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', mobile: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/auth/register/student', {
        method: 'POST',
        body: JSON.stringify({ ...form, locale }),
      });
      router.push(`/${locale}/auth/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">{t('registerStudentTitle')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
          {(['name', 'mobile', 'email'] as const).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium">{tc(field)}</label>
              <input
                type={field === 'email' ? 'email' : 'text'}
                required
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? tc('loading') : tc('submit')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/auth/login`} className="text-blue-600">
            {t('login')}
          </Link>
        </p>
      </main>
    </>
  );
}
