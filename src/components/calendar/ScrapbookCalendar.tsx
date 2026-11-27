'use client';

import React, { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import {
  formatMonthTitleVi,
  formatVnd,
  getMonthMatrix,
  parseDateKey,
  toLocalDateKey,
} from '@/lib/date';
import { MOOD_META } from '@/components/decor/ScrapbookDecor';
import { MonthlyWrappedModal } from '@/components/calendar/MonthlyWrappedModal';
import type { CatyStoreData, ThemeMode } from '@/types/catyboard';

interface ScrapbookCalendarProps {
  selectedDate: string;
  store: CatyStoreData;
  theme: ThemeMode;
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function ScrapbookCalendar({
  selectedDate,
  store,
  theme,
  onSelectDate,
}: ScrapbookCalendarProps) {
  const initial = parseDateKey(selectedDate);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [wrappedOpen, setWrappedOpen] = useState(false);

  const isNight = theme === 'cozy-night';
  const today = toLocalDateKey();
  const cells = getMonthMatrix(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-md ${
        isNight
          ? 'border-[#6f523b] bg-[#2e221a]/95 text-[#f6ead7]'
          : 'border-[#c89d6d] bg-[#faf3e3]/95 text-[#423022]'
      }`}
    >
      {/* Calendar Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold">Lịch kỷ niệm</h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWrappedOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#b57a29] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#99651f]"
          >
            <CalendarRange className="h-3.5 w-3.5" /> Tổng kết tháng
          </button>
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Tháng trước"
            className="rounded-xl border border-[#caa982] bg-white px-2 py-1.5 text-[#382619] hover:bg-[#f7efe0]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-28 text-center text-xs font-extrabold">
            {formatMonthTitleVi(viewYear, viewMonth)}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Tháng sau"
            className="rounded-xl border border-[#caa982] bg-white/80 p-1.5 text-[#423022] hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Row */}
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold opacity-70">
        {WEEKDAYS.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((dateKey, idx) => {
          if (!dateKey) {
            return <div key={`empty-${idx}`} className="aspect-square rounded-2xl opacity-20" />;
          }

          const dayNum = Number(dateKey.slice(8, 10));
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === today;
          const dayPhotos = store.photos.filter((p) => p.entryDate === dateKey);
          const coverPhoto = dayPhotos.find((p) => p.isCover) ?? dayPhotos[0];
          const dayEntry = store.dayEntries[dateKey];
          const doneCount = store.reminders.filter(
            (r) => r.entryDate === dateKey && r.completed
          ).length;
          const dayExpense = store.finance
            .filter((f) => f.entryDate === dateKey && f.type === 'expense')
            .reduce((acc, f) => acc + f.amount, 0);
          const capsuleUnlock = store.notes.some(
            (n) => n.kind === 'time_capsule' && n.unlockDate === dateKey
          );

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border p-1.5 text-left transition ${
                isSelected
                  ? 'border-[#5a94c5] ring-2 ring-[#8ec4ef] shadow-md'
                  : isToday
                    ? 'border-[#6da97c] ring-1 ring-[#a8d5b3]'
                    : isNight
                      ? 'border-[#57402f] bg-[#38291f] hover:border-[#8c694a]'
                      : 'border-[#e4d0b5] bg-white/85 hover:bg-white'
              }`}
            >
              {/* Background cover thumbnail if snapped */}
              {coverPhoto && (
                <>
                  <img
                    src={coverPhoto.dataUrl}
                    alt={coverPhoto.caption}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
                </>
              )}

              <div className="relative z-10 flex items-center justify-between">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                    coverPhoto
                      ? 'bg-[#fbf5e9] text-[#382619]'
                      : isToday
                        ? 'bg-[#3d7c57] text-white'
                        : ''
                  }`}
                >
                  {dayNum}
                </span>
                <span className="text-xs">
                  {dayEntry ? MOOD_META[dayEntry.mood].emoji : ''}
                </span>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-1 text-[9px] font-bold">
                {doneCount > 0 ? (
                  <span className="rounded bg-[#3d7c57] px-1 text-white">
                    ✓{doneCount}
                  </span>
                ) : (
                  <span />
                )}
                {capsuleUnlock && (
                  <span title="Có thư tương lai mở ngày này" className="rounded bg-[#b57a29] p-0.5 text-white">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                )}
                {dayExpense > 0 && (
                  <span
                    className={`hidden rounded px-1 sm:inline ${
                      coverPhoto
                        ? 'bg-black/60 text-white'
                        : 'bg-[#f9e1e3] text-[#7a3138]'
                    }`}
                  >
                    {formatVnd(dayExpense)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {wrappedOpen && (
        <MonthlyWrappedModal
          isOpen={wrappedOpen}
          onClose={() => setWrappedOpen(false)}
          year={viewYear}
          monthIndex={viewMonth}
          store={store}
        />
      )}
    </div>
  );
}
