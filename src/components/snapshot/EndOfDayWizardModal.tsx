'use client';

import React, { useState } from 'react';
import {
  Camera,
  ChevronRight,
  Flame,
  MoonStar,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { createUuid } from '@/lib/sharing';
import { MOOD_META, WEATHER_META } from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  CatMood,
  DayEntry,
  FinanceEntry,
  WeatherType,
} from '@/types/catyboard';

interface EndOfDayWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryDate: string;
  catName: string;
  streak: number;
  hasPhotoToday: boolean;
  dayEntry: DayEntry;
  sharing: BoardSharingState;
  onUpdateDay: (patch: Partial<DayEntry>) => void;
  onAddQuickExpense: (entry: FinanceEntry) => void;
  onOpenCamera: () => void;
  onOpenSnapshot: () => void;
}

export function EndOfDayWizardModal({
  isOpen,
  onClose,
  entryDate,
  catName,
  streak,
  hasPhotoToday,
  dayEntry,
  sharing,
  onUpdateDay,
  onAddQuickExpense,
  onOpenCamera,
  onOpenSnapshot,
}: EndOfDayWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quote, setQuote] = useState(dayEntry.dailyQuote || '');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

  if (!isOpen) return null;

  const finishStep2 = () => {
    if (quote.trim() !== (dayEntry.dailyQuote || '').trim()) {
      onUpdateDay({ dailyQuote: quote.trim() });
    }
    const num = Number(expenseAmount.replace(/[^\d]/g, ''));
    if (num > 0) {
      onAddQuickExpense({
        id: createUuid(),
        entryDate,
        type: 'expense',
        amount: num,
        category: 'other',
        moodTag: 'essential',
        note: expenseNote.trim() || 'Chốt chi cuối ngày',
        authorRole: sharing.activeRole,
        createdAt: new Date().toISOString(),
      });
      setExpenseAmount('');
      setExpenseNote('');
    }
    setStep(3);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md rounded-3xl border-2 border-[#b98d61] bg-[#fbf5e9] p-5 text-[#382619] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#4a3425] text-[#ffd978]">
              <MoonStar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">Chốt Ngày Trong 15 Giây</h2>
              <p className="text-[11px] text-[#6b5340]">
                Bước {step}/3 • Nghi thức nhỏ cùng {catName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#ede0cc] p-2 hover:bg-[#e1d0b6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-4 grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-colors ${
                step >= s ? 'bg-[#3d7c57]' : 'bg-[#e3d2b8]'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-extrabold">
                1. Hôm nay tâm trạng của bạn thế nào?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(MOOD_META) as CatMood[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onUpdateDay({ mood: m })}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      dayEntry.mood === m
                        ? MOOD_META[m].badgeBg
                        : 'bg-[#efe4d1] text-[#4b3525] hover:bg-[#e5d6bc]'
                    }`}
                  >
                    {MOOD_META[m].emoji} {MOOD_META[m].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-extrabold">
                Thời tiết bên cửa sổ hôm nay:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(WEATHER_META) as WeatherType[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onUpdateDay({ weather: w })}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      dayEntry.weather === w
                        ? 'bg-[#3a75a8] text-white'
                        : 'bg-[#efe4d1] text-[#4b3525]'
                    }`}
                  >
                    {WEATHER_META[w].emoji} {WEATHER_META[w].label}
                  </button>
                ))}
              </div>
            </div>

            {!hasPhotoToday && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#d6be9c] bg-[#f4ead8] p-3 text-xs">
                <span>Hôm nay chưa có tấm Polaroid nào nè!</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCamera();
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#3a75a8] px-3 py-1.5 font-extrabold text-white"
                >
                  <Camera className="h-3.5 w-3.5" /> Chụp nhanh
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#316647]"
              >
                Tiếp theo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-xs">
              <span className="font-extrabold">
                2. Tóm tắt ngày hôm nay bằng 1 câu ngắn:
              </span>
              <textarea
                rows={3}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Ví dụ: Một ngày hơi bận nhưng ly trà chiều rất ngon..."
                className="mt-1.5 w-full resize-none rounded-xl border border-[#d5bc99] bg-white p-3 text-xs text-[#382619] outline-none"
              />
            </label>

            <div className="rounded-2xl border border-[#dfcba9] bg-white/85 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Wallet className="h-3.5 w-3.5 text-[#b57a29]" />
                Có khoản chi nào quên ghi không? (tùy chọn)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Số tiền (VNĐ)"
                  className="rounded-xl border border-[#d5bc99] bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Mua gì thế?"
                  className="rounded-xl border border-[#d5bc99] bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl bg-[#ede0cc] px-4 py-2 text-xs font-bold text-[#382619]"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={finishStep2}
                className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#316647]"
              >
                Hoàn tất chốt ngày <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#b57a29] text-white shadow-md">
              <Flame className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                Tuyệt vời! Chuỗi {Math.max(1, streak)} ngày cùng {catName} 🐾
              </h3>
              <p className="mt-1 text-xs text-[#6b5340]">
                Mọi kỷ niệm hôm nay đã được xếp gọn trên cuốn lịch. Bạn có muốn xuất ngay 1 tấm ảnh Báo Cáo Hằng Ngày để lưu lại không?
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#ede0cc] px-4 py-2 text-xs font-bold text-[#382619]"
              >
                Để sau nhé
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSnapshot();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4a3425] px-4 py-2 text-xs font-extrabold text-[#fdf7ed] shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#ffd978]" />
                Xuất ảnh báo cáo PNG
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
