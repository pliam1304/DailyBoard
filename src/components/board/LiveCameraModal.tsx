'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  FlipHorizontal,
  RefreshCw,
  RotateCcw,
  Timer,
  Upload,
  VideoOff,
  X,
} from 'lucide-react';
import {
  getPolaroidFrameClass,
  POLAROID_FRAME_OPTIONS,
  WASHI_OPTIONS,
  WashiTape,
} from '@/components/decor/ScrapbookDecor';
import { formatFilmDateStamp } from '@/lib/prompts';
import type {
  FilmFilterId,
  PolaroidFrameColor,
  WashiStyle,
} from '@/types/catyboard';

const FILM_FILTERS: { id: FilmFilterId; label: string; css: string }[] = [
  { id: 'natural', label: 'Gốc', css: 'none' },
  {
    id: 'kodak-warm',
    label: 'Film Ấm',
    css: 'sepia(0.24) saturate(1.18) contrast(1.04) brightness(1.03)',
  },
  {
    id: 'fuji-pastel',
    label: 'Biển Nhật',
    css: 'contrast(0.95) saturate(1.16) brightness(1.06) hue-rotate(-6deg)',
  },
  {
    id: 'lofi-night',
    label: 'Đêm Mưa',
    css: 'contrast(1.08) saturate(0.86) brightness(0.94) sepia(0.12)',
  },
];

interface LiveCameraModalProps {
  isOpen: boolean;
  entryDate: string;
  initialCaption: string;
  initialWashi: WashiStyle;
  initialFrameColor?: PolaroidFrameColor;
  onClose: () => void;
  onConfirmPhoto: (
    dataUrl: string,
    caption: string,
    washiStyle: WashiStyle,
    frameColor?: PolaroidFrameColor
  ) => void;
  onFallbackNativeCamera: () => void;
}

export function LiveCameraModal({
  isOpen,
  entryDate,
  initialCaption,
  initialWashi,
  initialFrameColor = 'classic-white',
  onClose,
  onConfirmPhoto,
  onFallbackNativeCamera,
}: LiveCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'captured' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedUrl, setCapturedUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>(initialCaption);
  const [washiStyle, setWashiStyle] = useState<WashiStyle>(initialWashi);
  const [frameColor, setFrameColor] =
    useState<PolaroidFrameColor>(initialFrameColor);
  const [filmFilter, setFilmFilter] = useState<FilmFilterId>('kodak-warm');
  const [dateStampEnabled, setDateStampEnabled] = useState<boolean>(true);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activeFilterCss =
    FILM_FILTERS.find((f) => f.id === filmFilter)?.css || 'none';
  const filmDateText = formatFilmDateStamp(entryDate);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (opts: { deviceId?: string; facing?: 'environment' | 'user' }) => {
      stopStream();
      setStatus('loading');
      setErrorMessage('');

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setStatus('error');
        setErrorMessage(
          'Trình duyệt hiện tại chưa hỗ trợ mở camera trực tiếp (hãy dùng HTTPS hoặc localhost).'
        );
        return;
      }

      try {
        const videoConstraints: MediaTrackConstraints = opts.deviceId
          ? {
              deviceId: { exact: opts.deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1440 },
            }
          : {
              facingMode: { ideal: opts.facing || 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1440 },
            };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch {
          // Graceful retry with generic video constraint (handles desktop webcams when facingMode isn't supported)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Refresh available cameras now that permission is granted
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoInputs);

        const activeTrack = stream.getVideoTracks()[0];
        const activeSettings = activeTrack?.getSettings();
        if (activeSettings?.deviceId) {
          setSelectedDeviceId(activeSettings.deviceId);
        }
        // Auto-mirror selfie camera only
        const isFront =
          activeSettings?.facingMode === 'user' ||
          (!opts.deviceId && opts.facing === 'user');
        setMirrored(Boolean(isFront));

        setStatus('ready');
      } catch (err) {
        setStatus('error');
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Bạn chưa cấp quyền Camera cho trình duyệt. Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép Camera nhé!'
            : 'Không tìm thấy hoặc không thể mở Camera trên thiết bị này.';
        setErrorMessage(msg);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }
    setCaption(initialCaption);
    setWashiStyle(initialWashi);
    setCapturedUrl('');
    void startCamera({ facing: facingMode });

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const snapNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);

    const maxWidth = 960;
    const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
    const targetW = Math.round(video.videoWidth * scale);
    const targetH = Math.round(video.videoHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    try {
      if ('filter' in ctx) {
        ctx.filter = activeFilterCss;
      }
    } catch {
      // Ignore if mobile browser canvas doesn't support ctx.filter
    }
    if (mirrored) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, targetW, targetH);
    ctx.restore();

    // Subtle retro glowing orange camera date stamp
    if (dateStampEnabled) {
      const fontSize = Math.max(20, Math.round(targetW * 0.032));
      ctx.save();
      ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(255, 118, 24, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ff9d42';
      ctx.fillText(
        filmDateText,
        targetW - Math.round(targetW * 0.04),
        targetH - Math.round(targetH * 0.04)
      );
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedUrl(dataUrl);
    setStatus('captured');
    stopStream();
  }, [activeFilterCss, dateStampEnabled, filmDateText, mirrored, stopStream]);

  const triggerTimerSnap = () => {
    if (countdown !== null) return;
    let remaining = 3;
    setCountdown(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown(null);
        snapNow();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const handleFlipFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedDeviceId('');
    void startCamera({ facing: nextFacing });
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    void startCamera({ deviceId });
  };

  const handleRetake = () => {
    setCapturedUrl('');
    void startCamera(
      selectedDeviceId ? { deviceId: selectedDeviceId } : { facing: facingMode }
    );
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onClick={handleClose}
    >
      <div
        className="my-auto w-full max-w-lg rounded-3xl border-2 border-[#b98d61] bg-[#fbf5e9] p-4 text-[#382619] shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3a75a8] text-white shadow-xs">
              <Camera className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-extrabold">Chụp ảnh Polaroid</h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng máy ảnh"
            className="rounded-full bg-[#ede0cc] p-2 text-[#382619] hover:bg-[#e1d0b6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Device Selector (supports iPhone Continuity Camera, FaceTime HD, Back/Front lenses) */}
        {status !== 'captured' && devices.length > 1 && (
          <div className="mb-3 flex items-center gap-2">
            <label className="text-[11px] font-bold text-[#5e4634] shrink-0">
              Chọn camera:
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="flex-1 truncate rounded-xl border border-[#d5bc99] bg-white px-2.5 py-1.5 text-xs font-medium text-[#382619] outline-none"
            >
              {devices.map((d, index) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewfinder OR Captured Polaroid Review */}
        {status === 'error' ? (
          <div className="rounded-2xl border-2 border-dashed border-[#cfa97e] bg-[#f4ead8] p-6 text-center">
            <VideoOff className="mx-auto mb-2 h-8 w-8 text-[#8f5e3b]" />
            <p className="text-xs font-bold text-[#382619]">{errorMessage}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void startCamera({ facing: facingMode })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3a75a8] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#2f6390]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Thử mở lại Camera
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onFallbackNativeCamera();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3d7c57] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#316647]"
              >
                <Upload className="h-3.5 w-3.5" /> Mở camera hệ thống / thư viện
              </button>
            </div>
          </div>
        ) : status === 'captured' && capturedUrl ? (
          <div className="space-y-4">
            <div className="relative mx-auto max-w-[340px] pt-2">
              <WashiTape
                style={washiStyle}
                className="-top-1 absolute left-1/2 z-10 -translate-x-1/2 -rotate-2"
              />
              <div
                className={`polaroid-card rounded-sm p-3 pb-4 ${getPolaroidFrameClass(
                  frameColor
                )}`}
              >
                <img
                  src={capturedUrl}
                  alt="Ảnh vừa chụp"
                  className="aspect-[4/3] w-full rounded-[2px] object-cover"
                />
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Viết dòng chú thích ngắn cho tấm Polaroid..."
                  className="mt-2.5 w-full rounded-lg border border-[#e3d2b8] bg-[#fbf7ee] px-2.5 py-1.5 text-center text-xs font-semibold text-[#382619] outline-none"
                />
              </div>
            </div>

            {/* Washi Tape & Frame Color Picker */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-[#6b5340]">Khung ảnh:</span>
                {POLAROID_FRAME_OPTIONS.map((fr) => (
                  <button
                    key={fr.id}
                    type="button"
                    onClick={() => setFrameColor(fr.id)}
                    title={fr.label}
                    style={{ backgroundColor: fr.swatchHex }}
                    className={`h-6 w-6 rounded-full border transition ${
                      frameColor === fr.id
                        ? 'scale-110 border-[#382619] ring-2 ring-[#b57a29]'
                        : 'border-[#bfa586] opacity-85 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-[#6b5340]">Băng keo:</span>
                {WASHI_OPTIONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWashiStyle(w.id)}
                    title={w.label}
                    className={`h-6 w-10 rounded-md border transition ${w.className} ${
                      washiStyle === w.id
                        ? 'scale-105 border-[#382619] ring-2 ring-[#8a623c]'
                        : 'border-white/80 opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#ebe0ce] px-4 py-2 text-xs font-extrabold text-[#382619] hover:bg-[#dfd0b8]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Chụp lại
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfirmPhoto(
                    capturedUrl,
                    caption.trim() || 'Khoảnh khắc hôm nay ♡',
                    washiStyle,
                    frameColor
                  );
                  handleClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3d7c57] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#316647]"
              >
                <Check className="h-4 w-4" /> Ghim lên bảng ♡
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Live Camera Stream Viewfinder */}
            <div className="relative overflow-hidden rounded-2xl border-4 border-[#e9dcc6] bg-[#1d1714] shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: activeFilterCss }}
                className={`aspect-[4/3] w-full object-cover ${
                  mirrored ? '-scale-x-100' : ''
                }`}
              />

              {/* Subtle Polaroid corner frame guides */}
              <div className="pointer-events-none absolute inset-4 rounded-lg border border-white/30" />

              {dateStampEnabled && (
                <div
                  className="pointer-events-none absolute bottom-5 right-6 font-mono text-sm font-bold tracking-wider text-[#ff9d42]"
                  style={{ textShadow: '0 0 8px rgba(255,118,24,0.85)' }}
                >
                  {filmDateText}
                </div>
              )}

              {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-bold text-white">
                  Đang mở camera thiết bị...
                </div>
              )}

              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-6xl font-black text-white drop-shadow-lg">
                  {countdown}
                </div>
              )}

              {flashActive && (
                <div className="pointer-events-none absolute inset-0 bg-white/90 transition-opacity" />
              )}
            </div>

            {/* Film Filter & Retro Date Stamp Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e3d1b6] bg-[#f4ead8] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILM_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilmFilter(f.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      filmFilter === f.id
                        ? 'bg-[#b57a29] text-white shadow-2xs'
                        : 'bg-white text-[#4b3525] hover:bg-[#fbf5e9]'
                    }`}
                  >
                    🎞️ {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDateStampEnabled((v) => !v)}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold transition ${
                  dateStampEnabled
                    ? 'bg-[#4a3425] text-[#ffaa56]'
                    : 'bg-white text-[#6b5340]'
                }`}
              >
                {filmDateText}
              </button>
            </div>

            {/* Camera Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFlipFacing}
                  title="Đổi camera trước / sau"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#ede0cc] px-3 py-2 text-xs font-bold text-[#382619] hover:bg-[#e1d0b6]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Đổi cam
                </button>
                <button
                  type="button"
                  onClick={() => setMirrored((m) => !m)}
                  title="Lật gương"
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    mirrored
                      ? 'bg-[#3a75a8] text-white'
                      : 'bg-[#ede0cc] text-[#382619] hover:bg-[#e1d0b6]'
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" /> Gương
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onFallbackNativeCamera();
                  }}
                  title="Dùng ứng dụng Camera gốc hoặc Thư viện của điện thoại"
                  className="inline-flex items-center gap-1 rounded-xl bg-[#ede0cc] px-3 py-2 text-xs font-bold text-[#382619] hover:bg-[#e1d0b6]"
                >
                  <Upload className="h-3.5 w-3.5" /> Camera máy
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={status !== 'ready' || countdown !== null}
                  onClick={triggerTimerSnap}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#ede0cc] px-3 py-2 text-xs font-bold text-[#382619] hover:bg-[#e1d0b6] disabled:opacity-50"
                >
                  <Timer className="h-3.5 w-3.5" /> 3s
                </button>
                <button
                  type="button"
                  disabled={status !== 'ready'}
                  onClick={snapNow}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3a75a8] px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#2f6390] disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" /> Chụp ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
