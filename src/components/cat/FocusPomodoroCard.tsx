'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import { sendLocalNotification } from '@/lib/pwa';
import type { ReminderItem, ThemeMode } from '@/types/catyboard';

interface FocusPomodoroCardProps {
  catName: string;
  pendingReminders: ReminderItem[];
  theme: ThemeMode;
  onCompleteReminder: (id: string) => void;
}

const PRESETS = [
  { minutes: 15, label: '15p' },
  { minutes: 25, label: '25p' },
  { minutes: 50, label: '50p' },
];

export function FocusPomodoroCard({
  catName,
  pendingReminders,
  theme,
  onCompleteReminder,
}: FocusPomodoroCardProps) {
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [linkedReminderId, setLinkedReminderId] = useState<string>('');

  const isNight = theme === 'cozy-night';

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRunning(false);
          setFinished(true);
          ambientEngine.playPurrChime();
          sendLocalNotification(
            `🐾 ${catName}: Hết phiên tập trung rồi!`,
            'Nghỉ mắt chút xíu và tích hoàn thành công việc nhé ♡'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, catName]);

  const selectPreset = (mins: number) => {
    setRunning(false);
    setFinished(false);
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const resetTimer = () => {
    setRunning(false);
    setFinished(false);
    setSecondsLeft(presetMinutes * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = Math.round(
    ((presetMinutes * 60 - secondsLeft) / (presetMinutes * 60)) * 100
  );

  const linkedTask = pendingReminders.find((r) => r.id === linkedReminderId);

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-md transition-colors ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#b57a29] text-white shadow-xs">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold">Đồng hồ tập trung</h3>
            {running && (
              <p
                className={`text-[10px] ${
                  isNight ? 'text-[#cbb7a1]' : 'text-[#6b5340]'
                }`}
              >
                Đang tập trung cùng {catName}...
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.minutes}
              type="button"
              onClick={() => selectPreset(p.minutes)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition ${
                presetMinutes === p.minutes
                  ? 'bg-[#3a75a8] text-white'
                  : isNight
                    ? 'bg-[#3b2d22] text-[#eadbc6]'
                    : 'bg-[#efe4d1] text-[#4c3625]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Countdown Readout + Progress */}
      <div className="mb-2.5 flex items-center justify-between gap-3 rounded-2xl border border-[#4f3b2b] bg-[#221913] px-3.5 py-2.5 text-[#f8ecd8]">
        <div className="pixel-led text-2xl font-black tracking-wider">
          {mm}:{ss}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (secondsLeft === 0) setSecondsLeft(presetMinutes * 60);
              setFinished(false);
              setRunning((r) => !r);
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#316647]"
          >
            {running ? (
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
            onClick={resetTimer}
            aria-label="Đặt lại đồng hồ"
            className="rounded-xl bg-[#3c2d22] p-1.5 text-[#f4e8d6] hover:bg-[#4e3b2d]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-black/15">
        <div
          className="h-full rounded-full bg-[#3d7c57] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Optional Link to Pending Reminder */}
      {pendingReminders.length > 0 && (
        <select
          value={linkedReminderId}
          onChange={(e) => setLinkedReminderId(e.target.value)}
          className={`w-full rounded-xl border px-2.5 py-1.5 text-[11px] font-medium outline-none ${
            isNight
              ? 'border-[#5a4230] bg-[#3a2b20] text-[#f4e8d6]'
              : 'border-[#dec7a6] bg-white text-[#382619]'
          }`}
        >
          <option value="">Gắn với 1 lời nhắc hôm nay (tùy chọn)...</option>
          {pendingReminders.map((r) => (
            <option key={r.id} value={r.id}>
              • {r.title}
            </option>
          ))}
        </select>
      )}

      {/* Completion Prompt */}
      {finished && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#3d7c57] px-3 py-2 text-xs font-bold text-white">
          <span>🎉 Xong phiên rồi! Nghỉ ngơi chút nhé~</span>
          {linkedTask && (
            <button
              type="button"
              onClick={() => {
                onCompleteReminder(linkedTask.id);
                setLinkedReminderId('');
                setFinished(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#1e482b]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Tích xong việc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
