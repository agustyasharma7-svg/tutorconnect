import { SiteHeader } from '@/components/SiteHeader';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('home');
  const { locale } = params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">{t('hero')}</h1>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href={`/${locale}/auth/register/student`}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            {t('ctaStudent')}
          </Link>
          <Link
            href={`/${locale}/auth/register/tutor`}
            className="rounded-lg border border-blue-600 px-6 py-3 font-medium text-blue-600 hover:bg-blue-50"
          >
            {t('ctaTutor')}
          </Link>
        </div>
        <p className="mt-6">
          <Link href={`/${locale}/auth/login`} className="text-blue-600 underline">
            Login
          </Link>
        </p>
      </main>
    </>
  );
}
