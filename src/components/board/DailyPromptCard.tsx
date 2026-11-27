'use client';

import React, { useEffect, useState } from 'react';
import { Check, Lock, MessageCircleHeart, Save } from 'lucide-react';
import { getDailyPrompt } from '@/lib/prompts';
import {
  getMemberHeart,
  getMemberNickname,
  HEART_BADGE_META,
  isSharedDuo,
} from '@/lib/sharing';
import type {
  BoardSharingState,
  DailyPromptAnswers,
  ThemeMode,
} from '@/types/catyboard';

interface DailyPromptCardProps {
  entryDate: string;
  sharing: BoardSharingState;
  answers?: DailyPromptAnswers;
  theme: ThemeMode;
  onSaveAnswer: (nextAnswers: DailyPromptAnswers) => void;
}

export function DailyPromptCard({
  entryDate,
  sharing,
  answers,
  theme,
  onSaveAnswer,
}: DailyPromptCardProps) {
  const isNight = theme === 'cozy-night';
  const isDuo = isSharedDuo(sharing);
  const myRole = sharing.activeRole;
  const promptText = getDailyPrompt(entryDate);

  const mySaved =
    myRole === 'owner' ? answers?.ownerAnswer || '' : answers?.partnerAnswer || '';
  const otherSaved =
    myRole === 'owner' ? answers?.partnerAnswer || '' : answers?.ownerAnswer || '';

  const [draft, setDraft] = useState(mySaved);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    setDraft(mySaved);
  }, [mySaved, entryDate, myRole]);

  const ownerNick = getMemberNickname(sharing, 'owner');
  const partnerNick = getMemberNickname(sharing, 'partner');
  const ownerHeart = HEART_BADGE_META[getMemberHeart(sharing, 'owner')];
  const partnerHeart = HEART_BADGE_META[getMemberHeart(sharing, 'partner')];
  const otherNick = myRole === 'owner' ? partnerNick : ownerNick;

  const bothAnswered = Boolean(
    answers?.ownerAnswer?.trim() && answers?.partnerAnswer?.trim()
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    const next: DailyPromptAnswers = {
      ...answers,
      ownerAnswer: myRole === 'owner' ? cleaned : answers?.ownerAnswer,
      partnerAnswer: myRole === 'partner' ? cleaned : answers?.partnerAnswer,
      updatedAt: new Date().toISOString(),
    };
    onSaveAnswer(next);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1800);
  };

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-sm ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold">
          <MessageCircleHeart className="h-4 w-4 text-[#b95567]" />
          {isDuo ? 'Câu hỏi mỗi ngày cho 2 người' : 'Câu hỏi nhỏ hôm nay'}
        </span>
        {savedFlag && (
          <span className="rounded-full bg-[#3d7c57] px-2.5 py-0.5 text-[10px] font-bold text-white">
            Đã lưu ✓
          </span>
        )}
      </div>

      <p
        className={`mb-3 text-sm font-bold leading-snug ${
          isNight ? 'text-[#ffe8be]' : 'text-[#4d331d]'
        }`}
      >
        “{promptText}”
      </p>

      {/* Answer Input */}
      <form onSubmit={handleSave} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              isDuo
                ? `Câu trả lời của ${myRole === 'owner' ? ownerNick : partnerNick}...`
                : 'Gõ vài chữ nhẹ nhàng cho hôm nay...'
            }
            className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${
              isNight
                ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
                : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
            }`}
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#b95567] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#9f4555]"
          >
            <Save className="h-3.5 w-3.5" /> Lưu
          </button>
        </div>
      </form>

      {/* Duo Blind-Reveal Panel */}
      {isDuo && (
        <div className="mt-3">
          {bothAnswered ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="paper-blue-lined rounded-2xl border border-[#bfd8ef] p-3 text-xs">
                <div className="mb-1 flex items-center gap-1 font-extrabold text-[#234d73]">
                  <span>{ownerHeart.emoji}</span>
                  <span>{ownerNick}</span>
                </div>
                <p className="leading-relaxed">{answers?.ownerAnswer}</p>
              </div>
              <div className="paper-mint-card rounded-2xl border border-[#b9dac2] p-3 text-xs">
                <div className="mb-1 flex items-center gap-1 font-extrabold text-[#225230]">
                  <span>{partnerHeart.emoji}</span>
                  <span>{partnerNick}</span>
                </div>
                <p className="leading-relaxed">{answers?.partnerAnswer}</p>
              </div>
            </div>
          ) : otherSaved.trim() ? (
            <div
              className={`flex items-center gap-2 rounded-2xl border border-dashed px-3 py-2 text-xs font-semibold ${
                isNight
                  ? 'border-[#7a5d45] bg-[#382a20] text-[#f4e8d6]'
                  : 'border-[#c8a379] bg-[#f4ead8] text-[#4b3525]'
              }`}
            >
              <Lock className="h-3.5 w-3.5 shrink-0 text-[#b95567]" />
              <span>
                <strong>{otherNick}</strong> đã trả lời rồi! Trả lời của bạn để mở khóa cùng đọc nhé ♡
              </span>
            </div>
          ) : mySaved.trim() ? (
            <div
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-xs ${
                isNight
                  ? 'bg-[#382a20] text-[#d9c5af]'
                  : 'bg-[#f4ead8] text-[#5e4634]'
              }`}
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-[#3d7c57]" />
              <span>
                Đã giữ câu trả lời của bạn! Chờ <strong>{otherNick}</strong> trả lời để cùng mở hộp nhé.
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
