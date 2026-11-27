'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Plus, Sparkles } from 'lucide-react';
import {
  extractCapsulesFromNotes,
  parseCapsuleStyle,
  type JarVesselStyle,
} from '@/lib/capsules';
import { shiftDateKey, toLocalDateKey } from '@/lib/date';
import { loadSavedJarVessel } from '@/components/capsule/CapsuleJarModal';
import type { NoteItem, ThemeMode } from '@/types/catyboard';

interface MiniCapsuleJarCardProps {
  notes: NoteItem[];
  theme: ThemeMode;
  onOpenJar: (mode: 'jar' | 'compose') => void;
  onOpenBonfire?: () => void;
}

const MINI_SLOTS: { x: number; y: number; rot: number }[] = [
  { x: 17, y: 44, rot: -14 },
  { x: 31, y: 45, rot: 18 },
  { x: 24, y: 38, rot: 6 },
  { x: 16, y: 33, rot: 28 },
  { x: 32, y: 34, rot: -22 },
  { x: 24, y: 28, rot: -8 },
  { x: 18, y: 22, rot: 16 },
  { x: 30, y: 23, rot: -18 },
];

export function MiniCapsuleJarCard({
  notes,
  theme,
  onOpenJar,
  onOpenBonfire,
}: MiniCapsuleJarCardProps) {
  const isNight = theme === 'cozy-night';
  const todayKey = toLocalDateKey();
  const [vessel, setVessel] = useState<JarVesselStyle>('apothecary');

  useEffect(() => {
    setVessel(loadSavedJarVessel());
    const sync = () => setVessel(loadSavedJarVessel());
    window.addEventListener('nhatki-jar-vessel-changed', sync);
    return () => window.removeEventListener('nhatki-jar-vessel-changed', sync);
  }, []);

  const capsules = useMemo(() => extractCapsulesFromNotes(notes), [notes]);
  const droppedToday = useMemo(
    () => capsules.some((c) => c.entryDate === todayKey),
    [capsules, todayKey]
  );

  const recentDots = useMemo(() => {
    return [-4, -3, -2, -1, 0].map((off) => {
      const dk = shiftDateKey(todayKey, off);
      const found = capsules.find((c) => c.entryDate === dk);
      return found ? parseCapsuleStyle(found.paperStyle).palette : null;
    });
  }, [capsules, todayKey]);

  const previewPills = capsules.slice(0, MINI_SLOTS.length);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 px-4 py-3 shadow-sm transition ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenJar('jar')}
        className="group flex min-w-0 items-center gap-3 text-left"
      >
        {/* Miniature SVG Vessel reflecting Apothecary, Star Potion, or Cat-Ear Jar */}
        <svg
          width="52"
          height="58"
          viewBox="0 0 48 56"
          className="shrink-0 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105"
        >
          {vessel === 'cat-jar' ? (
            <path
              d="M13 8 L16 2 L20 7 H28 L32 2 L35 8 Z"
              fill="#c4905a"
              stroke="#6c4724"
              strokeWidth="1.2"
            />
          ) : (
            <rect
              x={vessel === 'star-bottle' ? 19 : 17}
              y="2"
              width={vessel === 'star-bottle' ? 10 : 14}
              height="7"
              rx="2"
              fill="#b6834c"
              stroke="#6c4724"
              strokeWidth="1.3"
            />
          )}

          {vessel === 'star-bottle' ? (
            <path
              d="M18 9 H30 V15 C31 19 42 22 42 35 C42 47 33 52 24 52 C15 52 6 47 6 35 C6 22 17 19 18 15 Z"
              fill={isNight ? 'rgba(210,235,252,0.18)' : 'rgba(255,255,255,0.78)'}
              stroke={isNight ? '#9dc4e2' : '#78a3c4'}
              strokeWidth="1.8"
            />
          ) : vessel === 'cat-jar' ? (
            <path
              d="M12 8 H36 V13 C38 16 42 18 42 23 V45 C42 49 38 52 33 52 H15 C10 52 6 49 6 45 V23 C6 18 10 16 12 13 Z"
              fill={isNight ? 'rgba(210,235,252,0.18)' : 'rgba(255,255,255,0.78)'}
              stroke={isNight ? '#9dc4e2' : '#78a3c4'}
              strokeWidth="1.8"
            />
          ) : (
            <path
              d="M16 9 H32 V14 C32 17 41 17 41 22 V46 C41 50 38 52 34 52 H14 C10 52 7 50 7 46 V22 C7 17 16 17 16 14 Z"
              fill={isNight ? 'rgba(210,235,252,0.18)' : 'rgba(255,255,255,0.78)'}
              stroke={isNight ? '#9dc4e2' : '#78a3c4'}
              strokeWidth="1.8"
            />
          )}

          {/* Mini two-tone pills stacked inside */}
          {previewPills.map((cap, idx) => {
            const slot = MINI_SLOTS[idx];
            const pal = parseCapsuleStyle(cap.paperStyle).palette;
            return (
              <g
                key={cap.id}
                transform={`translate(${slot.x}, ${slot.y}) rotate(${slot.rot})`}
              >
                <rect
                  x="-5.5"
                  y="-2.6"
                  width="5.5"
                  height="5.2"
                  rx="2.5"
                  fill={pal.halfA}
                />
                <rect
                  x="0"
                  y="-2.6"
                  width="5.5"
                  height="5.2"
                  rx="2.5"
                  fill={pal.translucent ? '#fdf6e4' : pal.halfB}
                />
                <rect
                  x="-5.5"
                  y="-2.6"
                  width="11"
                  height="5.2"
                  rx="2.6"
                  fill="none"
                  stroke={pal.stroke}
                  strokeWidth="0.8"
                />
              </g>
            );
          })}

          <line
            x1="12"
            y1="24"
            x2="12"
            y2="45"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-extrabold">💊 Lọ Thuốc Tâm Hồn</span>
            <span className="rounded-full bg-[#b57a29] px-2 py-0.5 text-[10px] font-extrabold text-white">
              {capsules.length} viên
            </span>
            {/* 5-day mini dose rhythm dots */}
            <span className="hidden items-center gap-1 sm:inline-flex">
              {recentDots.map((pal, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: pal ? pal.halfA : 'transparent',
                    borderColor: pal ? pal.stroke : 'rgba(138,108,82,0.45)',
                  }}
                  className="h-2.5 w-2.5 rounded-full border"
                />
              ))}
            </span>
          </div>
          <p
            className={`truncate text-xs ${
              isNight ? 'text-[#cbb7a1]' : 'text-[#6b5340]'
            }`}
          >
            {droppedToday
              ? 'Đã thả thuốc hôm nay ✓ • Nghiêng dốc lọ hoặc vuốt bóc vỏ kén'
              : 'Bào chế 1 viên nhộng lưu giữ cảm xúc hôm nay'}
          </p>
        </div>
      </button>

      <div className="flex flex-wrap shrink-0 items-center gap-1.5">
        {onOpenBonfire && (
          <button
            type="button"
            onClick={onOpenBonfire}
            title="Lò sưởi buông bỏ muộn phiền"
            className={`inline-flex items-center gap-1 rounded-2xl border px-2.5 py-2 text-xs font-extrabold transition ${
              isNight
                ? 'border-[#7a4b38] bg-[#38231b] text-[#f7c8b5] hover:bg-[#472d23]'
                : 'border-[#e0bca8] bg-[#fff2ea] text-[#9e3f28] hover:bg-[#fae4d7]'
            }`}
          >
            <Flame className="h-3.5 w-3.5" /> Buông bỏ
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenJar('compose')}
          className="inline-flex items-center gap-1 rounded-2xl bg-[#3d7c57] px-3 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#316647]"
        >
          <Plus className="h-3.5 w-3.5" /> Bào chế
        </button>
        <button
          type="button"
          onClick={() => onOpenJar('jar')}
          className="inline-flex items-center gap-1 rounded-2xl bg-[#b57a29] px-3 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#99651f]"
        >
          <Sparkles className="h-3.5 w-3.5" /> Mở lọ
        </button>
      </div>
    </div>
  );
}
