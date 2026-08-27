import { Suspense } from 'react';
import VerifyOtpClient from './VerifyOtpClient';

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <VerifyOtpClient />
    </Suspense>
  );
}
