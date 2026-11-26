import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nhật Kí (Diary) — Scrapbook Lofi & Mèo',
  description:
    'Nhật ký ảnh Polaroid, ghi chú, tâm thư, nhắc nhở, tài chính và nhạc lofi YouTube/Spotify đồng bộ iPhone, MacBook & PC.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nhật Kí',
  },
  icons: {
    icon: '/icons/caty-icon.svg',
    apple: '/icons/caty-icon.svg',
  },
  other: {
    'darkreader-lock': 'true',
    'color-scheme': 'only light',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#c99b68',
  colorScheme: 'only light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" style={{ colorScheme: 'only light' }}>
      <body className="antialiased selection:bg-[#3a75a8]/25">{children}</body>
    </html>
  );
}
