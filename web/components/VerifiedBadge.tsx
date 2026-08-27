'use client';

import { useTranslations } from 'next-intl';

export function VerifiedBadge({
  isVerified,
  ratingAvg,
  ratingCount,
  compact,
}: {
  isVerified?: boolean;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  compact?: boolean;
}) {
  const t = useTranslations('verification');
  const tr = useTranslations('ratings');

  if (!isVerified && !(ratingAvg != null && (ratingCount ?? 0) > 0)) {
    return null;
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}
    >
      {isVerified && (
        <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
          {t('badge')}
        </span>
      )}
      {ratingAvg != null && (ratingCount ?? 0) > 0 && (
        <span className="text-gray-600">
          {tr('avg', { avg: ratingAvg.toFixed(1), count: ratingCount ?? 0 })}
        </span>
      )}
    </span>
  );
}
