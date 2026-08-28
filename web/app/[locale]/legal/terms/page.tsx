import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TutorConnect India Terms of Service',
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      titleKey="termsTitle"
      introKey="termsIntro"
      sectionsKey="termsSections"
      updatedKey="termsUpdated"
    />
  );
}
