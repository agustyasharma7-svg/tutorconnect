import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'TutorConnect India Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      titleKey="privacyTitle"
      introKey="privacyIntro"
      sectionsKey="privacySections"
      updatedKey="privacyUpdated"
    />
  );
}
