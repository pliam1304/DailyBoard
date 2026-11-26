'use client';

import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  CheckSquare,
  Mic,
  NotebookPen,
  Pin,
  Wallet,
} from 'lucide-react';
import { MOOD_META } from '@/components/decor/ScrapbookDecor';
import { sanitizeText } from '@/lib/security';
import type { CatMood, DayEntry, ThemeMode } from '@/types/catyboard';

export type QuickComposerKind = 'photo' | 'note' | 'reminder' | 'voice';

interface QuickCheckinCardProps {
  dayEntry: DayEntry;
  theme: ThemeMode;
  activeComposers: Record<QuickComposerKind, boolean>;
  onCheckInMood: (mood: CatMood) => void;
  onSaveFridgeNote: (quote: string) => void;
  onToggleComposer: (kind: QuickComposerKind) => void;
  onOpenFinanceTab: () => void;
}

export function QuickCheckinCard({
  dayEntry,
  theme,
  activeComposers,
  onCheckInMood,
  onSaveFridgeNote,
  onToggleComposer,
  onOpenFinanceTab,
}: QuickCheckinCardProps) {
  const [greeting, setGreeting] = useState('Hôm nay của bạn thế nào?');
  const [fridgeDraft, setFridgeDraft] = useState(dayEntry.dailyQuote || '');
  const [editingFridge, setEditingFridge] = useState(false);

  const isNight = theme === 'cozy-night';

  useEffect(() => {
    setFridgeDraft(dayEntry.dailyQuote || '');
  }, [dayEntry.entryDate, dayEntry.dailyQuote]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setGreeting('☀️ Buổi sáng hôm nay của bạn thế nào?');
    else if (h >= 12 && h < 18) setGreeting('🌤️ Buổi chiều của bạn đang ổn chứ?');
    else setGreeting('🌙 Buổi tối ấm áp — hôm nay của bạn ra sao?');
  }, []);

  const submitFridge = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFridgeNote(sanitizeText(fridgeDraft, 160));
    setEditingFridge(false);
  };

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-sm transition-colors ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      {/* Top Row: Greeting + 2-second Check-in Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold">{greeting}</h3>
        {dayEntry.checkedIn && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#3d7c57] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
            <Check className="h-3 w-3" /> Đã check-in
          </span>
        )}
      </div>

      {/* 1-Tap Mood Check-in Row */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {(Object.keys(MOOD_META) as CatMood[]).map((m) => {
          const selected = dayEntry.mood === m && dayEntry.checkedIn;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onCheckInMood(m)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                selected
                  ? `${MOOD_META[m].badgeBg} border-transparent ring-2 ring-[#8b633c]/40 shadow-xs`
                  : isNight
                    ? 'border-[#5a4332] bg-[#3b2d22] text-[#f0e3d0] hover:bg-[#49372a]'
                    : 'border-[#e2cfb3] bg-white text-[#4b3525] hover:bg-[#f2e6d3]'
              }`}
            >
              {MOOD_META[m].emoji} {MOOD_META[m].label}
            </button>
          );
        })}
      </div>

      {/* Pinned 1-Line Fridge Sticky Note (Great for Duo or Personal Daily Highlight) */}
      <div className="mt-3">
        {dayEntry.dailyQuote && !editingFridge ? (
          <div
            onClick={() => setEditingFridge(true)}
            title="Chạm để sửa dòng ghim đầu ngày"
            className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border-2 border-dashed px-3.5 py-2 text-xs font-bold transition ${
              isNight
                ? 'border-[#7c5d43] bg-[#382a20] text-[#ffe8ad]'
                : 'border-[#d6a360] bg-[#fff8e6] text-[#4e341b]'
            }`}
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Pin className="h-3.5 w-3.5 shrink-0 text-[#b57a29]" />
              <span className="truncate">“{dayEntry.dailyQuote}”</span>
            </span>
            <span className="shrink-0 text-[10px] opacity-65">Sửa</span>
          </div>
        ) : (
          <form onSubmit={submitFridge} className="flex gap-1.5">
            <input
              type="text"
              value={fridgeDraft}
              onChange={(e) => setFridgeDraft(e.target.value)}
              placeholder="📌 Ghim nhanh 1 dòng lên đầu bảng hôm nay..."
              className={`flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none ${
                isNight
                  ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
                  : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
              }`}
            />
            {(fridgeDraft.trim() || editingFridge) && (
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-[#b57a29] px-3 py-1.5 text-xs font-extrabold text-white hover:opacity-90"
              >
                Ghim
              </button>
            )}
          </form>
        )}
      </div>

      {/* Quick Action Bar: Open only the module you want */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-black/10 pt-2.5">
        <button
          type="button"
          onClick={() => onToggleComposer('photo')}
          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
            activeComposers.photo
              ? 'bg-[#3a75a8] text-white'
              : isNight
                ? 'bg-[#382a20] text-[#efe2cf]'
                : 'bg-white text-[#382619] hover:bg-[#f2e6d3]'
          }`}
        >
          <Camera className="h-3.5 w-3.5" /> Ảnh
        </button>

        <button
          type="button"
          onClick={() => onToggleComposer('note')}
          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
            activeComposers.note
              ? 'bg-[#3d7c57] text-white'
              : isNight
                ? 'bg-[#382a20] text-[#efe2cf]'
                : 'bg-white text-[#382619] hover:bg-[#f2e6d3]'
          }`}
        >
          <NotebookPen className="h-3.5 w-3.5" /> Ghi chú
        </button>

        <button
          type="button"
          onClick={() => onToggleComposer('reminder')}
          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
            activeComposers.reminder
              ? 'bg-[#b57a29] text-white'
              : isNight
                ? 'bg-[#382a20] text-[#efe2cf]'
                : 'bg-white text-[#382619] hover:bg-[#f2e6d3]'
          }`}
        >
          <CheckSquare className="h-3.5 w-3.5" /> Nhắc việc
        </button>

        <button
          type="button"
          onClick={() => onToggleComposer('voice')}
          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
            activeComposers.voice
              ? 'bg-[#b95567] text-white'
              : isNight
                ? 'bg-[#382a20] text-[#efe2cf]'
                : 'bg-white text-[#382619] hover:bg-[#f2e6d3]'
          }`}
        >
          <Mic className="h-3.5 w-3.5" /> Thu âm
        </button>

        <button
          type="button"
          onClick={onOpenFinanceTab}
          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
            isNight
              ? 'bg-[#382a20] text-[#efe2cf]'
              : 'bg-white text-[#382619] hover:bg-[#f2e6d3]'
          }`}
        >
          <Wallet className="h-3.5 w-3.5" /> Chi tiêu
        </button>
      </div>
    </div>
  );
}
