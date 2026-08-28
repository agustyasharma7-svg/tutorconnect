'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import { Alert, ButtonLink, Card, PageHeader } from '@/components/ui';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PaymentSuccessPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const params = useSearchParams();
  const paymentId = params.get('paymentId');

  return (
    <AppFrame>
      <main className="mx-auto max-w-lg px-4 py-10">
        <PageHeader title={t('successTitle')} />
        <Card>
          <Alert tone="success">{t('successBlurb')}</Alert>
          {paymentId && (
            <p className="mt-3 text-sm text-ink-muted">
              {t('ref')}: {paymentId}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={`/${locale}/commissions`}>
              {t('commissionsTitle')}
            </ButtonLink>
            <ButtonLink
              href={`/${locale}/dashboard/tutor`}
              variant="secondary"
            >
              {tc('navDashboard')}
            </ButtonLink>
          </div>
        </Card>
      </main>
    </AppFrame>
  );
}
