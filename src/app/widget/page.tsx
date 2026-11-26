'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Circle, Flame, Moon, Sun } from 'lucide-react';
import { formatDisplayDateVi, formatVnd, toLocalDateKey } from '@/lib/date';
import { calculateStreak } from '@/lib/prompts';
import {
  computeFishPoints,
  getRemindersForDateWithRecurrence,
} from '@/lib/search';
import {
  ensureDayEntry,
  getActiveLocalUserEmail,
  loadStore,
  saveStore,
} from '@/lib/storage';
import { CatCompanion } from '@/components/cat/CatCompanion';
import type { CatyStoreData, ThemeMode } from '@/types/catyboard';

export default function DesktopWidgetPage() {
  const [store, setStore] = useState<CatyStoreData | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('sunlit');

  useEffect(() => {
    void (async () => {
      const activeUser = getActiveLocalUserEmail();
      const loaded = await loadStore(activeUser);
      setStore(loaded);
      setTheme(loaded.profile.defaultTheme);
    })();
  }, []);

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#efe3cf] p-4 text-xs font-bold text-[#423022]">
        Đang mở Mini-Widget... 🐾
      </div>
    );
  }

  const today = toLocalDateKey();
  const dayEntry = ensureDayEntry(store, today);
  const dayPhotos = store.photos.filter((p) => p.entryDate === today);
  const coverPhoto = dayPhotos.find((p) => p.isCover) ?? dayPhotos[0];
  const dayReminders = getRemindersForDateWithRecurrence(store.reminders, today);
  const doneCount = dayReminders.filter((r) => r.completed).length;
  const streak = calculateStreak(store, today);
  const fishPoints = computeFishPoints(store, today);
  const dayExpense = store.finance
    .filter((f) => f.entryDate === today && f.type === 'expense')
    .reduce((acc, f) => acc + f.amount, 0);

  const toggleReminder = (id: string) => {
    const next: CatyStoreData = {
      ...store,
      reminders: store.reminders.map((r) =>
        r.id === id
          ? {
              ...r,
              completed: !r.completed,
              completedAt: !r.completed ? new Date().toISOString() : undefined,
            }
          : r
      ),
    };
    setStore(next);
    void saveStore(next, getActiveLocalUserEmail());
  };

  const isNight = theme === 'cozy-night';

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-4 ${
        isNight ? 'theme-cozy-night bg-[#1c1613]' : 'bg-[#efe3cf]'
      }`}
    >
      <div
        className={`corkboard-surface w-full max-w-[380px] rounded-3xl border-[6px] p-4 shadow-2xl ${
          isNight
            ? 'border-[#3a281d] text-[#f6ead7]'
            : 'border-[#b98552] text-[#423022]'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase opacity-80">
              {store.profile.boardTitle} Mini-Widget
            </div>
            <div className="text-xs font-extrabold">
              {formatDisplayDateVi(today)}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-xl bg-[#b57a29] px-2 py-1 text-[10px] font-extrabold text-white">
              <Flame className="h-3 w-3" /> {streak}d
            </span>
            <button
              type="button"
              onClick={() =>
                setTheme((t) => (t === 'sunlit' ? 'cozy-night' : 'sunlit'))
              }
              className="rounded-xl bg-[#fbf5e9] p-1.5 text-[#382619]"
            >
              {isNight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-xl bg-[#4a3425] px-2.5 py-1.5 text-[11px] font-bold text-[#fdf7ed]"
            >
              Mở đầy đủ <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <CatCompanion
          catName={store.profile.catName}
          partnerCatName={store.profile.partnerCatName}
          catStyle={store.profile.catStyle}
          mood={dayEntry.mood}
          weather={dayEntry.weather}
          theme={theme}
          isPlayingMusic={Boolean(dayEntry.songTitle)}
          completedCount={doneCount}
          totalCount={dayReminders.length}
          fishPoints={fishPoints}
          activeDecor={store.profile.activeDecor}
          sharing={store.sharing}
          onChangeMood={() => {}}
          onChangeWeather={() => {}}
          compact
        />

        {coverPhoto && (
          <div className="polaroid-card mt-3 rounded-sm p-2">
            <img
              src={coverPhoto.dataUrl}
              alt={coverPhoto.caption}
              className="aspect-[16/9] w-full rounded-xs object-cover"
            />
            <p className="mt-1.5 text-center text-[11px] font-bold text-[#423022]">
              {coverPhoto.caption}
            </p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-[#fffaf0]/90 p-2.5 text-[#423022]">
            <div className="text-[10px] font-bold opacity-70">Chi hôm nay</div>
            <div className="font-extrabold text-[#be4953]">
              {formatVnd(dayExpense)}
            </div>
          </div>
          <div className="rounded-2xl bg-[#eef8f0]/95 p-2.5 text-[#255432]">
            <div className="text-[10px] font-bold opacity-75">Lời nhắc xong</div>
            <div className="font-extrabold">
              {doneCount}/{dayReminders.length} việc
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 rounded-2xl bg-[#fffaf0]/90 p-3 text-xs text-[#423022]">
          <div className="text-[10px] font-extrabold uppercase opacity-70">
            Việc hôm nay
          </div>
          {dayReminders.length === 0 ? (
            <p className="text-[11px] opacity-70">Chưa có nhắc nhở nào hôm nay~</p>
          ) : (
            dayReminders.slice(0, 4).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleReminder(r.id)}
                className="flex w-full items-center gap-2 text-left text-xs"
              >
                {r.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#5aa46d]" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-[#86b4dc]" />
                )}
                <span className={r.completed ? 'line-through opacity-60' : 'font-medium'}>
                  {r.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
