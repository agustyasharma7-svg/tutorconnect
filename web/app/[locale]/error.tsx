'use client';

import * as Sentry from '@sentry/nextjs';
import { Button, ButtonLink } from '@/components/ui';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const home = `/${locale || 'en'}`;

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        This page failed to load. You can try again, or return home.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <ButtonLink href={home} variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
