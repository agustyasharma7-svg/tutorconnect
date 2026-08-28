'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f7f3ec',
          color: '#0c1f33',
        }}
      >
        <main style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#3d5166', margin: '0 0 20px' }}>
            This page failed to load. You can try again, or go back home.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: 999,
                background: '#1E4FD7',
                color: '#fff',
                padding: '10px 18px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/en"
              style={{
                borderRadius: 999,
                border: '1px solid #c5bdae',
                padding: '10px 18px',
                fontSize: 14,
                color: '#0c1f33',
                textDecoration: 'none',
              }}
            >
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
