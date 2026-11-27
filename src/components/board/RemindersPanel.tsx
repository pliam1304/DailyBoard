'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import { createUuid } from '@/lib/sharing';
import { AuthorBadge } from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  RecurrenceType,
  ReminderCategory,
  ReminderItem,
  ThemeMode,
} from '@/types/catyboard';

interface RemindersPanelProps {
  entryDate: string;
  reminders: ReminderItem[];
  sharing: BoardSharingState;
  theme: ThemeMode;
  onAddReminder: (item: ReminderItem) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

const CAT_BADGES: Record<ReminderCategory, { label: string; cls: string }> = {
  life: { label: 'Đời sống', cls: 'bg-[#3d7c57] text-white' },
  work: { label: 'Công việc', cls: 'bg-[#3a75a8] text-white' },
  'self-care': { label: 'Chăm sóc', cls: 'bg-[#b95567] text-white' },
  cat: { label: 'Cùng mèo', cls: 'bg-[#b57a29] text-white' },
};

export function RemindersPanel({
  entryDate,
  reminders,
  sharing,
  theme,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}: RemindersPanelProps) {
  const [title, setTitle] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('life');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');

  const isNight = theme === 'cozy-night';
  const pending = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddReminder({
      id: createUuid(),
      entryDate,
      title: title.trim(),
      dueTime: dueTime || undefined,
      completed: false,
      authorRole: sharing.activeRole,
      recurrence,
      category,
      createdAt: new Date().toISOString(),
    });
    setTitle('');
    setDueTime('');
    setRecurrence('none');
  };

  return (
    <div className="space-y-4">
      {/* Add Reminder Card */}
      <form
        onSubmit={handleAdd}
        className={`rounded-3xl border-2 p-4 shadow-sm ${
          isNight
            ? 'border-[#6f523b] bg-[#2e221a]/92 text-[#f6ead7]'
            : 'border-[#c89d6d] bg-[#faf3e3]/95 text-[#423022]'
        }`}
      >
        <h3 className="mb-2.5 text-sm font-extrabold">Nhắc việc hôm nay</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thêm lời nhắc (vd: Uống nước, Gửi mail, Chụp ảnh...)"
            className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${
              isNight
                ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7] placeholder:text-[#b89f86]'
                : 'border-[#dfc8a8] bg-white text-[#423022] placeholder:text-[#9c826b]'
            }`}
          />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className={`rounded-xl border px-2.5 py-2 text-xs outline-none ${
              isNight
                ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7]'
                : 'border-[#dfc8a8] bg-white text-[#423022]'
            }`}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#3a75a8] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#2f6390]"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CAT_BADGES) as ReminderCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                  category === cat
                    ? `${CAT_BADGES[cat].cls} shadow-xs`
                    : isNight
                      ? 'bg-[#3b2d22] text-[#eadbc6] hover:bg-[#49372a]'
                      : 'bg-[#f0e4cf] text-[#4c3625] hover:bg-[#e7d7bc]'
                }`}
              >
                {CAT_BADGES[cat].label}
              </button>
            ))}
          </div>

          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
            className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold outline-none ${
              isNight
                ? 'border-[#5a4230] bg-[#3a2b20] text-[#f4e8d6]'
                : 'border-[#dfc8a8] bg-white text-[#382619]'
            }`}
          >
            <option value="none">Một lần</option>
            <option value="daily">Lặp hằng ngày</option>
            <option value="weekly">Lặp hằng tuần</option>
          </select>
        </div>
      </form>

      {/* Two Columns: To-do & Completed ("Lời nhắc đã làm") */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          className={`rounded-3xl border p-4 shadow-sm ${
            isNight
              ? 'border-[#614835] bg-[#2a1f18]/90 text-[#f6ead7]'
              : 'border-[#d8be98] bg-[#fffaf0]/95 text-[#423022]'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wide opacity-80">
              Cần làm ({pending.length})
            </span>
          </div>
          {pending.length === 0 ? (
            <p className="py-4 text-center text-xs opacity-65">
              Không còn việc tồn đọng nào hôm nay ~
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-2 rounded-2xl border p-2.5 ${
                    isNight
                      ? 'border-[#4d392a] bg-[#36281f]'
                      : 'border-[#eadbc4] bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      ambientEngine.playPurrChime();
                      onToggleReminder(item.id);
                    }}
                    className="flex flex-1 items-start gap-2 text-left"
                  >
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#86b4dc]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CAT_BADGES[item.category].cls}`}
                        >
                          {CAT_BADGES[item.category].label}
                        </span>
                        <AuthorBadge sharing={sharing} role={item.authorRole} />
                        {item.recurrence && item.recurrence !== 'none' && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#efe4d1] px-2 py-0.5 text-[10px] font-bold text-[#5c422c]">
                            <Repeat className="h-2.5 w-2.5" />
                            {item.recurrence === 'daily' ? 'Hằng ngày' : 'Hằng tuần'}
                          </span>
                        )}
                        {item.dueTime && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] opacity-70">
                            <Clock className="h-2.5 w-2.5" /> {item.dueTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(item.id)}
                    aria-label="Xóa nhắc nhở"
                    className="rounded p-1 opacity-45 hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Done List ("Lời nhắc đã làm") */}
        <div
          className={`rounded-3xl border p-4 shadow-sm ${
            isNight
              ? 'border-[#4b6752] bg-[#212b23]/90 text-[#e9f5ec]'
              : 'border-[#b8d8be] bg-[#eef8f0]/95 text-[#274b31]'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
              <Award className="h-4 w-4 text-[#5ca26e]" />
              Đã hoàn thành ({done.length})
            </span>
          </div>
          {done.length === 0 ? (
            <p className="py-4 text-center text-xs opacity-65">
              Tích xong việc ở bên trái, chiến tích sẽ xếp gọn vào đây!
            </p>
          ) : (
            <div className="space-y-2">
              {done.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-2 rounded-2xl border p-2.5 ${
                    isNight
                      ? 'border-[#3a5240] bg-[#2a382d]'
                      : 'border-[#cbe5d0] bg-white/85'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleReminder(item.id)}
                    className="flex flex-1 items-start gap-2 text-left"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5aa46d]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold line-through opacity-80">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] opacity-65">
                          Đã hoàn thành 🐾
                        </span>
                        <AuthorBadge
                          sharing={sharing}
                          role={item.completedByRole || item.authorRole}
                        />
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(item.id)}
                    aria-label="Xóa việc đã làm"
                    className="rounded p-1 opacity-45 hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
