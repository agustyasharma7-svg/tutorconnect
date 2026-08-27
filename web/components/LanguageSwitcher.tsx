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
    <div className="flex gap-2 text-sm">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLocale(l)}
          className={`rounded px-2 py-1 uppercase ${
            locale === l ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
