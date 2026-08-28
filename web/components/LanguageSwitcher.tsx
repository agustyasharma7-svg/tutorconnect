'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const locales = ['en', 'hi'] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (next: string) => {
    const segments = pathname.split('/');
    if (locales.includes(segments[1] as (typeof locales)[number])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
  };

  return (
    <div
      className="inline-flex shrink-0 rounded-full bg-white/80 p-0.5 ring-1 ring-[#e6ddd0]"
      role="group"
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLocale(l)}
          className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide sm:px-2.5 sm:text-xs ${
            locale === l
              ? 'bg-ink text-white'
              : 'text-ink-muted'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
