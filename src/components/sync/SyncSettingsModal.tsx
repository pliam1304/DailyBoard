'use client';

import React, { useState } from 'react';
import {
  Bell,
  Cloud,
  Download,
  LogOut,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { loadOutbox } from '@/lib/outbox';
import { formatVndInput, parseVndInput } from '@/lib/date';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  sendLocalNotification,
} from '@/lib/pwa';
import { DEFAULT_BOARD_TITLE } from '@/lib/sharing';
import {
  isDevAdminEmail,
  isLikelyServiceRoleKey,
  rotateNotesPinEncryption,
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
  NoteItem,
  UserProfile,
} from '@/types/catyboard';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: CatyStoreData;
  userEmail: string | null;
  cloudConfig: CloudConfig;
  syncStatus: string;
  onUpdateProfile: (
    patch: Partial<UserProfile>,
    rotatedNotes?: { updatedNotes: NoteItem[]; changedNotes: NoteItem[] }
  ) => void;
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
  const [budget, setBudget] = useState(() =>
    formatVndInput(String(store.profile.monthlyBudget))
  );
  const [currentPinDraft, setCurrentPinDraft] = useState('');
  const [pinDraft, setPinDraft] = useState('');
  const [clearPinRequested, setClearPinRequested] = useState(false);
  const [pinError, setPinError] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const hasExistingPin = Boolean(store.profile.journalPin);

  // Developer-only state (strictly guarded by isDevUser)
  const [sbUrl, setSbUrl] = useState(cloudConfig.supabaseUrl);
  const [sbAnon, setSbAnon] = useState(cloudConfig.supabaseAnonKey);
  const [spClientId, setSpClientId] = useState(cloudConfig.spotifyClientId || '');
  const [configError, setConfigError] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [confirmWipeBoard, setConfirmWipeBoard] = useState(false);
  const [confirmSignOutUnsynced, setConfirmSignOutUnsynced] = useState(false);

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
    setPinError('');
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

    setSavingPrefs(true);
    try {
      const pinRes = await rotateNotesPinEncryption({
        notes: store.notes,
        storedPinHash: store.profile.journalPin,
        currentPin: currentPinDraft,
        newPin: pinDraft,
        clearPin: clearPinRequested,
        activeRole: store.sharing.activeRole,
      });

      if (!pinRes.ok) {
        setPinError(pinRes.reason);
        return false;
      }

      const parsedBudget = parseVndInput(budget);
      onUpdateProfile(
        {
          boardTitle: sanitizeText(boardTitle, 40) || DEFAULT_BOARD_TITLE,
          catName: sanitizeText(catName, 30) || 'Mochi',
          catStyle,
          boardTexture,
          fontStyle,
          monthlyBudget: parsedBudget > 0 ? parsedBudget : 8000000,
          journalPin: pinRes.nextPinHash,
        },
        pinRes.changedNotes.length > 0
          ? {
              updatedNotes: pinRes.updatedNotes,
              changedNotes: pinRes.changedNotes,
            }
          : undefined
      );
      setCurrentPinDraft('');
      setPinDraft('');
      setClearPinRequested(false);
      return true;
    } finally {
      setSavingPrefs(false);
    }
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhatki-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg('Đã tải bản sao lưu cá nhân về máy ✓');
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setBackupMsg('Đã kiểm tra & khôi phục bản sao lưu an toàn ✓');
  };

  const pendingOutboxCount = loadOutbox(userEmail).length;

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
            <h2 className="text-base font-extrabold">Cài đặt</h2>
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
                Tài khoản
              </h3>
              <span className="rounded-full bg-[#efe5d2] px-2.5 py-0.5 text-[10px] font-bold">
                {syncStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eef7f0] p-3 text-xs">
              <div>
                <div className="text-[11px] opacity-75">Email:</div>
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
                  <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingOutboxCount > 0 && !confirmSignOutUnsynced) {
                      setConfirmSignOutUnsynced(true);
                      return;
                    }
                    onClose();
                    void onSignOut();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-bold text-[#9d3741] shadow-2xs hover:bg-[#fde8ea]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {confirmSignOutUnsynced ? 'Vẫn đăng xuất' : 'Đăng xuất'}
                </button>
              </div>
            </div>
            {confirmSignOutUnsynced && pendingOutboxCount > 0 && (
              <p className="mt-2 rounded-xl bg-[#fff3cd] px-3 py-2 text-[11px] font-bold text-[#755118]">
                ⚠️ Còn {pendingOutboxCount} mục vừa lưu trên máy chưa kịp đồng bộ lên mây. Hãy bấm “Đồng bộ” trước để không sót dữ liệu nhé!
              </p>
            )}
          </section>

          {/* Personalization */}
          <section className="rounded-2xl border border-[#dfcba9] bg-white/85 p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Tùy chỉnh giao diện
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="font-bold">Tên bảng</span>
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="Name"
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
              <label className="text-xs">
                <span className="font-bold">Tên mèo</span>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
              <label className="text-xs">
                <span className="font-bold">Kiểu mèo</span>
                <select
                  value={catStyle}
                  onChange={(e) => setCatStyle(e.target.value as CatStyle)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                >
                  <option value="hybrid">Mặc định (Khăn choàng)</option>
                  <option value="doodle">Vẽ tay</option>
                  <option value="pixel">Pixel Art</option>
                  <option value="chibi">Chibi</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="font-bold">Hạn mức chi tiêu tháng (VNĐ)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(formatVndInput(e.target.value))}
                  placeholder="8.000.000"
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                />
              </label>
              <label className="text-xs">
                <span className="font-bold">Nền bảng</span>
                <select
                  value={boardTexture}
                  onChange={(e) => setBoardTexture(e.target.value as BoardTexture)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                >
                  <option value="cork">Gỗ bần (mặc định)</option>
                  <option value="linen">Vải Linen</option>
                  <option value="grid-paper">Giấy kẻ ô</option>
                  <option value="walnut">Gỗ trầm</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="font-bold">Kiểu chữ</span>
                <select
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                  className="mt-1 w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5"
                >
                  <option value="rounded">Chữ thường</option>
                  <option value="handwriting">Chữ viết tay</option>
                </select>
              </label>
              <div className="space-y-2 text-xs sm:col-span-2">
                <div className="flex items-center justify-between gap-2 font-bold">
                  <span>Mã PIN khóa riêng tư</span>
                  {hasExistingPin && (
                    <button
                      type="button"
                      onClick={() => {
                        setClearPinRequested((prev) => !prev);
                        setPinDraft('');
                        setPinError('');
                      }}
                      className="text-[11px] font-bold text-[#b54852] underline"
                    >
                      {clearPinRequested ? 'Hủy gỡ mã PIN' : 'Gỡ mã PIN'}
                    </button>
                  )}
                </div>

                {hasExistingPin && (clearPinRequested || pinDraft.trim().length > 0) && (
                  <input
                    type="password"
                    value={currentPinDraft}
                    onChange={(e) => {
                      setCurrentPinDraft(e.target.value);
                      setPinError('');
                    }}
                    placeholder={
                      clearPinRequested
                        ? 'Nhập mã PIN hiện tại để xác nhận gỡ khóa...'
                        : 'Nhập mã PIN hiện tại để xác nhận đổi sang PIN mới...'
                    }
                    className="w-full rounded-xl border border-[#c5892f] bg-[#fffaf0] px-3 py-1.5 outline-none"
                  />
                )}

                {!clearPinRequested && (
                  <input
                    type="password"
                    value={pinDraft}
                    onChange={(e) => {
                      setPinDraft(e.target.value);
                      setPinError('');
                    }}
                    placeholder={
                      hasExistingPin
                        ? 'Đã bật mã PIN (nhập PIN mới tại đây nếu muốn đổi)'
                        : 'Nhập mã PIN mới (để trống nếu không cần khóa)'
                    }
                    className="w-full rounded-xl border border-[#d6c09d] bg-white px-3 py-1.5 outline-none"
                  />
                )}

                {pinError && (
                  <p className="text-[11px] font-bold text-[#c54650]">{pinError}</p>
                )}
              </div>
            </div>
          </section>

          {/* Data Protection & Privacy Sovereignty for ALL Users */}
          <section className="space-y-3 rounded-2xl border border-[#dfcba9] bg-white/85 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-[#245534]">
                <ShieldCheck className="h-4 w-4 text-[#3d7c57]" />
                Bảo vệ dữ liệu & Quyền riêng tư
              </h3>
              <span className="rounded-full bg-[#eef7f0] px-2.5 py-0.5 text-[10px] font-extrabold text-[#245534]">
                {hasExistingPin ? 'Khóa PIN & AES-256 bật ✓' : 'Tự động xóa GPS ảnh ✓'}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-[#4b3525]">
              Ảnh tải lên tự động xóa vị trí GPS. Nội dung khóa PIN được mã hóa AES-256.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportBackup}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#d6c09d] bg-[#fbf5e9] px-3 py-1.5 font-bold text-[#382619] hover:bg-[#efe2cc]"
                >
                  <Download className="h-3.5 w-3.5" /> Tải bản sao lưu (.json)
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#d6c09d] bg-[#fbf5e9] px-3 py-1.5 font-bold text-[#382619] hover:bg-[#efe2cc]">
                  <Upload className="h-3.5 w-3.5" /> Khôi phục từ file
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => void importBackup(e)}
                    className="hidden"
                  />
                </label>
              </div>

              {confirmWipeBoard ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmWipeBoard(false)}
                    className="rounded-xl bg-[#ede0cc] px-2.5 py-1.5 text-[11px] font-bold text-[#382619]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetFreshBoard();
                      setConfirmWipeBoard(false);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#c54650] px-3 py-1.5 text-[11px] font-extrabold text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xác nhận xóa trắng
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmWipeBoard(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#fde6e8] px-3 py-1.5 font-bold text-[#9d3741] hover:bg-[#fad3d7]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa trắng bảng
                </button>
              )}
            </div>
            {backupMsg && (
              <p className="font-bold text-[#3d7c57]">{backupMsg}</p>
            )}
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
            </section>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={savingPrefs}
            onClick={() => {
              void handleSavePrefs().then((ok) => {
                if (ok) onClose();
              });
            }}
            className="rounded-2xl bg-[#423022] px-5 py-2 text-xs font-extrabold text-[#faf3e3] shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {savingPrefs ? 'Đang xử lý...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
