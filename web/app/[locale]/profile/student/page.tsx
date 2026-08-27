'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Profile = {
  name: string;
  email: string;
  mobile: string;
  preferredLanguage?: string | null;
  locale: string;
};

export default function StudentProfilePage() {
  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    const token = getAccessToken();
    if (!user || !token || user.role !== 'STUDENT') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    apiWithAuth<Profile>('/students/me', token)
      .then(setProfile)
      .catch(() => router.replace(`/${locale}/auth/login`));
  }, [locale, router]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !profile) return;
    setLoading(true);
    setError('');
    try {
      const updated = await apiWithAuth<Profile>('/students/me', token, {
        method: 'PATCH',
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          preferredLanguage: profile.preferredLanguage,
          locale: profile.locale,
        }),
      });
      setProfile(updated);
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const setPwd = async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      await apiWithAuth('/auth/password/set', token, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setMessage('Password set');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <p className="p-8">{tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link href={`/${locale}/dashboard/student`} className="text-sm text-blue-600">
            {tc('back')}
          </Link>
        </div>
        <form onSubmit={save} className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div>
            <label className="mb-1 block text-sm">{tc('name')}</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">{tc('email')}</label>
            <input
              type="email"
              className="w-full rounded border px-3 py-2"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">{tc('mobile')}</label>
            <input className="w-full rounded border px-3 py-2 bg-gray-50" value={profile.mobile} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm">{t('preferredLanguage')}</label>
            <select
              className="w-full rounded border px-3 py-2"
              value={profile.preferredLanguage ?? 'en'}
              onChange={(e) =>
                setProfile({ ...profile, preferredLanguage: e.target.value, locale: e.target.value })
              }
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white">
            {tc('save')}
          </button>
        </form>

        <div className="mt-6 space-y-3 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold">{tc('password')}</h2>
          <input
            type="password"
            minLength={8}
            className="w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password@123"
          />
          <button
            type="button"
            onClick={setPwd}
            className="rounded border border-blue-600 px-4 py-2 text-blue-600"
          >
            Set password
          </button>
        </div>
      </main>
    </>
  );
}
