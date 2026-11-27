'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Heart,
  Mail,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  buildInviteUrl,
  DEFAULT_OWNER_NICKNAME,
  DEFAULT_PARTNER_NICKNAME,
  getMemberByRole,
  HEART_BADGE_META,
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
  onRenameMember: (role: MemberRole, nickname: string, heartColor: HeartColor) => void;
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
  onRenameMember,
  onUpdateCatNames,
  onSwitchLocalRole,
  onRevertToSolo,
}: SharedBoardModalProps) {
  const owner = getMemberByRole(sharing, 'owner');
  const partner = getMemberByRole(sharing, 'partner');
  const isDuo = isSharedDuo(sharing);

  const [inviteEmail, setInviteEmail] = useState(
    sharing.pendingInvite?.inviteeEmail || ''
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
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const inviteUrl =
    sharing.pendingInvite && typeof window !== 'undefined'
      ? buildInviteUrl(window.location.origin, sharing.pendingInvite.inviteCode)
      : '';

  const mailtoHref = sharing.pendingInvite
    ? `mailto:${encodeURIComponent(
        sharing.pendingInvite.inviteeEmail
      )}?subject=${encodeURIComponent(
        `💌 ${ownerNick} mời bạn dùng chung bảng ghim Lofi`
      )}&body=${encodeURIComponent(
        `Chào ${partnerNick}!\n\nMình vừa mời bạn vào bảng ghim kỷ niệm chung để cùng chia sẻ ảnh Polaroid, ghi chú, nhắc nhở và nghe nhạc lofi cùng nhau.\n\nMở link này và đăng nhập bằng email ${sharing.pendingInvite.inviteeEmail} để vào bảng chung nhé:\n${inviteUrl}\n\nMã mời: ${sharing.pendingInvite.inviteCode}`
      )}`
    : '';

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!validateEmail(trimmed)) {
      setErrorMsg('Bạn nhập đúng địa chỉ email của người thứ 2 nhé!');
      return;
    }
    setBusy(true);
    try {
      await onInviteByEmail(
        trimmed,
        sanitizeText(ownerNick, 40) || DEFAULT_OWNER_NICKNAME,
        sanitizeText(partnerNick, 40) || DEFAULT_PARTNER_NICKNAME
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể gửi lời mời');
    } finally {
      setBusy(false);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f3d4d8] text-[#8a3542]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {isDuo
                  ? `${owner?.nickname || 'Him'} & ${partner?.nickname || 'Her'}`
                  : 'Mời dùng chung bảng'}
              </h2>
              <p className="text-xs text-[#755b46]">
                {isDuo
                  ? 'Đang dùng chung bảng'
                  : 'Mời thêm 1 người qua email'}
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

        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Invite Form when Solo */}
          {!isDuo && (
            <form
              onSubmit={handleInviteSubmit}
              className="rounded-2xl border border-[#dfcba9] bg-white/85 p-4 space-y-3"
            >
              <div className="text-xs font-extrabold uppercase tracking-wide text-[#6b513b]">
                Gửi lời mời
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="font-bold">Tên gọi của bạn</span>
                  <input
                    type="text"
                    value={ownerNick}
                    onChange={(e) => setOwnerNick(e.target.value)}
                    placeholder="Him"
                    className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                  />
                </label>
                <label className="text-xs">
                  <span className="font-bold">Tên gọi người ấy</span>
                  <input
                    type="text"
                    value={partnerNick}
                    onChange={(e) => setPartnerNick(e.target.value)}
                    placeholder="Her"
                    className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                  />
                </label>
              </div>

              <label className="block text-xs">
                <span className="font-bold">Email người được mời</span>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 opacity-50" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="her@example.com"
                    className="w-full rounded-xl border border-[#d6c09d] bg-white py-2 pl-9 pr-3 text-xs outline-none"
                  />
                </div>
              </label>

              {errorMsg && (
                <p className="text-xs font-semibold text-[#c54650]">{errorMsg}</p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3a75a8] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#2f6390] disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {busy ? 'Đang gửi...' : 'Tạo lời mời'}
                </button>
              </div>
            </form>
          )}

          {/* Active 2-Person Nicknames & Hearts Editor */}
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

              <div className="rounded-2xl border border-[#dfcba9] bg-white/85 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[#6b513b]">
                    Biệt danh & Mèo
                  </span>
                  {savedNotice && (
                    <span className="text-[11px] font-bold text-[#3b8d52]">
                      Đã lưu biệt danh ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Owner Card */}
                  <div className="rounded-2xl border border-[#e3d2b8] bg-[#fffaf0] p-3 space-y-2">
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
                              ? 'scale-110 ring-2 ring-[#8a623c] bg-white'
                              : 'opacity-55 hover:opacity-100'
                          }`}
                        >
                          {HEART_BADGE_META[c].emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Partner Card */}
                  <div className="rounded-2xl border border-[#e3d2b8] bg-[#fffaf0] p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold opacity-75">
                      <span>Người 2 (Được mời)</span>
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
                              ? 'scale-110 ring-2 ring-[#8a623c] bg-white'
                              : 'opacity-55 hover:opacity-100'
                          }`}
                        >
                          {HEART_BADGE_META[c].emoji}
                        </button>
                      ))}
                    </div>
                    {partner?.email && (
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
                    Cập nhật biệt danh & tên mèo
                  </button>
                </div>
              </div>

              {/* Pending Invite Link Share Box */}
              {sharing.pendingInvite && sharing.pendingInvite.status === 'pending' && (
                <div className="rounded-2xl border border-[#bddbf3] bg-[#eef7fe] p-3.5 text-xs text-[#1d456b] space-y-2">
                  <div className="font-extrabold">
                    Lời mời gửi tới: {sharing.pendingInvite.inviteeEmail}
                  </div>
                  <p className="text-[11px] opacity-85">
                    Gửi link này cho người được mời để tham gia bảng chung.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="flex-1 truncate rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1d456b]">
                      {inviteUrl || sharing.pendingInvite.inviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#3a75a8] px-3 py-1.5 font-extrabold text-white hover:bg-[#2f6390]"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Đã copy
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </>
                      )}
                    </button>
                    <a
                      href={mailtoHref}
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-bold text-[#1d456b] shadow-2xs"
                    >
                      <Send className="h-3.5 w-3.5" /> Mở Email
                    </a>
                  </div>
                </div>
              )}

              {/* Local persona toggle when testing offline without Cloud login */}
              {!isCloudSignedIn && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e4d2b4] bg-[#fffaf0] p-3 text-xs">
                  <span className="font-bold">
                    Thử đăng bài ở chế độ máy cục bộ với vai:
                  </span>
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

              {/* Revert to 1-person board */}
              <div className="flex items-center justify-between rounded-2xl border border-[#f2cfd3] bg-[#fdf2f3] p-3 text-xs text-[#89333d]">
                <span>Muốn quay lại chế độ bảng cá nhân 1 người?</span>
                <button
                  type="button"
                  onClick={() => void onRevertToSolo()}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-extrabold text-[#9b3440] shadow-2xs hover:bg-[#fce5e8]"
                >
                  <UserMinus className="h-3.5 w-3.5" /> Về bảng 1 người
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
