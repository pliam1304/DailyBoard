'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Heart,
  Link2,
  LogIn,
  Mail,
  RefreshCw,
  Send,
  Share2,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  buildInviteUrl,
  DEFAULT_OWNER_NICKNAME,
  DEFAULT_PARTNER_NICKNAME,
  extractInviteCodeFromInput,
  getMemberByRole,
  HEART_BADGE_META,
  isOpenInviteEmail,
  isSharedDuo,
} from '@/lib/sharing';
import { sanitizeText, validateEmail } from '@/lib/security';
import type {
  BoardSharingState,
  HeartColor,
  MemberRole,
} from '@/types/catyboard';

interface SharedBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharing: BoardSharingState;
  catName: string;
  partnerCatName: string;
  isCloudSignedIn: boolean;
  onlineCount: number;
  onInviteByEmail: (
    email: string,
    ownerNickname: string,
    partnerNickname: string
  ) => Promise<void>;
  onJoinByCode: (codeOrLink: string) => Promise<void>;
  onRevokeInvite?: () => Promise<void>;
  onRenameMember: (
    role: MemberRole,
    nickname: string,
    heartColor: HeartColor
  ) => void;
  onUpdateCatNames: (catName: string, partnerCatName: string) => void;
  onSwitchLocalRole: (role: MemberRole) => void;
  onRevertToSolo: () => Promise<void>;
}

const HEART_COLORS: HeartColor[] = ['sky', 'sage', 'blush', 'cream'];

export function SharedBoardModal({
  isOpen,
  onClose,
  sharing,
  catName,
  partnerCatName,
  isCloudSignedIn,
  onlineCount,
  onInviteByEmail,
  onJoinByCode,
  onRevokeInvite,
  onRenameMember,
  onUpdateCatNames,
  onSwitchLocalRole,
  onRevertToSolo,
}: SharedBoardModalProps) {
  const owner = getMemberByRole(sharing, 'owner');
  const partner = getMemberByRole(sharing, 'partner');
  const isDuo = isSharedDuo(sharing);
  const hasPendingInvite = Boolean(
    sharing.pendingInvite && sharing.pendingInvite.status === 'pending'
  );

  const [inviteEmail, setInviteEmail] = useState(() =>
    isOpenInviteEmail(sharing.pendingInvite?.inviteeEmail)
      ? ''
      : sharing.pendingInvite?.inviteeEmail || ''
  );
  const [ownerNick, setOwnerNick] = useState(
    owner?.nickname || DEFAULT_OWNER_NICKNAME
  );
  const [ownerColor, setOwnerColor] = useState<HeartColor>(
    owner?.heartColor || 'sky'
  );
  const [partnerNick, setPartnerNick] = useState(
    partner?.nickname ||
      sharing.pendingInvite?.inviteeNickname ||
      DEFAULT_PARTNER_NICKNAME
  );
  const [partnerColor, setPartnerColor] = useState<HeartColor>(
    partner?.heartColor || 'sage'
  );
  const [cat1, setCat1] = useState(catName);
  const [cat2, setCat2] = useState(partnerCatName);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [joinBusy, setJoinBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [joinErrorMsg, setJoinErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const activeInvite = hasPendingInvite ? sharing.pendingInvite : null;
  const inviteIsOpenLink = isOpenInviteEmail(activeInvite?.inviteeEmail);

  const inviteUrl =
    activeInvite && typeof window !== 'undefined'
      ? buildInviteUrl(window.location.origin, activeInvite.inviteCode)
      : '';

  const mailtoHref =
    activeInvite && !inviteIsOpenLink
      ? `mailto:${encodeURIComponent(
          activeInvite.inviteeEmail
        )}?subject=${encodeURIComponent(
          `${ownerNick} mời bạn dùng chung bảng Nhật Kí`
        )}&body=${encodeURIComponent(
          `Chào ${partnerNick},\n\nMình vừa tạo link mời bạn vào bảng kỷ niệm chung để cùng lưu ảnh Polaroid, ghi chú, nhắc việc và nghe nhạc Lofi.\n\nMở link này rồi đăng nhập hoặc tạo tài khoản để vào bảng chung nhé:\n${inviteUrl}\n\nMã mời: ${activeInvite.inviteCode}`
        )}`
      : '';

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (trimmedEmail && !validateEmail(trimmedEmail)) {
      setErrorMsg('Địa chỉ email chưa đúng định dạng (hoặc để trống để tạo link mở).');
      return;
    }
    setBusy(true);
    try {
      await onInviteByEmail(
        trimmedEmail,
        sanitizeText(ownerNick, 40) || DEFAULT_OWNER_NICKNAME,
        sanitizeText(partnerNick, 40) || DEFAULT_PARTNER_NICKNAME
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tạo đường link mời.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinErrorMsg('');
    const code = extractInviteCodeFromInput(joinCodeInput);
    if (!code || code.length < 4) {
      setJoinErrorMsg('Hãy dán đường link mời hoặc nhập mã mời (ví dụ: DIARY-...).');
      return;
    }
    setJoinBusy(true);
    try {
      await onJoinByCode(code);
      setJoinCodeInput('');
      onClose();
    } catch (err) {
      setJoinErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể tham gia bảng chung. Hãy kiểm tra lại mã mời.'
      );
    } finally {
      setJoinBusy(false);
    }
  };

  const handleSaveNicknames = () => {
    onRenameMember('owner', sanitizeText(ownerNick, 40), ownerColor);
    if (isDuo) {
      onRenameMember('partner', sanitizeText(partnerNick, 40), partnerColor);
    }
    onUpdateCatNames(
      sanitizeText(cat1, 30) || 'Mochi',
      sanitizeText(cat2, 30) || 'Latte'
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!activeInvite?.inviteCode) return;
    await navigator.clipboard.writeText(activeInvite.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShareLink = async () => {
    if (!inviteUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${ownerNick} mời bạn vào bảng chung Nhật Kí`,
          text: `Bấm vào link để tham gia bảng kỷ niệm chung cùng ${ownerNick}:`,
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled share sheet
      }
    }
    await handleCopyLink();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-xl rounded-3xl border-2 border-[#c89d6d] bg-[#faf3e3] p-5 text-[#423022] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f3d4d8] text-[#8a3542]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {isDuo
                  ? `${owner?.nickname || 'Him'} & ${partner?.nickname || 'Her'}`
                  : 'Bảng chung 2 người'}
              </h2>
              <p className="text-xs text-[#755b46]">
                {isDuo
                  ? 'Đã kết nối bảng chung'
                  : 'Mời người thứ 2 bằng đường link hoặc nhập mã tham gia'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#efe2cc] p-2 hover:bg-[#e4d2b6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          {!isCloudSignedIn && (
            <div className="rounded-2xl border border-[#dfc088] bg-[#fff6df] p-3 text-xs text-[#694814]">
              Tài khoản này đang chạy ở chế độ ngoại tuyến trên thiết bị. Để gửi link mời sang điện thoại/máy tính của người thứ 2, hãy đăng nhập tài khoản đồng bộ trực tuyến.
            </div>
          )}

          {/* ACTIVE SHARE LINK BOX — Shown whenever a pending invite exists (NEVER hidden while waiting for partner!) */}
          {activeInvite && !isDuo && (
            <div className="space-y-2.5 rounded-2xl border-2 border-[#8fc2ea] bg-[#eef7fe] p-4 text-xs text-[#194063]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-extrabold">
                  <Link2 className="h-4 w-4 text-[#2e6da4]" />
                  {inviteIsOpenLink
                    ? 'Link mời đang mở (gửi cho người thứ 2)'
                    : `Link mời dành cho ${activeInvite.inviteeEmail}`}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-[#2e6da4]">
                  Mã: {activeInvite.inviteCode}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-[#2c5478]">
                Gửi link dưới đây cho <strong>{activeInvite.inviteeNickname}</strong>. Khi người ấy mở link và đăng nhập hoặc tạo tài khoản mới, cả 2 sẽ vào chung bảng này ngay lập tức.
              </p>

              <div className="rounded-xl border border-[#c5dff4] bg-white px-3 py-2 font-mono text-[11px] font-bold break-all text-[#194063]">
                {inviteUrl || activeInvite.inviteCode}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#3a75a8] px-3.5 py-1.5 font-extrabold text-white shadow-2xs hover:bg-[#2f6390]"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Đã chép link
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Sao chép link
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleNativeShareLink()}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-3 py-1.5 font-extrabold text-white shadow-2xs hover:bg-[#316647]"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Chia sẻ
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyCode()}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#bcd8ef] bg-white px-3 py-1.5 font-bold text-[#1d456b] hover:bg-[#f5faff]"
                  >
                    {copiedCode ? 'Đã chép mã ✓' : 'Chép mã rời'}
                  </button>

                  {mailtoHref && (
                    <a
                      href={mailtoHref}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#bcd8ef] bg-white px-3 py-1.5 font-bold text-[#1d456b] hover:bg-[#f5faff]"
                    >
                      <Send className="h-3.5 w-3.5" /> Gửi mail
                    </a>
                  )}
                </div>

                {onRevokeInvite && (
                  <button
                    type="button"
                    onClick={() => void onRevokeInvite()}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[#9b3440] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Thu hồi
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SOLO MODE: 1) Create Invite Link + 2) Join Existing Shared Board by Code/Link */}
          {!isDuo && (
            <>
              <form
                onSubmit={handleInviteSubmit}
                className="space-y-3 rounded-2xl border border-[#dfcba9] bg-white/85 p-4"
              >
                <div className="text-xs font-extrabold uppercase tracking-wide text-[#6b513b]">
                  {activeInvite ? 'Tạo lại link mời mới' : 'Tạo link mời người thứ 2'}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="font-bold">Tên gọi của bạn</span>
                    <input
                      type="text"
                      value={ownerNick}
                      onChange={(e) => setOwnerNick(e.target.value)}
                      placeholder="Him"
                      className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5 outline-none"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="font-bold">Tên gọi người ấy</span>
                    <input
                      type="text"
                      value={partnerNick}
                      onChange={(e) => setPartnerNick(e.target.value)}
                      placeholder="Her"
                      className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5 outline-none"
                    />
                  </label>
                </div>

                <label className="block text-xs">
                  <span className="font-bold">
                    Email người nhận <span className="font-normal opacity-70">(tùy chọn — để trống nếu muốn gửi bằng link nhanh)</span>
                  </span>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 opacity-50" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Để trống để tạo link mở, hoặc nhập email cố định..."
                      className="w-full rounded-xl border border-[#d6c09d] bg-white py-2 pl-9 pr-3 text-xs outline-none"
                    />
                  </div>
                </label>

                {errorMsg && (
                  <p className="rounded-xl bg-[#fde8ea] px-3 py-2 text-xs font-bold text-[#a6343e]">
                    {errorMsg}
                  </p>
                )}

                <div className="flex justify-end pt-0.5">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#3a75a8] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#2f6390] disabled:opacity-50"
                  >
                    {activeInvite ? (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {busy
                      ? 'Đang tạo link...'
                      : activeInvite
                        ? 'Đổi mã & tạo link mới'
                        : 'Tạo link mời'}
                  </button>
                </div>
              </form>

              {/* Direct Join Box (Solves iOS PWA standalone & copy-paste code joining!) */}
              <form
                onSubmit={handleJoinSubmit}
                className="space-y-2.5 rounded-2xl border border-[#dfcba9] bg-white/85 p-4"
              >
                <div className="text-xs font-extrabold uppercase tracking-wide text-[#245534]">
                  Tham gia bảng của người khác
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value);
                      setJoinErrorMsg('');
                    }}
                    placeholder="Dán link mời hoặc nhập mã (vd: DIARY-AB12CD34)..."
                    className="flex-1 rounded-xl border border-[#d6c09d] bg-white px-3 py-2 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={joinBusy}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#3d7c57] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#316647] disabled:opacity-50"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {joinBusy ? 'Đang vào...' : 'Tham gia'}
                  </button>
                </div>
                {joinErrorMsg && (
                  <p className="rounded-xl bg-[#fde8ea] px-3 py-2 text-xs font-bold text-[#a6343e]">
                    {joinErrorMsg}
                  </p>
                )}
              </form>
            </>
          )}

          {/* DUO MODE: Mutual Nicknames, Hearts, Cats & Leave Option */}
          {isDuo && (
            <>
              {isCloudSignedIn && (
                <div className="flex items-center justify-between rounded-2xl bg-[#e7f5eb] px-3.5 py-2.5 text-xs text-[#225831]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#39a659]" />
                    {onlineCount >= 2
                      ? 'Cả 2 đang cùng trực tuyến'
                      : 'Đã kết nối đồng bộ bảng chung'}
                  </span>
                  <Heart className="h-4 w-4 text-[#e07a88]" />
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-[#dfcba9] bg-white/85 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[#6b513b]">
                    Biệt danh & Mèo
                  </span>
                  {savedNotice && (
                    <span className="text-[11px] font-bold text-[#3b8d52]">
                      Đã lưu ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Owner Card */}
                  <div className="space-y-2 rounded-2xl border border-[#e3d2b8] bg-[#fffaf0] p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold opacity-75">
                      <span>Người 1 (Chủ bảng)</span>
                      <span>{HEART_BADGE_META[ownerColor].emoji}</span>
                    </div>
                    <input
                      type="text"
                      value={ownerNick}
                      onChange={(e) => setOwnerNick(e.target.value)}
                      placeholder="Him"
                      className="w-full rounded-xl border border-[#d6c09d] bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={cat1}
                      onChange={(e) => setCat1(e.target.value)}
                      placeholder="Tên mèo 1 (vd: Mochi)"
                      className="w-full rounded-xl border border-[#e5d3b7] bg-white px-2.5 py-1 text-[11px]"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      {HEART_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setOwnerColor(c)}
                          className={`rounded-full px-1.5 py-0.5 text-xs transition ${
                            ownerColor === c
                              ? 'scale-110 bg-white ring-2 ring-[#8a623c]'
                              : 'opacity-55 hover:opacity-100'
                          }`}
                        >
                          {HEART_BADGE_META[c].emoji}
                        </button>
                      ))}
                    </div>
                    {owner?.email && (
                      <p className="truncate text-[10px] opacity-65">
                        {owner.email}
                      </p>
                    )}
                  </div>

                  {/* Partner Card */}
                  <div className="space-y-2 rounded-2xl border border-[#e3d2b8] bg-[#fffaf0] p-3">
                    <div className="flex items-center justify-between text-[11px] font-bold opacity-75">
                      <span>Người 2 (Cùng dùng)</span>
                      <span>{HEART_BADGE_META[partnerColor].emoji}</span>
                    </div>
                    <input
                      type="text"
                      value={partnerNick}
                      onChange={(e) => setPartnerNick(e.target.value)}
                      placeholder="Her"
                      className="w-full rounded-xl border border-[#d6c09d] bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={cat2}
                      onChange={(e) => setCat2(e.target.value)}
                      placeholder="Tên mèo 2 (vd: Latte)"
                      className="w-full rounded-xl border border-[#e5d3b7] bg-white px-2.5 py-1 text-[11px]"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      {HEART_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPartnerColor(c)}
                          className={`rounded-full px-1.5 py-0.5 text-xs transition ${
                            partnerColor === c
                              ? 'scale-110 bg-white ring-2 ring-[#8a623c]'
                              : 'opacity-55 hover:opacity-100'
                          }`}
                        >
                          {HEART_BADGE_META[c].emoji}
                        </button>
                      ))}
                    </div>
                    {partner?.email && !isOpenInviteEmail(partner.email) && (
                      <p className="truncate text-[10px] opacity-65">
                        {partner.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNicknames}
                    className="rounded-xl bg-[#3d7c57] px-4 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#316647]"
                  >
                    Lưu biệt danh & tên mèo
                  </button>
                </div>
              </div>

              {!isCloudSignedIn && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e4d2b4] bg-[#fffaf0] p-3 text-xs">
                  <span className="font-bold">Đổi vai đăng thử trên máy:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSwitchLocalRole('owner')}
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        sharing.activeRole === 'owner'
                          ? `${HEART_BADGE_META[ownerColor].pillClass} border`
                          : 'bg-black/5 opacity-70'
                      }`}
                    >
                      {HEART_BADGE_META[ownerColor].emoji} {ownerNick}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSwitchLocalRole('partner')}
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        sharing.activeRole === 'partner'
                          ? `${HEART_BADGE_META[partnerColor].pillClass} border`
                          : 'bg-black/5 opacity-70'
                      }`}
                    >
                      {HEART_BADGE_META[partnerColor].emoji} {partnerNick}
                    </button>
                  </div>
                </div>
              )}

              {/* Leave / Revert to Solo */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#f2cfd3] bg-[#fdf2f3] p-3 text-xs text-[#89333d]">
                <span>
                  {sharing.activeRole === 'partner'
                    ? 'Rời bảng chung để quay về bảng cá nhân của riêng bạn?'
                    : 'Ngắt kết nối để quay về bảng cá nhân 1 người?'}
                </span>
                <button
                  type="button"
                  onClick={() => void onRevertToSolo()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-extrabold text-[#9b3440] shadow-2xs hover:bg-[#fce5e8]"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  {sharing.activeRole === 'partner' ? 'Rời bảng chung' : 'Về bảng 1 người'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
