'use client';

import React from 'react';
import {
  getMemberHeart,
  getMemberNickname,
  HEART_BADGE_META,
  isSharedDuo,
} from '@/lib/sharing';
import type {
  BoardSharingState,
  CatMood,
  MemberRole,
  PolaroidFrameColor,
  WashiStyle,
  WeatherType,
} from '@/types/catyboard';

export const POLAROID_FRAME_OPTIONS: {
  id: PolaroidFrameColor;
  label: string;
  swatchHex: string;
  className: string;
}[] = [
  {
    id: 'classic-white',
    label: 'Trắng cổ điển',
    swatchHex: '#fdf9f0',
    className: '',
  },
  {
    id: 'film-black',
    label: 'Đen Film',
    swatchHex: '#23201e',
    className: 'polaroid-frame-film-black',
  },
  {
    id: 'blush-pink',
    label: 'Hồng phấn',
    swatchHex: '#fcecef',
    className: 'polaroid-frame-blush-pink',
  },
  {
    id: 'matcha-mint',
    label: 'Matcha',
    swatchHex: '#e9f4ec',
    className: 'polaroid-frame-matcha-mint',
  },
  {
    id: 'kraft-vintage',
    label: 'Giấy Kraft',
    swatchHex: '#ead7ba',
    className: 'polaroid-frame-kraft-vintage',
  },
];

export function getPolaroidFrameClass(frameColor?: PolaroidFrameColor): string {
  return (
    POLAROID_FRAME_OPTIONS.find((f) => f.id === frameColor)?.className ?? ''
  );
}

export const WASHI_OPTIONS: { id: WashiStyle; label: string; className: string }[] = [
  { id: 'mint-gingham', label: 'Caro Mint', className: 'washi-mint-gingham' },
  { id: 'sky-gingham', label: 'Caro Xanh Trời', className: 'washi-sky-gingham' },
  { id: 'cream-dots', label: 'Kem Chấm Bi', className: 'washi-cream-dots' },
  { id: 'lavender-plaid', label: 'Caro Tím Nhạt', className: 'washi-lavender-plaid' },
  { id: 'daisy-tape', label: 'Hồng Hoa Cúc', className: 'washi-daisy-tape' },
];

export function WashiTape({
  style = 'mint-gingham',
  className = '',
}: {
  style?: WashiStyle;
  className?: string;
}) {
  const found = WASHI_OPTIONS.find((w) => w.id === style) ?? WASHI_OPTIONS[0];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none h-5 w-20 shadow-sm opacity-90 ${found.className} ${className}`}
      style={{
        clipPath:
          'polygon(2% 0%, 98% 2%, 100% 18%, 97% 38%, 100% 60%, 98% 84%, 100% 100%, 2% 98%, 0% 80%, 3% 56%, 0% 34%, 2% 14%)',
      }}
    />
  );
}

export function PuffyHeartSticker({
  color = 'sky',
  size = 24,
  className = '',
}: {
  color?: 'sky' | 'sage' | 'cream' | 'blush';
  size?: number;
  className?: string;
}) {
  const fills = {
    sky: { main: '#82b6e8', highlight: '#cde5fb', stroke: '#5287bc' },
    sage: { main: '#9ecaa8', highlight: '#d8efdc', stroke: '#62966e' },
    cream: { main: '#f6e7c4', highlight: '#fffaf0', stroke: '#b89460' },
    blush: { main: '#efabb2', highlight: '#fde0e3', stroke: '#c1737c' },
  }[color];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`drop-shadow-sm select-none ${className}`}
      aria-hidden="true"
    >
      <path
        d="M16 27.5 C16 27.5 4 19.6 4 11.4 C4 7.5 7 4.5 10.6 4.5 C13 4.5 15 5.8 16 7.7 C17 5.8 19 4.5 21.4 4.5 C25 4.5 28 7.5 28 11.4 C28 19.6 16 27.5 16 27.5 Z"
        fill={fills.main}
        stroke={fills.stroke}
        strokeWidth="1.5"
      />
      <ellipse
        cx="10.8"
        cy="10.2"
        rx="2.6"
        ry="1.5"
        transform="rotate(-25 10.8 10.2)"
        fill={fills.highlight}
        opacity="0.85"
      />
    </svg>
  );
}

export function PressedFlower({ className = '' }: { className?: string }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 48 48"
      className={`pointer-events-none drop-shadow-sm ${className}`}
      aria-hidden="true"
    >
      <g fill="#fffdf7" stroke="#dfd3bf" strokeWidth="0.8">
        <ellipse cx="24" cy="11" rx="4.2" ry="7.5" />
        <ellipse cx="24" cy="37" rx="4.2" ry="7.5" />
        <ellipse cx="11" cy="24" rx="7.5" ry="4.2" />
        <ellipse cx="37" cy="24" rx="7.5" ry="4.2" />
        <ellipse cx="14.8" cy="14.8" rx="4.2" ry="7.5" transform="rotate(-45 14.8 14.8)" />
        <ellipse cx="33.2" cy="33.2" rx="4.2" ry="7.5" transform="rotate(-45 33.2 33.2)" />
        <ellipse cx="33.2" cy="14.8" rx="4.2" ry="7.5" transform="rotate(45 33.2 14.8)" />
        <ellipse cx="14.8" cy="33.2" rx="4.2" ry="7.5" transform="rotate(45 14.8 33.2)" />
      </g>
      <circle cx="24" cy="24" r="5.5" fill="#f3ca65" />
      <circle cx="22.5" cy="22.5" r="1.4" fill="#fff6d1" />
    </svg>
  );
}

export function PuffyWord({ text }: { text: string }) {
  const palette = [
    'bg-[#4d8cc2] text-white border-[#366a97]',
    'bg-[#529468] text-white border-[#3a704c]',
    'bg-[#c88d3a] text-white border-[#9c6b26]',
    'bg-[#c86d7d] text-white border-[#9d4f5d]',
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 select-none">
      {text.split('').map((ch, idx) =>
        ch === ' ' ? (
          <span key={`space-${idx}`} className="w-2" />
        ) : (
          <span
            key={`${ch}-${idx}`}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border-b-2 text-base font-extrabold shadow-sm transition-transform hover:-translate-y-0.5 ${palette[idx % palette.length]}`}
            style={{
              transform: `rotate(${idx % 2 === 0 ? -4 : 4}deg)`,
            }}
          >
            {ch}
          </span>
        )
      )}
    </div>
  );
}

export const MOOD_META: Record<
  CatMood,
  { label: string; emoji: string; badgeBg: string }
> = {
  happy: { label: 'Vui vẻ', emoji: '😺', badgeBg: 'bg-[#b57a29] text-white' },
  chill: { label: 'Thư giãn', emoji: '😸', badgeBg: 'bg-[#3d7c57] text-white' },
  sleepy: { label: 'Buồn ngủ', emoji: '😪', badgeBg: 'bg-[#68579e] text-white' },
  rainy: { label: 'Suy tư', emoji: '🌧️', badgeBg: 'bg-[#3a75a8] text-white' },
  proud: { label: 'Tự hào', emoji: '✨', badgeBg: 'bg-[#b36432] text-white' },
  love: { label: 'Ấm áp', emoji: '🥰', badgeBg: 'bg-[#b95567] text-white' },
};

export const WEATHER_META: Record<
  WeatherType,
  { label: string; emoji: string }
> = {
  sunny: { label: 'Nắng nhẹ', emoji: '☀️' },
  breeze: { label: 'Gió mát', emoji: '🍃' },
  rainy: { label: 'Mưa rơi', emoji: '🌧️' },
  starry: { label: 'Đêm sao', emoji: '🌙' },
};

export function AuthorBadge({
  sharing,
  role,
  prefix = '',
}: {
  sharing?: BoardSharingState;
  role?: MemberRole;
  prefix?: string;
}) {
  if (!sharing || !isSharedDuo(sharing)) return null;
  const effectiveRole: MemberRole = role || 'owner';
  const nick = getMemberNickname(sharing, effectiveRole);
  const color = getMemberHeart(sharing, effectiveRole);
  const meta = HEART_BADGE_META[color];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${meta.pillClass}`}
    >
      <span>{meta.emoji}</span>
      <span>
        {prefix}
        {nick}
      </span>
    </span>
  );
}
