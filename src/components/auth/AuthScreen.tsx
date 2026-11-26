'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  DEFAULT_BOARD_TITLE,
  DEFAULT_OWNER_NICKNAME,
} from '@/lib/sharing';
import {
  checkRateLimit,
  recordRateLimitFailure,
  resetRateLimit,
  sanitizeText,
  validateEmail,
} from '@/lib/security';
import {
  PressedFlower,
  PuffyHeartSticker,
  PuffyWord,
  WashiTape,
} from '@/components/decor/ScrapbookDecor';

export interface SignupPayload {
  email: string;
  password: string;
  boardTitle: string;
  nickname: string;
}

interface AuthScreenProps {
  inviteCode?: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignupRequestOtp: (
    payload: SignupPayload
  ) => Promise<{ autoLoggedIn: boolean; demoCode?: string }>;
  onVerifyOtp: (
    email: string,
    otpCode: string,
    passwordFallback?: string
  ) => Promise<void>;
  onResendOtp: (email: string) => Promise<{ demoCode?: string }>;
}

export function AuthScreen({
  inviteCode,
  onLogin,
  onSignupRequestOtp,
  onVerifyOtp,
  onResendOtp,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify_otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [boardTitle, setBoardTitle] = useState(DEFAULT_BOARD_TITLE);
  const [nickname, setNickname] = useState(DEFAULT_OWNER_NICKNAME);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const rate = checkRateLimit('user_auth');
    if (!rate.allowed) {
      setErrorMsg(`Thử sai nhiều lần. Vui lòng chờ ${rate.retryAfterSec}s nhé.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setErrorMsg('Vui lòng nhập đúng địa chỉ Gmail / Email của bạn.');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setBusy(true);
    try {
      await onLogin(cleanEmail, password);
      resetRateLimit('user_auth');
    } catch (err) {
      const lim = recordRateLimitFailure('user_auth');
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công.';
      setErrorMsg(
        lim.locked ? `${msg} (Tạm khóa ${lim.retryAfterSec}s)` : msg
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setErrorMsg('Vui lòng nhập đúng địa chỉ Gmail của bạn.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Mật khẩu cần tối thiểu 8 ký tự để bảo vệ bảng riêng của bạn.');
      return;
    }

    setBusy(true);
    try {
      const res = await onSignupRequestOtp({
        email: cleanEmail,
        password,
        boardTitle: sanitizeText(boardTitle, 40) || DEFAULT_BOARD_TITLE,
        nickname: sanitizeText(nickname, 30) || DEFAULT_OWNER_NICKNAME,
      });
      if (!res.autoLoggedIn) {
        setDemoOtpHint(res.demoCode ?? null);
        setMode('verify_otp');
        setInfoMsg(
          `Đã gửi mã xác thực về hộp thư ${cleanEmail}. Nhập mã bên dưới để khởi tạo trang Board mới của bạn!`
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể đăng ký tài khoản mới.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanCode = otpCode.trim();
    if (cleanCode.length < 4) {
      setErrorMsg('Vui lòng nhập mã xác thực bạn nhận được trong Gmail.');
      return;
    }

    setBusy(true);
    try {
      await onVerifyOtp(email.trim().toLowerCase(), cleanCode, password);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Mã xác thực chưa đúng hoặc đã hết hạn.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      const res = await onResendOtp(email.trim().toLowerCase());
      if (res.demoCode) setDemoOtpHint(res.demoCode);
      setInfoMsg('Đã gửi lại mã xác thực mới về Gmail của bạn!');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể gửi lại mã lúc này.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efe4d2] p-4 text-[#382619]">
      <div className="corkboard-surface relative w-full max-w-md rounded-[32px] border-[8px] border-[#b68655] p-6 shadow-2xl">
        <WashiTape
          style="mint-gingham"
          className="-top-3 absolute left-1/2 -translate-x-1/2"
        />
        <PuffyHeartSticker color="sky" size={24} className="absolute right-5 top-4" />
        <PressedFlower className="absolute bottom-3 right-4 opacity-85" />

        {/* Cozy Cat & Brand Header */}
        <div className="mb-5 flex flex-col items-center text-center">
          <PuffyWord text={(boardTitle || DEFAULT_BOARD_TITLE).toUpperCase().slice(0, 10)} />
          <p className="mt-2 text-xs font-bold text-[#5c422c]">
            Góc Bảng Ghim Lofi & Nhật Ký Polaroid Cùng Mèo 🐾
          </p>
          {inviteCode && (
            <div className="mt-2 rounded-full bg-[#3d7c57] px-3 py-1 text-[11px] font-extrabold text-white shadow-2xs">
              💌 Đăng nhập hoặc đăng ký email được mời để vào bảng chung ({inviteCode})
            </div>
          )}
        </div>

        {/* Auth Card */}
        <div className="paper-cream-torn rounded-3xl border-2 border-[#c69d70] p-5 shadow-md">
          {mode !== 'verify_otp' && (
            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#efe3cf] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition ${
                  mode === 'login'
                    ? 'bg-[#3a75a8] text-white shadow-xs'
                    : 'text-[#5b432f] hover:bg-white/60'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className={`rounded-xl py-2 text-xs font-extrabold transition ${
                  mode === 'signup'
                    ? 'bg-[#3d7c57] text-white shadow-xs'
                    : 'text-[#5b432f] hover:bg-white/60'
                }`}
              >
                Đăng ký mới
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <label className="block text-xs">
                <span className="font-bold">Email / Gmail của bạn</span>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 opacity-50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full rounded-xl border border-[#d5bc99] bg-white py-2 pl-9 pr-3 text-xs outline-none"
                  />
                </div>
              </label>

              <label className="block text-xs">
                <span className="font-bold">Mật khẩu</span>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 opacity-50" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#d5bc99] bg-white py-2 pl-9 pr-3 text-xs outline-none"
                  />
                </div>
              </label>

              {errorMsg && (
                <p className="rounded-xl bg-[#fde8ea] px-3 py-2 text-xs font-bold text-[#a6343e]">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#3a75a8] py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#2f6390] disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" />
                {busy ? 'Đang mở bảng của bạn...' : 'Đăng nhập vào Bảng'}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div className="rounded-xl bg-[#eef7f0] px-3 py-2 text-[11px] font-semibold text-[#22502e]">
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                Mỗi tài khoản mới sẽ được tạo một trang Board hoàn toàn mới & riêng biệt.
              </div>

              <label className="block text-xs">
                <span className="font-bold">Gmail đăng ký</span>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 opacity-50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full rounded-xl border border-[#d5bc99] bg-white py-2 pl-9 pr-3 text-xs outline-none"
                  />
                </div>
              </label>

              <label className="block text-xs">
                <span className="font-bold">Mật khẩu (tối thiểu 8 ký tự)</span>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 opacity-50" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full rounded-xl border border-[#d5bc99] bg-white py-2 pl-9 pr-3 text-xs outline-none"
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs">
                  <span className="font-bold">Tên Bảng (mặc định Name)</span>
                  <input
                    type="text"
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    placeholder="Name"
                    className="mt-1 w-full rounded-xl border border-[#d5bc99] bg-white px-3 py-2 text-xs font-bold outline-none"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-bold">Biệt danh của bạn</span>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Him / Her"
                    className="mt-1 w-full rounded-xl border border-[#d5bc99] bg-white px-3 py-2 text-xs font-bold outline-none"
                  />
                </label>
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-[#fde8ea] px-3 py-2 text-xs font-bold text-[#a6343e]">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#3d7c57] py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#316647] disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {busy ? 'Đang gửi mã về Gmail...' : 'Đăng ký & Gửi mã về Gmail'}
              </button>
            </form>
          )}

          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <div className="rounded-2xl bg-[#eef6fc] p-3 text-xs text-[#1e4b70]">
                <div className="font-extrabold">📩 Kiểm tra hộp thư Gmail của bạn</div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {infoMsg ||
                    `Chúng mình vừa gửi mã xác thực tới ${email}. Nhập mã vào ô dưới đây để mở trang Board mới tinh của bạn.`}
                </p>
                {demoOtpHint && (
                  <div className="mt-2 rounded-xl bg-white px-2.5 py-1.5 font-mono text-xs font-extrabold text-[#3d7c57]">
                    Mã xác thực của bạn: {demoOtpHint}
                  </div>
                )}
              </div>

              <label className="block text-xs">
                <span className="font-bold">Mã xác thực từ Gmail</span>
                <div className="relative mt-1">
                  <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 opacity-50" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Nhập mã 6 số..."
                    className="w-full rounded-xl border border-[#d5bc99] bg-white py-2 pl-9 pr-3 font-mono text-sm font-extrabold tracking-widest outline-none"
                  />
                </div>
              </label>

              {errorMsg && (
                <p className="rounded-xl bg-[#fde8ea] px-3 py-2 text-xs font-bold text-[#a6343e]">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#3d7c57] py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#316647] disabled:opacity-60"
              >
                <ArrowRight className="h-4 w-4" />
                {busy ? 'Đang xác nhận & tạo Board...' : 'Xác nhận mã & Tạo Board mới'}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleResend()}
                  className="inline-flex items-center gap-1 font-bold text-[#3a75a8] hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Gửi lại mã
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="font-bold text-[#6b5340] hover:underline"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
