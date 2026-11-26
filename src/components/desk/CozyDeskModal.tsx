'use client';

import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  Disc3,
  Flame,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  X,
} from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import { formatDisplayDateVi, toLocalDateKey } from '@/lib/date';
import type { MusicTrack } from '@/types/catyboard';

interface CozyDeskModalProps {
  isOpen: boolean;
  boardTitle: string;
  catName: string;
  streakCount: number;
  activeTrack: MusicTrack | null;
  deskTreat?: { emoji: string; label: string; fromNickname?: string } | null;
  onStepNextTrack: () => void;
  onStopTrack: () => void;
  onClose: () => void;
}

export function CozyDeskModal({
  isOpen,
  boardTitle,
  catName,
  streakCount,
  activeTrack,
  deskTreat,
  onStepNextTrack,
  onStopTrack,
  onClose,
}: CozyDeskModalProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [focusSecLeft, setFocusSecLeft] = useState<number>(25 * 60);
  const [focusRunning, setFocusRunning] = useState<boolean>(false);
  const [rainOn, setRainOn] = useState<boolean>(false);
  const [fireOn, setFireOn] = useState<boolean>(false);
  const [wakeLocked, setWakeLocked] = useState<boolean>(false);

  // Live clock tick
  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Pomodoro focus timer tick
  useEffect(() => {
    if (!isOpen || !focusRunning) return;
    const id = setInterval(() => {
      setFocusSecLeft((prev) => {
        if (prev <= 1) {
          setFocusRunning(false);
          ambientEngine.playPurrChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isOpen, focusRunning]);

  // Screen Wake Lock so phone/tablet stays awake as a Standby Desk Clock
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined') return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if ('wakeLock' in navigator && navigator.wakeLock?.request) {
          sentinel = await navigator.wakeLock.request('screen');
          if (!cancelled) setWakeLocked(true);
        }
      } catch {
        if (!cancelled) setWakeLocked(false);
      }
    };

    void acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      setWakeLocked(false);
      if (sentinel) {
        void sentinel.release().catch(() => {});
      }
    };
  }, [isOpen]);

  const toggleRain = () => {
    const next = !rainOn;
    setRainOn(next);
    ambientEngine.updateLevels({
      rain: next ? 0.35 : 0,
      fire: fireOn ? 0.3 : 0,
      purr: 0,
    });
  };

  const toggleFire = () => {
    const next = !fireOn;
    setFireOn(next);
    ambientEngine.updateLevels({
      rain: rainOn ? 0.35 : 0,
      fire: next ? 0.3 : 0,
      purr: 0,
    });
  };

  const enterBrowserFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  };

  if (!isOpen) return null;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const focusMm = String(Math.floor(focusSecLeft / 60)).padStart(2, '0');
  const focusSs = String(focusSecLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#151219] via-[#1f1924] to-[#2a1f1b] p-5 text-[#f7ecd8] sm:p-8">
      {/* Ambient Rain Backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-45">
        {[8, 19, 31, 46, 58, 71, 83, 93].map((leftPct, i) => (
          <div
            key={leftPct}
            className="rain-streak absolute top-0 h-10 w-[1.5px] rounded-full bg-[#b9d9f7]/45"
            style={{ left: `${leftPct}%`, animationDelay: `${i * 0.19}s` }}
          />
        ))}
        <div className="absolute right-12 top-12 h-16 w-16 rounded-full bg-[#ffe599]/20 blur-xl" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-extrabold tracking-wide">
            🐾 {boardTitle} • Góc tập trung
          </span>
          <span className="rounded-full bg-[#b57a29]/90 px-2.5 py-1 text-[11px] font-extrabold text-white">
            🔥 {streakCount} ngày
          </span>
          {wakeLocked && (
            <span className="hidden rounded-full bg-[#3d7c57]/80 px-2.5 py-1 text-[10px] font-bold text-white sm:inline-block">
              Giữ sáng màn hình ✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={enterBrowserFullscreen}
            title="Toàn màn hình"
            className="rounded-full border border-white/15 bg-white/10 p-2 text-[#f7ecd8] hover:bg-white/20"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Thoát chế độ góc học bài"
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-extrabold text-[#f7ecd8] hover:bg-white/20"
          >
            <X className="h-4 w-4" /> Đóng
          </button>
        </div>
      </div>

      {/* Center Retro Flip Clock & Pomodoro */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-6 py-4">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#decab1]">
          {formatDisplayDateVi(toLocalDateKey(now))}
        </div>

        {/* Flip Clock Cards */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/15 bg-[#28201d]/95 shadow-2xl sm:h-40 sm:w-40">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] bg-black/45" />
            <span className="pixel-led text-6xl font-black tracking-tight text-[#fff5e4] sm:text-8xl">
              {hh}
            </span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ffd685]" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ffd685]" />
          </div>

          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/15 bg-[#28201d]/95 shadow-2xl sm:h-40 sm:w-40">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] bg-black/45" />
            <span className="pixel-led text-6xl font-black tracking-tight text-[#fff5e4] sm:text-8xl">
              {mm}
            </span>
            <span className="pixel-led absolute right-3 bottom-2.5 text-xs font-bold text-[#c7b299] sm:text-sm">
              {ss}
            </span>
          </div>
        </div>

        {/* Companion + Desk Treat Status */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#e6d5be]">
          <span>💤 {catName} đang nằm nghe nhạc cạnh bạn</span>
          {deskTreat && (
            <span className="rounded-full border border-[#ffd98e]/40 bg-[#423122] px-3 py-1 font-bold text-[#ffe6ad]">
              {deskTreat.emoji} {deskTreat.label}
              {deskTreat.fromNickname ? ` từ ${deskTreat.fromNickname}` : ''}
            </span>
          )}
        </div>

        {/* Compact Focus Pomodoro Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/15 bg-white/8 px-4 py-2.5 backdrop-blur-md">
          <span className="pixel-led px-2 text-lg font-extrabold text-[#ffd978]">
            🍅 {focusMm}:{focusSs}
          </span>
          <button
            type="button"
            onClick={() => setFocusRunning((r) => !r)}
            className="inline-flex items-center gap-1 rounded-2xl bg-[#3d7c57] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-[#316647]"
          >
            {focusRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Tạm dừng
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Bắt đầu
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setFocusRunning(false);
              setFocusSecLeft(25 * 60);
            }}
            className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20"
          >
            25p
          </button>
          <button
            type="button"
            onClick={() => {
              setFocusRunning(false);
              setFocusSecLeft(50 * 60);
            }}
            className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20"
          >
            50p
          </button>
          <button
            type="button"
            onClick={() => {
              setFocusRunning(false);
              setFocusSecLeft(5 * 60);
            }}
            title="Nghỉ 5 phút"
            className="rounded-xl bg-white/10 p-1.5 hover:bg-white/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Ambient & Active Music Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5 text-xs">
          <Disc3
            className={`h-5 w-5 shrink-0 text-[#7ec3f7] ${
              activeTrack ? 'animate-spin' : 'opacity-50'
            }`}
            style={{ animationDuration: '4s' }}
          />
          <div className="min-w-0">
            <div className="truncate font-extrabold">
              {activeTrack ? activeTrack.title : 'Chưa bật bài nhạc nền'}
            </div>
            <div className="truncate text-[11px] text-[#cbb79f]">
              {activeTrack
                ? activeTrack.artistOrChannel
                : 'Có thể bật tiếng mưa hoặc lửa củi bên phải'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleRain}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              rainOn ? 'bg-[#3a75a8] text-white' : 'bg-white/10 text-[#e9dac6]'
            }`}
          >
            <CloudRain className="h-3.5 w-3.5" /> Mưa
          </button>
          <button
            type="button"
            onClick={toggleFire}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              fireOn ? 'bg-[#b57a29] text-white' : 'bg-white/10 text-[#e9dac6]'
            }`}
          >
            <Flame className="h-3.5 w-3.5" /> Lửa củi
          </button>

          {activeTrack && (
            <>
              <button
                type="button"
                onClick={onStepNextTrack}
                aria-label="Bài tiếp theo"
                className="rounded-xl bg-white/15 p-2 text-white hover:bg-white/25"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onStopTrack}
                aria-label="Dừng nhạc"
                className="rounded-xl bg-[#b95567] p-2 text-white hover:bg-[#a14656]"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
