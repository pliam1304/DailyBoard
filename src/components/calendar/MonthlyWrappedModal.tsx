'use client';

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Sparkles, X } from 'lucide-react';
import { formatMonthTitleVi, formatVnd } from '@/lib/date';
import { computeMonthlyWrapped } from '@/lib/prompts';
import { getMemberNickname, isSharedDuo } from '@/lib/sharing';
import {
  MOOD_META,
  PressedFlower,
  PuffyWord,
  WashiTape,
} from '@/components/decor/ScrapbookDecor';
import type {
  CatyStoreData,
  FinanceCategory,
  FinanceMoodTag,
} from '@/types/catyboard';

interface MonthlyWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  monthIndex: number;
  store: CatyStoreData;
}

const FIN_CAT_LABELS: Record<FinanceCategory, string> = {
  food: 'Ăn uống',
  coffee: 'Cà phê / Trà',
  shopping: 'Mua sắm',
  bills: 'Hóa đơn',
  salary: 'Thu nhập',
  saving: 'Tiết kiệm',
  other: 'Khác',
};

const FIN_TAG_LABELS: Record<FinanceMoodTag, string> = {
  essential: 'Cần thiết',
  treat: 'Tự thưởng',
  impulse: 'Ngẫu hứng',
  proud: 'Rất đáng tiền',
  gift: 'Quà tặng',
};

export function MonthlyWrappedModal({
  isOpen,
  onClose,
  year,
  monthIndex,
  store,
}: MonthlyWrappedModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const yearMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const stats = computeMonthlyWrapped(store, yearMonth);
  const isDuo = isSharedDuo(store.sharing);
  const ownerNick = getMemberNickname(store.sharing, 'owner');
  const partnerNick = getMemberNickname(store.sharing, 'partner');

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${store.profile.boardTitle.toLowerCase()}-wrapped-${yearMonth}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-3xl rounded-3xl border-2 border-[#b98d61] bg-[#fbf5e9] p-4 text-[#382619] shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-extrabold">
              <Sparkles className="h-4 w-4 text-[#b57a29]" />
              Gói Kỷ Niệm {formatMonthTitleVi(year, monthIndex)}
            </h2>
            <p className="text-xs text-[#6b5340]">
              Tổng hợp ảnh Polaroid, chi tiêu theo cảm xúc và chiến tích cả tháng
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadPoster}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#4a3425] px-4 py-1.5 text-xs font-extrabold text-[#fdf7ed] shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Đang xuất...' : 'Tải Poster PNG'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#ede0cc] p-2 hover:bg-[#e1d0b6]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Exportable Monthly Scrapbook Poster */}
        <div className="overflow-x-auto py-1">
          <div
            ref={posterRef}
            className="corkboard-surface relative mx-auto w-full max-w-[660px] rounded-3xl border-[6px] border-[#b68655] p-5 text-[#382619]"
          >
            <PressedFlower className="absolute right-4 top-4 opacity-90" />

            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#5c3e24]">
                  MONTHLY WRAPPED • {formatMonthTitleVi(year, monthIndex)}
                </div>
                <div className="mt-1">
                  <PuffyWord text={store.profile.boardTitle.toUpperCase()} />
                </div>
                {isDuo && (
                  <div className="mt-1 text-xs font-extrabold text-[#4a321f]">
                    {ownerNick} & {partnerNick} ♡
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-[#fbf5e9] px-3 py-2 text-right text-xs font-bold shadow-xs">
                <div>🗓️ {stats.activeDays} ngày có kỷ niệm</div>
                <div className="text-[11px] text-[#6b5340]">
                  {stats.topMood
                    ? `Mood chủ đạo: ${MOOD_META[stats.topMood.mood].emoji} ${MOOD_META[stats.topMood.mood].label}`
                    : 'Một tháng bình yên'}
                </div>
              </div>
            </div>

            {/* Key Stats Cards */}
            <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="paper-cream-torn rounded-2xl border border-[#dfcba9] p-3 text-center shadow-xs">
                <div className="text-[10px] font-bold uppercase opacity-75">Ảnh Polaroid</div>
                <div className="mt-0.5 text-lg font-extrabold">{stats.photos.length}</div>
              </div>
              <div className="paper-mint-card rounded-2xl border border-[#bad8c1] p-3 text-center shadow-xs">
                <div className="text-[10px] font-bold uppercase opacity-75">Việc đã xong</div>
                <div className="mt-0.5 text-lg font-extrabold">{stats.totalDoneReminders}</div>
              </div>
              <div className="paper-kraft-ticket rounded-2xl border border-[#cfb48e] p-3 text-center shadow-xs">
                <div className="text-[10px] font-bold uppercase opacity-75">Tổng chi</div>
                <div className="mt-0.5 truncate text-sm font-extrabold text-[#a83842]">
                  {formatVnd(stats.totalExpense)}
                </div>
              </div>
              <div className="paper-blue-lined rounded-2xl border border-[#bdd6ec] p-3 text-center shadow-xs">
                <div className="text-[10px] font-bold uppercase opacity-75">Tiết kiệm</div>
                <div className="mt-0.5 truncate text-sm font-extrabold text-[#2b6f40]">
                  {formatVnd(stats.totalSaving)}
                </div>
              </div>
            </div>

            {/* Emotion-Spending Insight Card */}
            <div className="paper-cream-torn relative mb-4 rounded-2xl border border-[#dfcba9] p-3.5 text-xs shadow-sm">
              <WashiTape
                style="mint-gingham"
                className="-top-2.5 absolute right-5 rotate-3"
              />
              <div className="font-extrabold text-[#4a321f]">
                💡 Góc nhìn Tài chính & Cảm xúc tháng này:
              </div>
              <p className="mt-1 leading-relaxed text-[#4f3a29]">
                {stats.topExpenseCategory ? (
                  <>
                    Bạn chi nhiều nhất cho nhóm{' '}
                    <strong>{FIN_CAT_LABELS[stats.topExpenseCategory.category]}</strong> (
                    {formatVnd(stats.topExpenseCategory.amount)})
                    {stats.topMoodTag ? (
                      <>
                        , phần lớn với cảm xúc{' '}
                        <strong>
                          “{FIN_TAG_LABELS[stats.topMoodTag.tag]}” ({stats.topMoodTag.percent}%)
                        </strong>
                        .
                      </>
                    ) : (
                      '.'
                    )}
                  </>
                ) : (
                  'Tháng này chưa ghi nhận khoản chi tiêu nào — thật tiết kiệm cùng chú mèo!'
                )}
              </p>
            </div>

            {/* Polaroid Collage Grid */}
            <div>
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#4e341f]">
                📸 Album Polaroid của tháng ({stats.photos.length})
              </div>
              {stats.photos.length === 0 ? (
                <div className="rounded-2xl bg-[#fbf5e9]/85 p-6 text-center text-xs text-[#6b5340]">
                  Chụp thêm vài tấm Polaroid trong tháng này để ghép thành bảng collage kỷ niệm nhé!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stats.photos.slice(0, 6).map((p, idx) => (
                    <div
                      key={p.id}
                      className="polaroid-card rounded-sm p-2 pb-3"
                      style={{
                        transform: `rotate(${idx % 2 === 0 ? -1.8 : 1.8}deg)`,
                      }}
                    >
                      <img
                        src={p.dataUrl}
                        alt={p.caption}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <p className="mt-1.5 truncate text-center text-[10px] font-bold text-[#382619]">
                        {p.caption}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
