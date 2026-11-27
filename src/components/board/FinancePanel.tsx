'use client';

import React, { useState } from 'react';
import {
  Check,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatVnd } from '@/lib/date';
import { createUuid } from '@/lib/sharing';
import { AuthorBadge } from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  FinanceCategory,
  FinanceEntry,
  FinanceMoodTag,
  FinanceType,
  SavingGoal,
  ThemeMode,
} from '@/types/catyboard';

interface FinancePanelProps {
  entryDate: string;
  dayEntries: FinanceEntry[];
  allFinance: FinanceEntry[];
  monthlyBudget: number;
  savingGoal: SavingGoal;
  sharing: BoardSharingState;
  theme: ThemeMode;
  onAddFinance: (item: FinanceEntry) => void;
  onDeleteFinance: (id: string) => void;
  onUpdateSavingGoal: (goal: SavingGoal) => void;
}

const CATEGORIES: { id: FinanceCategory; label: string; emoji: string }[] = [
  { id: 'food', label: 'Ăn uống', emoji: '🍜' },
  { id: 'coffee', label: 'Cà phê / Trà', emoji: '🧋' },
  { id: 'shopping', label: 'Mua sắm', emoji: '🛍️' },
  { id: 'bills', label: 'Hóa đơn', emoji: '🧾' },
  { id: 'saving', label: 'Tiết kiệm', emoji: '🐷' },
  { id: 'salary', label: 'Thu nhập', emoji: '💵' },
  { id: 'other', label: 'Khác', emoji: '📦' },
];

const MOOD_TAGS: { id: FinanceMoodTag; label: string }[] = [
  { id: 'essential', label: 'Cần thiết' },
  { id: 'treat', label: 'Tự thưởng' },
  { id: 'impulse', label: 'Hơi ngẫu hứng' },
  { id: 'proud', label: 'Rất đáng tiền' },
  { id: 'gift', label: 'Quà tặng' },
];

export function FinancePanel({
  entryDate,
  dayEntries,
  allFinance,
  monthlyBudget,
  savingGoal,
  sharing,
  theme,
  onAddFinance,
  onDeleteFinance,
  onUpdateSavingGoal,
}: FinancePanelProps) {
  const [type, setType] = useState<FinanceType>('expense');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('coffee');
  const [moodTag, setMoodTag] = useState<FinanceMoodTag>('treat');
  const [note, setNote] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalTitleDraft, setGoalTitleDraft] = useState(savingGoal.title);
  const [goalTargetDraft, setGoalTargetDraft] = useState(
    String(savingGoal.targetAmount)
  );

  const isNight = theme === 'cozy-night';
  const monthPrefix = entryDate.slice(0, 7);

  const totalSavedAllTime = allFinance
    .filter((f) => f.type === 'saving')
    .reduce((acc, f) => acc + f.amount, 0);
  const goalPct = Math.min(
    100,
    savingGoal.targetAmount > 0
      ? Math.round((totalSavedAllTime / savingGoal.targetAmount) * 100)
      : 0
  );

  const dayExpense = dayEntries
    .filter((f) => f.type === 'expense')
    .reduce((acc, f) => acc + f.amount, 0);
  const dayIncome = dayEntries
    .filter((f) => f.type === 'income')
    .reduce((acc, f) => acc + f.amount, 0);
  const daySaving = dayEntries
    .filter((f) => f.type === 'saving')
    .reduce((acc, f) => acc + f.amount, 0);

  const monthExpense = allFinance
    .filter((f) => f.entryDate.startsWith(monthPrefix) && f.type === 'expense')
    .reduce((acc, f) => acc + f.amount, 0);
  const budgetPct = Math.min(
    100,
    monthlyBudget > 0 ? Math.round((monthExpense / monthlyBudget) * 100) : 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = Number(amountRaw.replace(/[^\d]/g, ''));
    if (!cleaned || cleaned <= 0) return;

    onAddFinance({
      id: createUuid(),
      entryDate,
      type,
      amount: cleaned,
      category: type === 'saving' ? 'saving' : type === 'income' ? 'salary' : category,
      moodTag,
      note: note.trim() || CATEGORIES.find((c) => c.id === category)?.label || 'Ghi chép',
      authorRole: sharing.activeRole,
      createdAt: new Date().toISOString(),
    });
    setAmountRaw('');
    setNote('');
  };

  return (
    <div className="space-y-4">
      {/* Daily & Monthly Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`rounded-2xl border p-3 ${
            isNight
              ? 'border-[#6f4448] bg-[#362325] text-[#f8d5d8]'
              : 'border-[#e8bec2] bg-[#fdf1f2] text-[#732d34]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <TrendingDown className="h-3.5 w-3.5" /> Chi hôm nay
          </div>
          <div className="mt-1 text-lg font-extrabold">{formatVnd(dayExpense)}</div>
        </div>
        <div
          className={`rounded-2xl border p-3 ${
            isNight
              ? 'border-[#46684f] bg-[#213125] text-[#d4f2dc]'
              : 'border-[#b7d9bf] bg-[#eef7f0] text-[#22502e]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <PiggyBank className="h-3.5 w-3.5" /> Tiết kiệm hôm nay
          </div>
          <div className="mt-1 text-lg font-extrabold">{formatVnd(daySaving)}</div>
        </div>
        <div
          className={`rounded-2xl border p-3 ${
            isNight
              ? 'border-[#3f5e7a] bg-[#1f2e3d] text-[#d2e8fb]'
              : 'border-[#b6d4ec] bg-[#eef6fc] text-[#1e4b70]'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <TrendingUp className="h-3.5 w-3.5" /> Thu hôm nay
          </div>
          <div className="mt-1 text-lg font-extrabold">{formatVnd(dayIncome)}</div>
        </div>
      </div>

      {/* Monthly Cozy Budget Progress + Saving Goal Jar */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-3.5 ${
            isNight
              ? 'border-[#614835] bg-[#2c2119]/90 text-[#f4e8d6]'
              : 'border-[#d8be98] bg-[#fbf5e9] text-[#382619]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-bold">Ngân sách tháng {entryDate.slice(5, 7)}</span>
            <span className="font-semibold">
              {formatVnd(monthExpense)} / {formatVnd(monthlyBudget)} ({budgetPct}%)
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/15">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPct > 85 ? 'bg-[#b54852]' : 'bg-[#3d7c57]'
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        <div
          className={`rounded-2xl border p-3.5 ${
            isNight
              ? 'border-[#46684f] bg-[#213125] text-[#e2f5e8]'
              : 'border-[#b7d9bf] bg-[#eef7f0] text-[#214f2d]'
          }`}
        >
          {editingGoal ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={goalTitleDraft}
                  onChange={(e) => setGoalTitleDraft(e.target.value)}
                  placeholder="Tên mục tiêu..."
                  className="flex-1 rounded-lg border border-[#a5cca9] bg-white px-2 py-1 text-[#214f2d]"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalTargetDraft}
                  onChange={(e) => setGoalTargetDraft(e.target.value)}
                  placeholder="Số tiền"
                  className="w-28 rounded-lg border border-[#a5cca9] bg-white px-2 py-1 text-[#214f2d]"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSavingGoal({
                      ...savingGoal,
                      title: goalTitleDraft.trim() || 'Hũ tiết kiệm của mèo',
                      targetAmount:
                        Number(goalTargetDraft.replace(/[^\d]/g, '')) || 5000000,
                    });
                    setEditingGoal(false);
                  }}
                  className="rounded-lg bg-[#3d7c57] px-2.5 py-1 text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-extrabold truncate">
                  <Target className="h-3.5 w-3.5 shrink-0" />
                  {savingGoal.emoji} {savingGoal.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGoalTitleDraft(savingGoal.title);
                    setGoalTargetDraft(String(savingGoal.targetAmount));
                    setEditingGoal(true);
                  }}
                  aria-label="Sửa mục tiêu tiết kiệm"
                  className="rounded p-0.5 opacity-70 hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <div className="mb-1 flex justify-between text-[11px] font-bold">
                <span>
                  {formatVnd(totalSavedAllTime)} / {formatVnd(savingGoal.targetAmount)}
                </span>
                <span>{goalPct}% 🐟</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/15">
                <div
                  className="h-full rounded-full bg-[#3a75a8] transition-all"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Finance Entry */}
      <form
        onSubmit={handleSubmit}
        className={`rounded-3xl border-2 p-4 shadow-sm ${
          isNight
            ? 'border-[#6f523b] bg-[#2e221a]/92 text-[#f6ead7]'
            : 'border-[#c89d6d] bg-[#faf3e3]/95 text-[#423022]'
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'expense', label: 'Chi tiêu' },
              { id: 'saving', label: 'Tiết kiệm' },
              { id: 'income', label: 'Thu nhập' },
            ] as { id: FinanceType; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-extrabold transition ${
                type === t.id
                  ? t.id === 'expense'
                    ? 'bg-[#b54852] text-white'
                    : t.id === 'saving'
                      ? 'bg-[#3d7c57] text-white'
                      : 'bg-[#3a75a8] text-white'
                  : isNight
                    ? 'bg-[#3b2d22] text-[#eadbc6]'
                    : 'bg-[#f0e4cf] text-[#4c3625]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            placeholder="Số tiền (vd: 45000)"
            className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none ${
              isNight
                ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7]'
                : 'border-[#dfc8a8] bg-white text-[#423022]'
            }`}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (vd: Trà sữa với bạn)"
            className={`rounded-xl border px-3 py-2 text-xs outline-none sm:col-span-2 ${
              isNight
                ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7]'
                : 'border-[#dfc8a8] bg-white text-[#423022]'
            }`}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  category === c.id
                    ? 'bg-[#b57a29] font-bold text-white'
                    : isNight
                      ? 'bg-[#3b2d22] text-[#eadbc6]'
                      : 'bg-[#f0e4cf] text-[#4c3625]'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          <select
            value={moodTag}
            onChange={(e) => setMoodTag(e.target.value as FinanceMoodTag)}
            className={`rounded-xl border px-2.5 py-1 text-xs font-medium ${
              isNight
                ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7]'
                : 'border-[#dfc8a8] bg-white text-[#382619]'
            }`}
          >
            {MOOD_TAGS.map((m) => (
              <option key={m.id} value={m.id}>
                Cảm xúc: {m.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-4 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#316647]"
          >
            <Plus className="h-3.5 w-3.5" /> Lưu khoản
          </button>
        </div>
      </form>

      {/* Finance List for Selected Day */}
      <div
        className={`rounded-3xl border p-4 ${
          isNight
            ? 'border-[#614835] bg-[#2a1f18]/90 text-[#f6ead7]'
            : 'border-[#d8be98] bg-[#fffaf0] text-[#423022]'
        }`}
      >
        <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide opacity-75">
          Sổ chi tiêu ngày {entryDate} ({dayEntries.length})
        </h4>
        {dayEntries.length === 0 ? (
          <p className="py-4 text-center text-xs opacity-65">
            Chưa có ghi chép tài chính trong ngày.
          </p>
        ) : (
          <div className="space-y-2">
            {dayEntries.map((item) => {
              const cat = CATEGORIES.find((c) => c.id === item.category);
              const mood = MOOD_TAGS.find((m) => m.id === item.moodTag);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 ${
                    isNight
                      ? 'border-[#4d392a] bg-[#36281f]'
                      : 'border-[#eadbc4] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{cat?.emoji ?? '🧾'}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold">{item.note}</span>
                        <AuthorBadge sharing={sharing} role={item.authorRole} />
                      </div>
                      <div className="text-[10px] opacity-70">
                        {cat?.label} • {mood?.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-extrabold ${
                        item.type === 'expense'
                          ? 'text-[#c9535c]'
                          : item.type === 'saving'
                            ? 'text-[#428f56]'
                            : 'text-[#397ab5]'
                      }`}
                    >
                      {item.type === 'expense' ? '-' : '+'}
                      {formatVnd(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteFinance(item.id)}
                      aria-label="Xóa khoản tài chính"
                      className="rounded p-1 opacity-45 hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
