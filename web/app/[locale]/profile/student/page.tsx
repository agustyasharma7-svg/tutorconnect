'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui';
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
  const ta = useTranslations('auth');
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
      setMessage(tc('save'));
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
    setError('');
    try {
      await apiWithAuth('/auth/password/set', token, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setMessage(ta('setPassword'));
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  return (
    <AppFrame>
      <main className="mx-auto max-w-xl px-4 py-10">
        <PageHeader
          title={t('title')}
          actions={
            <Link
              href={`/${locale}/dashboard/student`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {tc('back')}
            </Link>
          }
        />
        <Card>
          <form onSubmit={save} className="space-y-4">
            <FormField label={tc('name')} id="stu-name">
              {(id) => (
                <Input
                  id={id}
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
              )}
            </FormField>
            <FormField label={tc('email')} id="stu-email">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                />
              )}
            </FormField>
            <FormField label={tc('mobile')} id="stu-mobile">
              {(id) => <Input id={id} value={profile.mobile} disabled />}
            </FormField>
            <FormField label={t('preferredLanguage')} id="stu-lang">
              {(id) => (
                <Select
                  id={id}
                  value={profile.preferredLanguage ?? 'en'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferredLanguage: e.target.value,
                      locale: e.target.value,
                    })
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                </Select>
              )}
            </FormField>
            {error && <Alert>{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}
            <Button type="submit" disabled={loading}>
              {tc('save')}
            </Button>
          </form>
        </Card>

        <Card className="mt-4">
          <h2 className="text-sm font-semibold text-ink">{ta('setPassword')}</h2>
          <div className="mt-3 space-y-3">
            <FormField label={tc('password')} id="stu-password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              )}
            </FormField>
            <Button type="button" variant="secondary" onClick={setPwd} disabled={loading}>
              {ta('setPassword')}
            </Button>
          </div>
        </Card>
      </main>
    </AppFrame>
  );
}
