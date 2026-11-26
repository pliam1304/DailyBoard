'use client';

import React, { useState } from 'react';
import {
  Bell,
  Cloud,
  Download,
  LogOut,
  RefreshCw,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  sendLocalNotification,
} from '@/lib/pwa';
import { DEFAULT_BOARD_TITLE } from '@/lib/sharing';
import {
  hashJournalPin,
  isDevAdminEmail,
  isHashedPin,
  isLikelyServiceRoleKey,
  sanitizeText,
  validateBackupPayload,
  validateSafeHttpUrl,
} from '@/lib/security';
import { loadLocalAccounts } from '@/lib/storage';
import type {
  BoardTexture,
  CatStyle,
  CatyStoreData,
  CloudConfig,
  FontStyle,
  UserProfile,
} from '@/types/catyboard';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: CatyStoreData;
  userEmail: string | null;
  cloudConfig: CloudConfig;
  syncStatus: string;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onSaveDevCloudConfig: (cfg: CloudConfig) => void;
  onResetFreshBoard: () => void;
  onImportStore: (data: CatyStoreData) => void;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
}

export function SyncSettingsModal({
  isOpen,
  onClose,
  store,
  userEmail,
  cloudConfig,
  syncStatus,
  onUpdateProfile,
  onSaveDevCloudConfig,
  onResetFreshBoard,
  onImportStore,
  onSignOut,
  onSyncNow,
}: SyncSettingsModalProps) {
  const isDevUser = isDevAdminEmail(userEmail);

  const [boardTitle, setBoardTitle] = useState(
    store.profile.boardTitle || DEFAULT_BOARD_TITLE
  );
  const [catName, setCatName] = useState(store.profile.catName);
  const [catStyle, setCatStyle] = useState<CatStyle>(store.profile.catStyle);
  const [boardTexture, setBoardTexture] = useState<BoardTexture>(
    store.profile.boardTexture || 'cork'
  );
  const [fontStyle, setFontStyle] = useState<FontStyle>(
    store.profile.fontStyle || 'rounded'
  );
  const [budget, setBudget] = useState(String(store.profile.monthlyBudget));
  const [pinDraft, setPinDraft] = useState('');
  const [clearPinRequested, setClearPinRequested] = useState(false);
  const hasExistingPin = Boolean(store.profile.journalPin);

  // Developer-only state (strictly guarded by isDevUser)
  const [sbUrl, setSbUrl] = useState(cloudConfig.supabaseUrl);
  const [sbAnon, setSbAnon] = useState(cloudConfig.supabaseAnonKey);
  const [spClientId, setSpClientId] = useState(cloudConfig.spotifyClientId || '');
  const [configError, setConfigError] = useState('');
  const [backupMsg, setBackupMsg] = useState('');

  const [notifPerm, setNotifPerm] = useState(() =>
    getNotificationPermissionState()
  );

  if (!isOpen) return null;

  const enableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      sendLocalNotification(
        `🐾 ${catName} đã sẵn sàng nhắc bạn!`,
        'Thông báo nhắc nhở, Pomodoro & trái tim ♡ đã được bật.'
      );
    }
  };

  const handleSavePrefs = async (): Promise<boolean> => {
    if (isDevUser) {
      setConfigError('');
      if (
        sbUrl.trim() &&
        !validateSafeHttpUrl(sbUrl.trim(), { allowLocalhostHttp: true })
      ) {
        setConfigError('Supabase URL phải dùng giao thức https:// hợp lệ.');
        return false;
      }
      if (sbAnon.trim() && isLikelyServiceRoleKey(sbAnon.trim())) {
        setConfigError(
          'Cảnh báo bảo mật: Tuyệt đối KHÔNG dán service_role key vào trình duyệt — chỉ dùng anon public key!'
        );
        return false;
      }
      onSaveDevCloudConfig({
        supabaseUrl: sbUrl.trim(),
        supabaseAnonKey: sbAnon.trim(),
        spotifyClientId: sanitizeText(spClientId, 128),
      });
    }

    let nextPin = store.profile.journalPin;
    if (clearPinRequested) {
      nextPin = undefined;
    } else if (pinDraft.trim()) {
      nextPin = await hashJournalPin(pinDraft.trim());
    } else if (nextPin && !isHashedPin(nextPin)) {
      nextPin = await hashJournalPin(nextPin);
    }

    onUpdateProfile({
      boardTitle: sanitizeText(boardTitle, 40) || DEFAULT_BOARD_TITLE,
      catName: sanitizeText(catName, 30) || 'Mochi',
      catStyle,
      boardTexture,
      fontStyle,
      monthlyBudget: Math.min(
        100_000_000_000,
        Number(budget.replace(/[^\d]/g, '')) || 8000000
      ),
      journalPin: nextPin,
    });
    return true;
  };

  const exportBackup = () => {
    if (!isDevUser) return;
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nameboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDevUser) return;
    setBackupMsg('');
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = validateBackupPayload(text);
    if (!res.ok) {
      setBackupMsg(res.reason);
      return;
    }
    onImportStore(res.data);
    setBackupMsg('Đã kiểm tra & nhập bản sao lưu an toàn ✓');
  };

  const registeredAccountsCount = isDevUser
    ? Object.keys(loadLocalAccounts()).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-xl rounded-3xl border-2 border-[#c89d6d] bg-[#faf3e3] p-5 text-[#382619] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold">
              ⚙️ Cài Đặt Bảng & Tài Khoản Cá Nhân
            </h2>
            {isDevUser && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4a3425] px-2.5 py-0.5 text-[10px] font-extrabold text-[#ffd978]">
                <Wrench className="h-3 w-3" /> DEV ADMIN
              </span>
            )}
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
          {/* Active User Account */}
          <section className="rounded-2xl border border-[#dfcba9] bg-white/85 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                <Cloud className="h-4 w-4 text-[#3d7c57]" />
                Tài khoản đang đăng nhập
              </h3>
              <span className="rounded-full bg-[#efe5d2] px-2.5 py-0.5 text-[10px] font-bold">
                {syncStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eef7f0] p-3 text-xs">
              <div>
                <div className="text-[11px] opacity-75">
                  {isDevUser ? 'Gmail Nhà phát triển (Dev):' : 'Gmail cá nhân:'}
                </div>
                <div className="font-extrabold text-[#214f2d]">
                  {userEmail || 'Tài khoản cá nhân'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onSyncNow()}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-3 py-1.5 font-bold text-white hover:bg-[#316647]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Làm mới dữ liệu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    void onSignOut();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-bold text-[#9d3741] shadow-2xs hover:bg-[#fde8ea]"
                >
                  <LogOut className="h-3.5 w-3.5" /> Đăng xuất
                </button>
              </div>
            </div>
          </section>

          {/* Personalization */}
          <section className="rounded-2xl border border-[#dfcba9] bg-white/85 p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Cá nhân hóa bảng & chú mèo
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="font-bold">Tên bảng (chữ nổi 3D)</span>
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="Name"
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
              <label className="text-xs">
                <span className="font-bold">Tên chú mèo đồng hành</span>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
              <label className="text-xs">
                <span className="font-bold">Phong cách mèo</span>
                <select
                  value={catStyle}
                  onChange={(e) => setCatStyle(e.target.value as CatStyle)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                >
                  <option value="hybrid">Tổng hợp (Doodle + Khăn choàng)</option>
                  <option value="doodle">Nét vẽ tay thuần</option>
                  <option value="pixel">Pixel Art cổ điển</option>
                  <option value="chibi">Chibi Cozy</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="font-bold">Ngân sách tháng (VNĐ)</span>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
              <label className="text-xs">
                <span className="font-bold">Chất liệu nền bảng ghim</span>
                <select
                  value={boardTexture}
                  onChange={(e) => setBoardTexture(e.target.value as BoardTexture)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                >
                  <option value="cork">Gỗ bần Scrapbook (mặc định)</option>
                  <option value="linen">Vải Linen kem dịu</option>
                  <option value="grid-paper">Giấy ô vuông Nhật (Grid)</option>
                  <option value="walnut">Gỗ óc chó ấm áp</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="font-bold">Kiểu chữ Polaroid & Tâm Thư</span>
                <select
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                >
                  <option value="rounded">Gọn gàng dễ đọc</option>
                  <option value="handwriting">Nghiêng viết tay sổ tay</option>
                </select>
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="flex items-center justify-between gap-2 font-bold">
                  <span>Mã PIN khóa Tâm Thư riêng tư</span>
                  {hasExistingPin && !clearPinRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        setClearPinRequested(true);
                        setPinDraft('');
                      }}
                      className="text-[11px] font-bold text-[#b54852] underline"
                    >
                      Gỡ mã PIN
                    </button>
                  )}
                </span>
                <input
                  type="password"
                  value={pinDraft}
                  onChange={(e) => {
                    setPinDraft(e.target.value);
                    setClearPinRequested(false);
                  }}
                  placeholder={
                    hasExistingPin && !clearPinRequested
                      ? 'Đã đặt mã PIN ✓ (nhập mới nếu muốn đổi)'
                      : 'Nhập mã PIN mới (để trống nếu không cần khóa)'
                  }
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
            </div>
          </section>

          {/* Notifications & Mobile Guide */}
          <section className="space-y-2.5 rounded-2xl border border-[#dfcba9] bg-white/85 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide">
                <Smartphone className="h-3.5 w-3.5" /> Thông báo & Ứng dụng di động
              </h3>
              <button
                type="button"
                onClick={() => void enableNotifications()}
                disabled={notifPerm === 'granted' || notifPerm === 'unsupported'}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-[11px] font-extrabold text-white transition ${
                  notifPerm === 'granted'
                    ? 'bg-[#3d7c57]'
                    : 'bg-[#3a75a8] hover:bg-[#2f6390] disabled:opacity-50'
                }`}
              >
                <Bell className="h-3.5 w-3.5" />
                {notifPerm === 'granted'
                  ? 'Đã bật thông báo ✓'
                  : notifPerm === 'unsupported'
                    ? 'Chưa hỗ trợ thông báo'
                    : 'Bật thông báo nhắc nhở'}
              </button>
            </div>
            <p className="leading-relaxed opacity-85">
              Trên iPhone: mở trang trong <strong>Safari</strong> → bấm <em>Chia sẻ</em> →{' '}
              <strong>Thêm vào Màn hình chính</strong> để dùng toàn màn hình như ứng dụng riêng của bạn.
            </p>
          </section>

          {/* STRICTLY DEV-ONLY SECTION: Only visible when signed in as huynhphuclam147@gmail.com */}
          {isDevUser && (
            <section className="space-y-3 rounded-2xl border-2 border-[#8c623d] bg-[#f4e8d4] p-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-[#4a3425]">
                  <Wrench className="h-4 w-4 text-[#b57a29]" />
                  Công cụ Dev (Chỉ mở cho {userEmail})
                </h3>
                <span className="rounded-full bg-[#4a3425] px-2 py-0.5 text-[10px] font-bold text-[#ffd978]">
                  {registeredAccountsCount} tài khoản trên máy
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="Dev Override: Supabase Project URL (https://xxx.supabase.co)"
                  className="w-full rounded-xl border border-[#c8ad88] bg-white px-3 py-1.5"
                />
                <input
                  type="password"
                  value={sbAnon}
                  onChange={(e) => setSbAnon(e.target.value)}
                  placeholder="Dev Override: Supabase Anon Public Key"
                  className="w-full rounded-xl border border-[#c8ad88] bg-white px-3 py-1.5"
                />
                <input
                  type="text"
                  value={spClientId}
                  onChange={(e) => setSpClientId(e.target.value)}
                  placeholder="Dev Override: Spotify Client ID"
                  className="w-full rounded-xl border border-[#c8ad88] bg-white px-3 py-1.5"
                />
                {configError && (
                  <p className="font-bold text-[#b54852]">{configError}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportBackup}
                    className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-bold text-[#382619] shadow-2xs hover:bg-[#efe4d1]"
                  >
                    <Download className="h-3.5 w-3.5" /> Xuất JSON DB
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-bold text-[#382619] shadow-2xs hover:bg-[#efe4d1]">
                    <Upload className="h-3.5 w-3.5" /> Nhập JSON DB
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => void importBackup(e)}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onResetFreshBoard();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#fde6e8] px-3 py-1.5 font-bold text-[#9d3741] hover:bg-[#fad3d7]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Làm mới Board về trống
                </button>
              </div>
              {backupMsg && (
                <p className="font-bold text-[#3d7c57]">{backupMsg}</p>
              )}
            </section>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              void handleSavePrefs().then((ok) => {
                if (ok) onClose();
              });
            }}
            className="rounded-2xl bg-[#423022] px-5 py-2 text-xs font-extrabold text-[#faf3e3] shadow-sm hover:opacity-90"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
