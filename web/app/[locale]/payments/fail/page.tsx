'use client';

import { Alert, ButtonLink, Card, PageHeader } from '@/components/ui';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PaymentFailPage() {
  const t = useTranslations('payments');
  const { locale } = useParams<{ locale: string }>();
  const params = useSearchParams();
  const reason = params.get('reason');

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
        <PageHeader title={t('failTitle')} />
        <Card>
          <Alert>{t('failBlurb')}</Alert>
          {reason && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {reason}
            </p>
          )}
          <ButtonLink href={`/${locale}/commissions`} className="mt-5">
            {t('tryAgain')}
          </ButtonLink>
        </Card>
      </main>
  );
}
