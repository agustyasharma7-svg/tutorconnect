import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';

export const metadata: Metadata = {
  title: 'Agreement overview',
  description: 'Tutor–student agreement overview on TutorConnect India',
};

export default function AgreementTemplatePage() {
  return (
    <LegalDocumentPage
      titleKey="agreementTitle"
      introKey="agreementIntro"
      sectionsKey="agreementSections"
      updatedKey="agreementUpdated"
    />
  );
}
