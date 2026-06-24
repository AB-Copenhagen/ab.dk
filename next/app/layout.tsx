import { AuthProvider } from '@descope/nextjs-sdk';
import localFont from 'next/font/local';
import type { Viewport } from 'next';
import { Suspense } from 'react';

import { i18n } from '@/i18n.config';
import { SlugProvider } from '@/app/context/SlugContext';
import { Preview } from '@/components/preview';
import './globals.css';

// ABC Camera Plain — licensed from ABC Dinamo (abcdinamo.com).
// Helvetica Neue is the only permitted fallback per AB 1889 Brand Guidelines 2026.
const abcCameraPlain = localFont({
  src: [
    { path: '../public/fonts/ABCCameraPlain-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/ABCCameraPlain-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../public/fonts/ABCCameraPlain-Heavy.woff2',   weight: '800', style: 'normal' },
  ],
  variable: '--font-abc',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#006A52' },
    { media: '(prefers-color-scheme: dark)', color: '#006A52' },
  ],
};

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-rich-black">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ab-green border-t-transparent" />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className={abcCameraPlain.variable} suppressHydrationWarning>
      <body className={abcCameraPlain.className} suppressHydrationWarning>
        <AuthProvider
          projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}
          baseUrl={process.env.DESCOPE_BASE_URL}
        >
          <Preview />
          <SlugProvider>
            <Suspense fallback={<RootLoading />}>{children}</Suspense>
          </SlugProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
