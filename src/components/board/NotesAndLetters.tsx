'use client';

import React, { useState } from 'react';
import {
  Check,
  Clock,
  Lock,
  Mail,
  Pencil,
  Pin,
  Plus,
  StickyNote,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { formatShortDate, toLocalDateKey } from '@/lib/date';
import { ambientEngine } from '@/lib/audio';
import { isCapsuleNote, parseCapsuleStyle } from '@/lib/capsules';
import { createUuid, isSharedDuo } from '@/lib/sharing';
import {
  checkRateLimit,
  decryptPrivateContent,
  encryptPrivateContent,
  isEncryptedContent,
  recordRateLimitFailure,
  resetRateLimit,
  sanitizeText,
  verifyJournalPin,
} from '@/lib/security';
import { AuthorBadge, WashiTape } from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  NoteItem,
  NoteKind,
  PaperStyle,
  ThemeMode,
} from '@/types/catyboard';

interface NotesAndLettersProps {
  entryDate: string;
  notes: NoteItem[];
  sharing: BoardSharingState;
  journalPin?: string;
  theme: ThemeMode;
  onAddNote: (note: NoteItem) => void;
  onUpdateNote: (id: string, patch: Partial<NoteItem>) => void;
  onDeleteNote: (id: string) => void;
  onOpenCapsuleJar?: () => void;
}

const PAPER_STYLES: { id: PaperStyle; label: string; cls: string }[] = [
  { id: 'cream-torn', label: 'Giấy kem', cls: 'paper-cream-torn' },
  { id: 'blue-lined', label: 'Kẻ dòng xanh', cls: 'paper-blue-lined' },
  { id: 'mint-card', label: 'Thẻ xanh mint', cls: 'paper-mint-card' },
  { id: 'kraft-ticket', label: 'Giấy kraft', cls: 'paper-kraft-ticket' },
];

type WaxSealId = 'none' | 'crimson' | 'gold' | 'forest' | 'plum';

const WAX_SEALS: {
  id: Exclude<WaxSealId, 'none'>;
  label: string;
  emoji: string;
  hex: string;
  ringHex: string;
}[] = [
  {
    id: 'crimson',
    label: 'Sáp Đỏ Rượu',
    emoji: '💌',
    hex: '#a62c3b',
    ringHex: '#731924',
  },
  {
    id: 'gold',
    label: 'Sáp Vàng Đồng',
    emoji: '🐾',
    hex: '#c28b2c',
    ringHex: '#825914',
  },
  {
    id: 'forest',
    label: 'Sáp Rừng Thông',
    emoji: '🌿',
    hex: '#2e6b4c',
    ringHex: '#1b4530',
  },
  {
    id: 'plum',
    label: 'Sáp Tím Đêm',
    emoji: '🌙',
    hex: '#694687',
    ringHex: '#432959',
  },
];

function parseWaxPaper(style: PaperStyle): {
  seal: (typeof WAX_SEALS)[number] | null;
  basePaper: PaperStyle;
} {
  if (!style.startsWith('wax:')) return { seal: null, basePaper: style };
  const [, sealId, base] = style.split(':');
  const found = WAX_SEALS.find((w) => w.id === sealId) ?? null;
  return { seal: found, basePaper: (base as PaperStyle) || 'blue-lined' };
}

export function NotesAndLetters({
  entryDate,
  notes,
  sharing,
  journalPin,
  theme,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onOpenCapsuleJar,
}: NotesAndLettersProps) {
  const [kind, setKind] = useState<NoteKind>('sticky');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('cream-torn');
  const [waxSeal, setWaxSeal] = useState<WaxSealId>('none');
  const [unsealedWaxIds, setUnsealedWaxIds] = useState<Record<string, boolean>>(
    {}
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [composePin, setComposePin] = useState('');
  const [composeErr, setComposeErr] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [unlockedIds, setUnlockedIds] = useState<Record<string, boolean>>({});
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [pinInput, setPinInput] = useState('');
  const [pinPromptId, setPinPromptId] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const isNight = theme === 'cozy-night';
  const today = toLocalDateKey();

  const beginEdit = (note: NoteItem) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(decryptedMap[note.id] ?? note.content);
  };

  const commitEdit = async (note: NoteItem) => {
    const cleaned = sanitizeText(editContent, 10000);
    const finalContent =
      note.isPrivate && journalPin && sessionPin
        ? await encryptPrivateContent(cleaned, sessionPin)
        : cleaned;
    if (note.isPrivate && sessionPin) {
      setDecryptedMap((prev) => ({ ...prev, [note.id]: cleaned }));
    }
    onUpdateNote(note.id, {
      title: sanitizeText(editTitle, 120) || 'Ghi chú',
      content: finalContent,
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeErr('');
    if (!content.trim() && !title.trim()) return;

    const cleanedContent = sanitizeText(content, 10000);
    let storedContent = cleanedContent;

    if (isPrivate && journalPin) {
      const pinToUse = composePin.trim() || sessionPin;
      if (!pinToUse) {
        setComposeErr('Nhập mã PIN để khóa & mã hóa (AES-256) nội dung riêng tư.');
        return;
      }
      const ok = await verifyJournalPin(pinToUse, journalPin);
      if (!ok) {
        setComposeErr('Mã PIN xác nhận chưa chính xác.');
        return;
      }
      setSessionPin(pinToUse);
      storedContent = await encryptPrivateContent(cleanedContent, pinToUse);
    }

    const now = new Date().toISOString();
    const newId = createUuid();
    if (isPrivate && storedContent !== cleanedContent) {
      setDecryptedMap((prev) => ({ ...prev, [newId]: cleanedContent }));
    }

    const finalPaperStyle: PaperStyle =
      kind === 'letter' && waxSeal !== 'none'
        ? `wax:${waxSeal}:${paperStyle}`
        : paperStyle;
    if (kind === 'letter' && waxSeal !== 'none') {
      ambientEngine.playWaxSealStamp();
    }

    onAddNote({
      id: newId,
      entryDate,
      kind,
      title:
        sanitizeText(title, 120) ||
        (kind === 'letter'
          ? 'Tâm thư hôm nay'
          : kind === 'time_capsule'
            ? 'Thư gửi tương lai'
            : 'Ghi chú nhanh'),
      content: storedContent,
      paperStyle: finalPaperStyle,
      isPrivate,
      unlockDate: kind === 'time_capsule' && unlockDate ? unlockDate : undefined,
      pinned: kind === 'sticky',
      authorRole: sharing.activeRole,
      createdAt: now,
      updatedAt: now,
    });
    setTitle('');
    setContent('');
    setComposePin('');
    setIsPrivate(false);
    setWaxSeal('none');
    setUnlockDate('');
  };

  const tryUnlockNote = async (note: NoteItem) => {
    const rate = checkRateLimit('journal_pin');
    if (!rate.allowed) {
      setPinError(`Thử sai nhiều lần — chờ ${rate.retryAfterSec}s nhé!`);
      return;
    }

    const ok = await verifyJournalPin(pinInput, journalPin);
    if (ok) {
      const plain = await decryptPrivateContent(note.content, pinInput);
      if (plain === null) {
        recordRateLimitFailure('journal_pin');
        setPinError('Mã PIN này không giải mã được nội dung.');
        return;
      }
      resetRateLimit('journal_pin');
      setSessionPin(pinInput);
      setDecryptedMap((prev) => ({ ...prev, [note.id]: plain }));
      setUnlockedIds((prev) => ({ ...prev, [note.id]: true }));
      setPinPromptId(null);
      setPinInput('');
      setPinError('');
    } else {
      const lim = recordRateLimitFailure('journal_pin');
      setPinError(
        lim.locked
          ? `Sai PIN — tạm khóa ${lim.retryAfterSec}s!`
          : 'Sai mã PIN rồi!'
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note / Tâm Thư / Time Capsule Composer */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={`rounded-3xl border-2 p-4 shadow-sm ${
          isNight
            ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
            : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setKind('sticky');
                setPaperStyle('cream-torn');
              }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
                kind === 'sticky'
                  ? 'bg-[#b57a29] text-white shadow-xs'
                  : isNight
                    ? 'bg-[#3b2d22] text-[#eadbc6] hover:bg-[#49372a]'
                    : 'bg-[#f0e4cf] text-[#4c3625] hover:bg-[#e7d7bc]'
              }`}
            >
              <StickyNote className="h-3.5 w-3.5" /> Ghi chú nhanh
            </button>
            <button
              type="button"
              onClick={() => {
                setKind('letter');
                setPaperStyle('blue-lined');
              }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
                kind === 'letter'
                  ? 'bg-[#3a75a8] text-white shadow-xs'
                  : isNight
                    ? 'bg-[#3b2d22] text-[#eadbc6] hover:bg-[#49372a]'
                    : 'bg-[#f0e4cf] text-[#4c3625] hover:bg-[#e7d7bc]'
              }`}
            >
              <Mail className="h-3.5 w-3.5" /> Tâm thư
            </button>
            <button
              type="button"
              onClick={() => {
                setKind('time_capsule');
                setPaperStyle('kraft-ticket');
              }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
                kind === 'time_capsule'
                  ? 'bg-[#3d7c57] text-white shadow-xs'
                  : isNight
                    ? 'bg-[#3b2d22] text-[#eadbc6] hover:bg-[#49372a]'
                    : 'bg-[#f0e4cf] text-[#4c3625] hover:bg-[#e7d7bc]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Thư tương lai
            </button>
          </div>

          {/* Paper style dots */}
          <div className="flex items-center gap-1.5">
            {PAPER_STYLES.map((ps) => (
              <button
                key={ps.id}
                type="button"
                onClick={() => setPaperStyle(ps.id)}
                title={ps.label}
                className={`h-5 w-5 rounded-full border ${ps.cls} ${
                  paperStyle === ps.id
                    ? 'scale-110 border-[#423022] ring-2 ring-[#9c734b]'
                    : 'border-[#bfa586]'
                }`}
              />
            ))}
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            kind === 'letter'
              ? 'Tiêu đề tâm thư (vd: Gửi bản thân tối nay...)'
              : kind === 'time_capsule'
                ? 'Tiêu đề thư hẹn ngày mở...'
                : 'Tiêu đề note (tùy chọn)'
          }
          className={`mb-2 w-full rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none ${
            isNight
              ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7] placeholder:text-[#b89f86]'
              : 'border-[#dfc8a8] bg-white text-[#423022] placeholder:text-[#9c826b]'
          }`}
        />

        <textarea
          rows={kind === 'sticky' ? 2 : 4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            kind === 'letter'
              ? 'Viết bất cứ điều gì bạn muốn giữ cho riêng mình...'
              : 'Thích note gì thì viết vào đây nhé~'
          }
          className={`w-full resize-none rounded-xl border p-3 text-xs leading-relaxed outline-none ${
            isNight
              ? 'border-[#5a4230] bg-[#3a2b20] text-[#f6ead7] placeholder:text-[#b89f86]'
              : 'border-[#dfc8a8] bg-white text-[#423022] placeholder:text-[#9c826b]'
          }`}
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="accent-[#77b3e6]"
              />
              <Lock className="h-3.5 w-3.5 opacity-75" />
              <span>
                {isSharedDuo(sharing)
                  ? 'Chỉ mình tôi thấy (riêng tư)'
                  : 'Khóa riêng tư'}
              </span>
              {journalPin && (
                <span className="rounded-full bg-[#eef7f0] px-2 py-0.5 text-[10px] font-extrabold text-[#255935]">
                  AES-256
                </span>
              )}
            </label>

            {isPrivate && journalPin && !sessionPin && (
              <input
                type="password"
                value={composePin}
                onChange={(e) => setComposePin(e.target.value)}
                placeholder="Mã PIN khóa riêng tư..."
                className="w-40 rounded-lg border border-[#caa982] bg-white px-2.5 py-1 text-xs text-[#382619] outline-none"
              />
            )}

            {kind === 'letter' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="opacity-80">Đóng dấu sáp:</span>
                <button
                  type="button"
                  onClick={() => setWaxSeal('none')}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    waxSeal === 'none'
                      ? 'bg-[#423022] text-white'
                      : 'bg-black/10 opacity-75'
                  }`}
                >
                  Mở sẵn
                </button>
                {WAX_SEALS.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    title={ws.label}
                    onClick={() => setWaxSeal(ws.id)}
                    style={{ backgroundColor: ws.hex }}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white shadow-xs transition ${
                      waxSeal === ws.id
                        ? 'scale-110 ring-2 ring-[#ffd978]'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {ws.emoji}
                  </button>
                ))}
              </div>
            )}

            {kind === 'time_capsule' && (
              <label className="inline-flex items-center gap-1.5">
                <span className="opacity-80">Ngày mở thư:</span>
                <input
                  type="date"
                  min={today}
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="rounded-lg border border-[#caa982] bg-white px-2 py-0.5 text-xs text-[#423022]"
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-4 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#316647]"
          >
            <Plus className="h-3.5 w-3.5" />
            Ghim lên bảng
          </button>
        </div>
        {composeErr && (
          <p className="mt-2 text-xs font-bold text-[#c54650]">{composeErr}</p>
        )}
      </form>

      {/* Notes Scrapbook Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {notes.map((note, idx) => {
          const waxParsed = parseWaxPaper(note.paperStyle);
          const paperCls =
            PAPER_STYLES.find((p) => p.id === waxParsed.basePaper)?.cls ??
            'paper-cream-torn';
          const isWaxSealed =
            Boolean(waxParsed.seal) && !unsealedWaxIds[note.id];
          const capsuleInfo = isCapsuleNote(note)
            ? parseCapsuleStyle(note.paperStyle)
            : null;
          const isTimeLocked =
            note.kind === 'time_capsule' &&
            Boolean(note.unlockDate) &&
            note.unlockDate! > today;
          const encrypted = isEncryptedContent(note.content);
          const isPinLocked =
            (note.isPrivate && !unlockedIds[note.id]) ||
            (encrypted && !decryptedMap[note.id]);
          const displayContent = decryptedMap[note.id] ?? note.content;

          return (
            <div
              key={note.id}
              className={`relative rounded-xl border border-[#d6c2a5] p-4 pt-5 text-[#423022] shadow-md transition hover:-translate-y-0.5 ${paperCls}`}
              style={{
                transform: `rotate(${idx % 2 === 0 ? -0.8 : 0.8}deg)`,
              }}
            >
              <WashiTape
                style={
                  note.kind === 'letter'
                    ? 'sky-gingham'
                    : note.kind === 'time_capsule'
                      ? 'mint-gingham'
                      : 'cream-dots'
                }
                className="-top-2.5 absolute left-1/2 -translate-x-1/2"
              />

              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#755b46]">
                      {capsuleInfo?.isCapsule
                        ? `Viên nang • ${capsuleInfo.prescription.shortTag}`
                        : note.kind === 'letter'
                          ? 'Tâm thư'
                          : note.kind === 'time_capsule'
                            ? `Mở ngày ${note.unlockDate ? formatShortDate(note.unlockDate) : '...'}`
                            : 'Ghi chú'}
                    </span>
                    <AuthorBadge sharing={sharing} role={note.authorRole} />
                    {capsuleInfo?.isCapsule && onOpenCapsuleJar && (
                      <button
                        type="button"
                        onClick={onOpenCapsuleJar}
                        className="rounded-full bg-[#b57a29]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#7d5216] hover:bg-[#b57a29]/25"
                      >
                        Xem trong lọ
                      </button>
                    )}
                  </div>
                  <h4 className="mt-1 text-sm font-extrabold">{note.title}</h4>
                </div>

                <div className="flex items-center gap-1">
                  {!isTimeLocked && !isPinLocked && editingId !== note.id && (
                    <button
                      type="button"
                      onClick={() => beginEdit(note)}
                      title="Chỉnh sửa nội dung"
                      className="rounded-full p-1 text-[#5e4634] opacity-65 hover:bg-black/10 hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateNote(note.id, { pinned: !note.pinned })
                    }
                    title="Ghim nổi bật"
                    className={`rounded-full p-1 transition ${
                      note.pinned
                        ? 'bg-[#f6df98] text-[#6d4b12]'
                        : 'opacity-40 hover:opacity-100'
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(note.id)}
                    aria-label="Xóa ghi chú"
                    className="rounded-full p-1 text-[#b8565d] opacity-60 hover:bg-[#fde7e9] hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isTimeLocked ? (
                <div className="rounded-xl border border-dashed border-[#b69873] bg-white/60 p-3 text-center text-xs text-[#6d533d]">
                  <Clock className="mx-auto mb-1 h-4 w-4" />
                  Phong thư đang được mèo giữ hộ đến ngày{' '}
                  <strong>{note.unlockDate}</strong> ♡
                </div>
              ) : isWaxSealed && waxParsed.seal ? (
                /* 3D Embossed Wax-Sealed Envelope */
                <button
                  type="button"
                  onClick={() => {
                    ambientEngine.playCapsulePop();
                    ambientEngine.playPaperUnfurl();
                    setUnsealedWaxIds((prev) => ({ ...prev, [note.id]: true }));
                  }}
                  className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[#d6c2a5] bg-gradient-to-b from-[#fbf4e4] to-[#f1e2c6] py-5 text-center shadow-inner transition hover:brightness-[1.02]"
                >
                  {/* Envelope flap lines */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-12 border-b border-[#dcc7a6]"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                      background: 'rgba(218, 192, 152, 0.25)',
                    }}
                  />
                  {/* 3D Wax Stamp Medallion */}
                  <span
                    style={{
                      backgroundColor: waxParsed.seal.hex,
                      borderColor: waxParsed.seal.ringHex,
                      boxShadow:
                        '0 4px 10px rgba(42,20,14,0.32), inset 0 2px 3px rgba(255,255,255,0.32)',
                    }}
                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 text-lg transition-transform duration-200 group-hover:scale-110"
                  >
                    {waxParsed.seal.emoji}
                  </span>
                  <span className="mt-2 text-[11px] font-extrabold text-[#5c4430]">
                    Mở dấu sáp
                  </span>
                </button>
              ) : isPinLocked ? (
                <div className="rounded-xl bg-white/70 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-semibold text-[#6c523c]">
                      <Lock className="h-3.5 w-3.5" />
                      {encrypted
                        ? 'Đã mã hóa bảo mật (AES-256)'
                        : 'Nội dung riêng tư đang ẩn'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!journalPin && !encrypted) {
                          setUnlockedIds((prev) => ({
                            ...prev,
                            [note.id]: true,
                          }));
                        } else if (sessionPin) {
                          void decryptPrivateContent(note.content, sessionPin).then(
                            (plain) => {
                              if (plain !== null) {
                                setDecryptedMap((prev) => ({
                                  ...prev,
                                  [note.id]: plain,
                                }));
                                setUnlockedIds((prev) => ({
                                  ...prev,
                                  [note.id]: true,
                                }));
                              } else {
                                setPinPromptId(note.id);
                                setPinError('');
                              }
                            }
                          );
                        } else {
                          setPinPromptId(note.id);
                          setPinError('');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#3a75a8] px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-[#2f6390]"
                    >
                      <Unlock className="h-3 w-3" /> Mở xem
                    </button>
                  </div>
                  {pinPromptId === note.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void tryUnlockNote(note);
                      }}
                      className="mt-2 flex flex-wrap items-center gap-1.5"
                    >
                      <input
                        type="password"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Nhập mã PIN..."
                        className="w-28 rounded-lg border border-[#cbb08c] bg-white px-2 py-1 text-xs text-[#382619]"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-[#3d7c57] px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Mở
                      </button>
                      {pinError && (
                        <span className="text-[11px] font-semibold text-[#c74952]">
                          {pinError}
                        </span>
                      )}
                    </form>
                  )}
                </div>
              ) : editingId === note.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-[#caa982] bg-white px-2.5 py-1 text-xs font-bold text-[#382619] outline-none"
                  />
                  <textarea
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full resize-none rounded-lg border border-[#caa982] bg-white p-2 text-xs leading-relaxed text-[#382619] outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#ede0cc] px-2.5 py-1 text-[11px] font-bold text-[#382619]"
                    >
                      <X className="h-3 w-3" /> Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void commitEdit(note)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#3d7c57] px-3 py-1 text-[11px] font-extrabold text-white"
                    >
                      <Check className="h-3 w-3" /> Lưu sửa
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#4f3b2b]">
                  {displayContent}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
