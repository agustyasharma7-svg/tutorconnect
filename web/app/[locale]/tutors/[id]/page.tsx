import type { Metadata } from 'next';
import TutorPublicClient from './TutorPublicClient';

export async function generateMetadata({
  params,
}: {
  params: { locale: string; id: string };
}): Promise<Metadata> {
  const title = 'TutorConnect — Tutor profile';
  const description = 'View verified tutor profile on TutorConnect India';
  return {
    title,
    description,
    alternates: {
      languages: {
        en: `/en/tutors/${params.id}`,
        hi: `/hi/tutors/${params.id}`,
      },
    },
    openGraph: {
      title,
      description,
      locale: params.locale === 'hi' ? 'hi_IN' : 'en_IN',
      type: 'profile',
    },
  };
}

export default function PublicTutorPage() {
  return <TutorPublicClient />;
}
