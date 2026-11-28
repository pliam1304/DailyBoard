import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://dailyboard-ten.vercel.app');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Nhật Kí (Diary) — Scrapbook Lofi & Mèo',
  description:
    'Nhật ký ảnh Polaroid, lọ viên nang 3D, ghi chú, tâm thư, nhắc nhở, tài chính và phòng nhạc lofi đồng bộ iPhone, MacBook & PC.',
  openGraph: {
    title: 'Nhật Kí (Diary) — Scrapbook Lofi & Mèo',
    description:
      'Góc nhật ký ảnh Polaroid, lọ viên nang 3D & phòng nhạc Lofi đồng bộ trên mọi thiết bị.',
    url: '/',
    siteName: 'Nhật Kí (Diary)',
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Nhật Kí (Diary) — Bảng ghim Polaroid, Lọ Viên Nang & Nhạc Lofi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nhật Kí (Diary) — Scrapbook Lofi & Mèo',
    description:
      'Góc nhật ký ảnh Polaroid, lọ viên nang 3D & phòng nhạc Lofi đồng bộ trên mọi thiết bị.',
    images: ['/api/og'],
  },
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
