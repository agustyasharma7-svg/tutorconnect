'use client';

import { SiteHeader } from '@/components/SiteHeader';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
} from '@/components/ui';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

const inviteOnly =
  process.env.NEXT_PUBLIC_SOFT_LAUNCH_INVITE_ONLY === 'true';

export default function RegisterStudentPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/auth/register/student', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          mobile: form.mobile,
          email: form.email,
          locale,
          ...(form.inviteCode.trim()
            ? { inviteCode: form.inviteCode.trim() }
            : {}),
        }),
      });
      router.push(
        `/${locale}/auth/verify-otp?email=${encodeURIComponent(form.email)}`,
      );
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
        <PageHeader title={t('registerStudentTitle')} />
        {inviteOnly && (
          <Alert tone="warning" className="mb-4">
            {t('inviteOnlyHint')}
          </Alert>
        )}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label={tc('name')} id="reg-name">
              {(id) => (
                <Input
                  id={id}
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={tc('mobile')} id="reg-mobile">
              {(id) => (
                <Input
                  id={id}
                  required
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={tc('email')} id="reg-email">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
            </FormField>
            <FormField
              label={`${t('inviteCode')}${inviteOnly ? ' *' : ''}`}
              id="reg-invite"
            >
              {(id) => (
                <Input
                  id={id}
                  required={inviteOnly}
                  value={form.inviteCode}
                  onChange={(e) =>
                    setForm({ ...form, inviteCode: e.target.value })
                  }
                  autoComplete="off"
                />
              )}
            </FormField>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={loading} fullWidth>
              {loading ? tc('loading') : tc('submit')}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-muted">
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/auth/login`} className="text-brand hover:underline">
            {t('login')}
          </Link>
        </p>
      </main>
    </>
  );
}
