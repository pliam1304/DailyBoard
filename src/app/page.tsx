import type { Metadata } from 'next';
import { CatyBoardApp } from '@/components/CatyBoardApp';

interface HomePageProps {
  searchParams?: Promise<{ invite?: string }>;
}

export async function generateMetadata({
  searchParams,
}: HomePageProps): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : undefined;
  const rawInvite =
    typeof resolved?.invite === 'string' ? resolved.invite.trim() : '';
  const cleanInvite = rawInvite.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);

  if (!cleanInvite) {
    return {};
  }

  const ogUrl = `/api/og?invite=${encodeURIComponent(cleanInvite)}`;
  return {
    title: `Lời mời tham gia bảng chung (${cleanInvite}) — Nhật Kí`,
    description:
      'Mở link để cùng chia sẻ ảnh Polaroid, lọ viên nang, ghi chú & nghe nhạc Lofi trên cùng một bảng.',
    openGraph: {
      title: `Lời mời tham gia bảng chung (${cleanInvite})`,
      description:
        'Cùng lưu giữ ảnh Polaroid, lọ viên nang, ghi chú & nghe nhạc Lofi mỗi ngày.',
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `Lời mời tham gia bảng chung Nhật Kí (${cleanInvite})`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Lời mời tham gia bảng chung (${cleanInvite})`,
      description:
        'Cùng lưu giữ ảnh Polaroid, lọ viên nang, ghi chú & nghe nhạc Lofi mỗi ngày.',
      images: [ogUrl],
    },
  };
}

export default function HomePage() {
  return <CatyBoardApp />;
}
