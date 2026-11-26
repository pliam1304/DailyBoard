'use client';

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Eye, EyeOff, ReceiptText, Sparkles, X } from 'lucide-react';
import { formatDisplayDateVi, formatVnd } from '@/lib/date';
import {
  getMemberNickname,
  isSharedDuo,
} from '@/lib/sharing';
import {
  AuthorBadge,
  MOOD_META,
  PressedFlower,
  PuffyHeartSticker,
  PuffyWord,
  WashiTape,
  WEATHER_META,
} from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  BoardStickerId,
  DayEntry,
  DayPhoto,
  FinanceEntry,
  NoteItem,
  ReminderItem,
  SnapshotLayout,
  UserProfile,
} from '@/types/catyboard';

const STICKER_CHOICES: { id: BoardStickerId; label: string; icon: string }[] = [
  { id: 'daisy', label: 'Hoa cúc', icon: '🌼' },
  { id: 'ribbon', label: 'Nơ xanh', icon: '🎀' },
  { id: 'paw', label: 'Dấu chân mèo', icon: '🐾' },
  { id: 'sky-heart', label: 'Tim xanh', icon: '💙' },
  { id: 'sage-heart', label: 'Tim mint', icon: '💚' },
  { id: 'sparkle', label: 'Lấp lánh', icon: '✨' },
];

interface DailySnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryDate: string;
  profile: UserProfile;
  sharing: BoardSharingState;
  dayEntry: DayEntry;
  photos: DayPhoto[];
  notes: NoteItem[];
  reminders: ReminderItem[];
  finance: FinanceEntry[];
  onUpdateQuote: (quote: string) => void;
  onUpdateStickers: (stickers: BoardStickerId[]) => void;
}

export function DailySnapshotModal({
  isOpen,
  onClose,
  entryDate,
  profile,
  sharing,
  dayEntry,
  photos,
  notes,
  reminders,
  finance,
  onUpdateQuote,
  onUpdateStickers,
}: DailySnapshotModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<SnapshotLayout>('scrapbook');
  const [includePrivate, setIncludePrivate] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const isDuo = isSharedDuo(sharing);
  const ownerNick = getMemberNickname(sharing, 'owner');
  const partnerNick = getMemberNickname(sharing, 'partner');

  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];
  const partnerSecondPhoto =
    isDuo && photos.length >= 2
      ? photos.find((p) => p.id !== coverPhoto?.id && p.authorRole !== coverPhoto?.authorRole) ??
        photos.find((p) => p.id !== coverPhoto?.id)
      : undefined;

  const activeStickers: BoardStickerId[] = dayEntry.stickers ?? [
    'daisy',
    'sky-heart',
    'sage-heart',
    'paw',
  ];

  const toggleSticker = (id: BoardStickerId) => {
    const next = activeStickers.includes(id)
      ? activeStickers.filter((s) => s !== id)
      : [...activeStickers, id];
    onUpdateStickers(next);
  };
  const doneReminders = reminders.filter((r) => r.completed);
  const totalExpense = finance
    .filter((f) => f.type === 'expense')
    .reduce((acc, f) => acc + f.amount, 0);
  const totalSaving = finance
    .filter((f) => f.type === 'saving')
    .reduce((acc, f) => acc + f.amount, 0);
  const totalIncome = finance
    .filter((f) => f.type === 'income')
    .reduce((acc, f) => acc + f.amount, 0);

  const publicNotes = notes.filter(
    (n) => n.kind !== 'time_capsule' && (includePrivate || !n.isPrivate)
  );
  const featuredLetter =
    publicNotes.find((n) => n.kind === 'letter') ?? publicNotes[0];

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${profile.boardTitle.toLowerCase()}-${entryDate}-${layout}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-3xl rounded-3xl border-2 border-[#c89d6d] bg-[#faf3e3] p-4 text-[#423022] shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold">
              📸 Chụp Ảnh Báo Cáo Hằng Ngày
            </h2>
            <p className="text-xs text-[#755b46]">
              Tổng hợp ảnh Polaroid, tài chính, tâm thư & lời nhắc đã làm thành 1 bức ảnh kỷ niệm
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#efe2cc] p-2 hover:bg-[#e4d2b6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#dfcba9] bg-white/80 p-2.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setLayout('scrapbook')}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                layout === 'scrapbook'
                  ? 'bg-[#3a75a8] text-white'
                  : 'bg-[#f0e4cf] text-[#4c3625]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Bảng Ghim Polaroid
            </button>
            <button
              type="button"
              onClick={() => setLayout('receipt')}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                layout === 'receipt'
                  ? 'bg-[#3d7c57] text-white'
                  : 'bg-[#f0e4cf] text-[#4c3625]'
              }`}
            >
              <ReceiptText className="h-3.5 w-3.5" /> Hóa Đơn Quán Mèo
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIncludePrivate((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#f4ebda] px-3 py-1.5 text-xs font-bold text-[#5e4632] hover:bg-[#eadbc2]"
            >
              {includePrivate ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              {includePrivate ? 'Đang hiện tâm thư ẩn' : 'Đang ẩn tâm thư riêng tư'}
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#423022] px-4 py-1.5 text-xs font-extrabold text-[#faf3e3] shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Đang xuất ảnh...' : 'Tải ảnh PNG'}
            </button>
          </div>
        </div>

        {/* Editable Daily Quote + Sticker Picker before capture */}
        <div className="mb-4 space-y-2">
          <input
            type="text"
            value={dayEntry.dailyQuote ?? ''}
            onChange={(e) => onUpdateQuote(e.target.value)}
            placeholder="Viết 1 câu tóm tắt ngắn cho ngày hôm nay (in lên báo cáo)..."
            className="w-full rounded-xl border border-[#dfcba9] bg-white px-3 py-2 text-xs text-[#382619] outline-none"
          />
          {layout === 'scrapbook' && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-bold text-[#6b5340]">Sticker trang trí:</span>
              {STICKER_CHOICES.map((st) => {
                const enabled = activeStickers.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleSticker(st.id)}
                    className={`rounded-full px-2.5 py-0.5 font-bold transition ${
                      enabled
                        ? 'bg-[#b57a29] text-white'
                        : 'bg-[#efe4d1] text-[#5c4430]'
                    }`}
                  >
                    {st.icon} {st.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Exportable Canvas Preview */}
        <div className="flex justify-center overflow-x-auto py-1">
          {layout === 'scrapbook' ? (
            <div
              ref={cardRef}
              className="corkboard-surface relative w-full max-w-[640px] rounded-3xl border-[6px] border-[#b78452] p-5 text-[#423022]"
            >
              {/* Decorative customizable stickers mirroring reference photo */}
              {activeStickers.includes('sky-heart') && (
                <PuffyHeartSticker color="sky" size={24} className="absolute left-5 top-4" />
              )}
              {activeStickers.includes('sage-heart') && (
                <PuffyHeartSticker color="sage" size={20} className="absolute left-12 top-9" />
              )}
              {activeStickers.includes('daisy') && (
                <PressedFlower className="absolute bottom-4 left-4 opacity-90" />
              )}
              {activeStickers.includes('ribbon') && (
                <span className="pointer-events-none absolute right-6 bottom-12 text-2xl drop-shadow-sm">
                  🎀
                </span>
              )}
              {activeStickers.includes('sparkle') && (
                <span className="pointer-events-none absolute right-24 top-4 text-lg">
                  ✨
                </span>
              )}

              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pl-10">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#5d422a]">
                    {formatDisplayDateVi(entryDate)}
                  </div>
                  <div className="mt-1">
                    <PuffyWord text={profile.boardTitle.toUpperCase()} />
                  </div>
                </div>

                <div className="rounded-2xl bg-[#fffaf0]/90 px-3 py-1.5 text-right text-xs font-bold shadow-xs">
                  <div>
                    {MOOD_META[dayEntry.mood].emoji} {MOOD_META[dayEntry.mood].label}
                  </div>
                  <div className="text-[11px] text-[#755b46]">
                    {WEATHER_META[dayEntry.weather].emoji}{' '}
                    {WEATHER_META[dayEntry.weather].label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Left Polaroid Column (Dual overlapping Polaroids when 2 people snapped!) */}
                <div className="relative flex flex-col items-center sm:col-span-6">
                  {coverPhoto && partnerSecondPhoto ? (
                    <div className="relative flex w-full max-w-[275px] flex-col items-center pb-4">
                      <div className="relative w-[84%] self-start -rotate-3">
                        <WashiTape
                          style={coverPhoto.washiStyle}
                          className="-top-2.5 absolute left-1/2 z-10 -translate-x-1/2"
                        />
                        <div className="polaroid-card rounded-sm p-2 pb-3">
                          <img
                            src={coverPhoto.dataUrl}
                            alt={coverPhoto.caption}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <p className="mt-1.5 truncate text-center text-[11px] font-bold text-[#382619]">
                            {coverPhoto.caption}
                          </p>
                        </div>
                      </div>
                      <div className="relative -mt-10 w-[80%] self-end rotate-3">
                        <WashiTape
                          style={partnerSecondPhoto.washiStyle}
                          className="-top-2.5 absolute left-1/2 z-10 -translate-x-1/2"
                        />
                        <div className="polaroid-card rounded-sm p-2 pb-3">
                          <img
                            src={partnerSecondPhoto.dataUrl}
                            alt={partnerSecondPhoto.caption}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <p className="mt-1.5 truncate text-center text-[11px] font-bold text-[#382619]">
                            {partnerSecondPhoto.caption}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : coverPhoto ? (
                    <div className="relative w-full max-w-[260px] -rotate-2">
                      <WashiTape
                        style={coverPhoto.washiStyle}
                        className="-top-2.5 absolute left-1/2 z-10 -translate-x-1/2"
                      />
                      <div className="polaroid-card rounded-sm p-2.5 pb-4">
                        <img
                          src={coverPhoto.dataUrl}
                          alt={coverPhoto.caption}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <p className="mt-2 text-center text-xs font-bold text-[#423022]">
                          {coverPhoto.caption}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="polaroid-card flex aspect-[4/3] w-full max-w-[260px] flex-col items-center justify-center rounded-sm p-4 text-center text-xs text-[#755b46]">
                      <span className="text-2xl">🐾</span>
                      <p className="mt-1 font-semibold">
                        Hôm nay giữ lại bằng con chữ ♡
                      </p>
                    </div>
                  )}

                  {/* Torn Note Card for Quote */}
                  <div className="paper-cream-torn relative mt-4 w-full rounded-xl border border-[#dfcba9] p-3 shadow-sm">
                    <WashiTape
                      style="sky-gingham"
                      className="-top-2.5 absolute right-4 rotate-6"
                    />
                    <p className="text-[11px] font-bold uppercase text-[#7b5f47]">
                      {isDuo
                        ? `${ownerNick} & ${partnerNick} • Always with you ♡`
                        : `Always with ${profile.catName} ♡`}
                    </p>
                    <p className="mt-1 text-xs font-medium italic leading-relaxed">
                      “{dayEntry.dailyQuote || 'Một ngày nhẹ nhàng bên góc bàn lofi.'}”
                    </p>
                  </div>
                </div>

                {/* Right Summary Column */}
                <div className="space-y-3 sm:col-span-6">
                  {/* Done Reminders */}
                  <div className="paper-mint-card rounded-2xl border border-[#bedac4] p-3 shadow-sm">
                    <div className="mb-1.5 text-[11px] font-extrabold uppercase text-[#255432]">
                      🐾 Lời nhắc đã làm ({doneReminders.length})
                    </div>
                    {doneReminders.length === 0 ? (
                      <p className="text-[11px] opacity-70">
                        Hôm nay nghỉ ngơi thật chill~
                      </p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {doneReminders.slice(0, 4).map((r) => (
                          <li key={r.id} className="truncate font-medium">
                            ✓ {r.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Finance Snapshot */}
                  <div className="paper-kraft-ticket rounded-2xl border border-[#cfb48e] p-3 shadow-sm">
                    <div className="mb-1 text-[11px] font-extrabold uppercase text-[#66492b]">
                      💰 Tài chính trong ngày
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                      <div className="rounded-lg bg-white/70 p-1.5">
                        <div className="opacity-70">Chi</div>
                        <div className="font-extrabold text-[#be4953]">
                          {formatVnd(totalExpense)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/70 p-1.5">
                        <div className="opacity-70">Tiết kiệm</div>
                        <div className="font-extrabold text-[#38864d]">
                          {formatVnd(totalSaving)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/70 p-1.5">
                        <div className="opacity-70">Thu</div>
                        <div className="font-extrabold text-[#2f71ad]">
                          {formatVnd(totalIncome)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tâm Thư Excerpt */}
                  {featuredLetter && (
                    <div className="paper-blue-lined rounded-2xl border border-[#bfd8ef] p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#2c5c88]">
                        <span>💌 {featuredLetter.title}</span>
                        <AuthorBadge
                          sharing={sharing}
                          role={featuredLetter.authorRole}
                        />
                      </div>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed">
                        {featuredLetter.content}
                      </p>
                    </div>
                  )}

                  {/* Song of the day + Doodle cat */}
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#fffaf0]/90 px-3 py-2 text-xs shadow-sm">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase opacity-65">
                        ♪ Bản nhạc hôm nay
                      </div>
                      <div className="truncate font-bold">
                        {dayEntry.songTitle || 'Tiếng mưa & Mèo gừ Lofi'}
                      </div>
                    </div>
                    <span className="shrink-0 text-lg">^•ﻌ•^</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Lofi Receipt Layout */
            <div
              ref={cardRef}
              className="w-full max-w-[380px] rounded-lg border border-[#d6cbb8] bg-[#fffdf7] p-6 font-mono text-xs text-[#36281e] shadow-md"
            >
              <div className="border-b-2 border-dashed border-[#bfa98c] pb-3 text-center">
                <div className="text-base font-extrabold tracking-widest">
                  ☕ {profile.boardTitle.toUpperCase()} CAFE
                </div>
                <div className="mt-0.5 text-[11px] opacity-75">
                  DAILY REPORT • {entryDate}
                </div>
                <div className="mt-2 text-sm">
                  /\_/\  ( {MOOD_META[dayEntry.mood].emoji}{' '}
                  {MOOD_META[dayEntry.mood].label} )
                </div>
                <div className="text-[11px] opacity-70">
                  {isDuo
                    ? `${ownerNick} & ${partnerNick} • ${profile.catName} & ${profile.partnerCatName}`
                    : `Companion: ${profile.catName} • ${WEATHER_META[dayEntry.weather].label}`}
                </div>
              </div>

              <div className="space-y-3 border-b-2 border-dashed border-[#bfa98c] py-3">
                <div>
                  <div className="mb-1 font-bold">[VIỆC ĐÃ HOÀN THÀNH]</div>
                  {doneReminders.length === 0 ? (
                    <div className="opacity-65">- Nghỉ ngơi nạp năng lượng</div>
                  ) : (
                    doneReminders.map((r) => (
                      <div key={r.id} className="flex justify-between gap-2">
                        <span className="truncate">✓ {r.title}</span>
                        <span>OK</span>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div className="mb-1 font-bold">[TÀI CHÍNH TRONG NGÀY]</div>
                  <div className="flex justify-between">
                    <span>Chi tiêu:</span>
                    <span>-{formatVnd(totalExpense)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiết kiệm:</span>
                    <span>+{formatVnd(totalSaving)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thu nhập:</span>
                    <span>+{formatVnd(totalIncome)}</span>
                  </div>
                </div>

                {featuredLetter && (
                  <div>
                    <div className="mb-1 font-bold">[TÂM THƯ / GHI CHÚ]</div>
                    <p className="line-clamp-4 leading-relaxed opacity-85">
                      “{featuredLetter.content}”
                    </p>
                  </div>
                )}

                <div>
                  <div className="mb-1 font-bold">[NHẠC HÔM NAY]</div>
                  <div className="truncate">
                    ♪ {dayEntry.songTitle || 'Lofi Rain & Cat Purr'}
                  </div>
                </div>
              </div>

              {coverPhoto && (
                <div className="border-b-2 border-dashed border-[#bfa98c] py-3 text-center">
                  <img
                    src={coverPhoto.dataUrl}
                    alt={coverPhoto.caption}
                    className="mx-auto aspect-[4/3] w-48 rounded-xs object-cover"
                  />
                  <div className="mt-1 text-[10px] opacity-75">
                    {coverPhoto.caption}
                  </div>
                </div>
              )}

              <div className="pt-3 text-center">
                <div className="text-[11px] font-bold">
                  THANK YOU FOR TODAY 🐾
                </div>
                <div className="mt-1 tracking-[0.25em] opacity-45">
                  |||| || |||| ||| ||||
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
