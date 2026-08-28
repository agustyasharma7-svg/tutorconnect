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
import { apiWithAuth, uploadForm } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Doc = {
  id: string;
  type: string;
  fileName: string;
  verificationStatus: string;
  piiMasked?: string;
};

type Ver = {
  verificationStatus: string;
  isVerified: boolean;
  verificationRejectReason?: string | null;
  documents: Doc[];
};

const TYPES = ['AADHAAR', 'PAN', 'DEGREE'] as const;

export default function VerificationPage() {
  const t = useTranslations('verification');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [data, setData] = useState<Ver | null>(null);
  const [type, setType] = useState<(typeof TYPES)[number]>('AADHAAR');
  const [docNumber, setDocNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = (access: string) =>
    apiWithAuth<Ver>('/tutors/me/verification', access).then(setData);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      if (docNumber.trim()) fd.append('documentNumber', docNumber.trim());
      const json = await uploadForm<Ver>('/tutors/me/documents', fd);
      setData(json);
      setFile(null);
      setDocNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-cream">
        {error ? <Alert className="m-8">{error}</Alert> : <Spinner label={tc('loading')} />}
      </div>
    );
  }

  return (
    <AppFrame>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={t('title')}
          description={`${t('status')}: ${data.verificationStatus}${
            data.isVerified ? ` · ${t('verified')}` : ''
          }`}
        />
        {!data.isVerified && (
          <Alert tone="info" className="mb-3">
            {t('requiredHint')}
          </Alert>
        )}
        {data.verificationRejectReason && (
          <Alert className="mb-3">
            {t('rejectReason')}: {data.verificationRejectReason}
          </Alert>
        )}
        {error && <Alert className="mb-3">{error}</Alert>}

        <Card>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">{t('upload')}</p>
              <Select
                id="ver-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as (typeof TYPES)[number])
                }
              >
                {TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`type_${x}`)}
                  </option>
                ))}
              </Select>
            </div>
            <FormField label={t('documentNumber')} id="ver-docnum">
              {(id) => (
                <Input
                  id={id}
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                />
              )}
            </FormField>
            <Input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              required
              aria-label={t('upload')}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button type="submit" disabled={loading}>
              {t('upload')}
            </Button>
          </form>
        </Card>

        <ul className="mt-6 space-y-2">
          {data.documents.map((d) => (
            <li key={d.id}>
              <Card className="p-3 text-sm text-ink">
                {d.type} · {d.fileName} · {d.verificationStatus}
                {d.piiMasked ? ` · ${d.piiMasked}` : ''}
              </Card>
            </li>
          ))}
        </ul>
        <Link
          href={`/${locale}/dashboard/tutor`}
          className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
        >
          {tc('back')}
        </Link>
      </main>
    </AppFrame>
  );
}
