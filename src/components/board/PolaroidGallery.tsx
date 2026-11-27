'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Camera,
  ImagePlus,
  MessageSquarePlus,
  Mic,
  Palette,
  RotateCw,
  Send,
  Share2,
  Square,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import { compressImageToDataUrl } from '@/lib/media';
import { createUuid, getMemberHeart, getMemberNickname } from '@/lib/sharing';
import { sanitizeText, validateImageFile } from '@/lib/security';
import {
  AuthorBadge,
  getPolaroidFrameClass,
  POLAROID_FRAME_OPTIONS,
  PressedFlower,
  PuffyHeartSticker,
  WASHI_OPTIONS,
  WashiTape,
} from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  DayPhoto,
  FontStyle,
  PolaroidFrameColor,
  ThemeMode,
  WashiStyle,
} from '@/types/catyboard';

const LiveCameraModal = dynamic(
  () =>
    import('@/components/board/LiveCameraModal').then(
      (mod) => mod.LiveCameraModal
    ),
  { ssr: false }
);

const QUICK_REACTIONS = ['❤️', '🐾', '🥰', '😂', '🌸'];

function PolaroidCaptionInput({
  value,
  frameColor,
  fontStyle,
  onCommit,
}: {
  value: string;
  frameColor?: PolaroidFrameColor;
  fontStyle?: FontStyle;
  onCommit: (nextCaption: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);
  const latestDraftRef = useRef(value);
  const committedRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
      latestDraftRef.current = value;
      committedRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (latestDraftRef.current !== committedRef.current) {
          onCommitRef.current(latestDraftRef.current);
        }
      }
    };
  }, []);

  const flushNow = (nextVal: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (nextVal !== committedRef.current) {
      committedRef.current = nextVal;
      onCommitRef.current(nextVal);
    }
  };

  return (
    <input
      type="text"
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const nextVal = e.target.value;
        setDraft(nextVal);
        latestDraftRef.current = nextVal;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (nextVal !== committedRef.current) {
            committedRef.current = nextVal;
            onCommitRef.current(nextVal);
          }
        }, 420);
      }}
      onBlur={() => {
        focusedRef.current = false;
        flushNow(latestDraftRef.current);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className={`mt-2.5 w-full bg-transparent text-center text-sm font-bold outline-none focus:underline ${
        frameColor === 'film-black' ? 'text-[#f4ebd9]' : 'text-[#382619]'
      } ${fontStyle === 'handwriting' ? 'font-handwriting-soft text-base' : ''}`}
    />
  );
}

interface PolaroidGalleryProps {
  entryDate: string;
  photos: DayPhoto[];
  sharing: BoardSharingState;
  fontStyle?: FontStyle;
  theme: ThemeMode;
  onAddPhoto: (photo: DayPhoto) => void;
  onUpdatePhoto: (id: string, patch: Partial<DayPhoto>) => void;
  onDeletePhoto: (id: string) => void;
}

export function PolaroidGallery({
  entryDate,
  photos,
  sharing,
  fontStyle = 'rounded',
  theme,
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
}: PolaroidGalleryProps) {
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [selectedWashi, setSelectedWashi] = useState<WashiStyle>('mint-gingham');
  const [selectedFrame, setSelectedFrame] =
    useState<PolaroidFrameColor>('classic-white');
  const [uploading, setUploading] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<DayPhoto | null>(null);
  const [openCommentPhotoId, setOpenCommentPhotoId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [recordingPhotoId, setRecordingPhotoId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isNight = theme === 'cozy-night';

  const toggleReaction = (photo: DayPhoto, emoji: string) => {
    const current = photo.reactions ?? [];
    const exists = current.includes(emoji);
    const next = exists
      ? current.filter((r) => r !== emoji)
      : [...current, emoji];
    onUpdatePhoto(photo.id, { reactions: next });
  };

  const addComment = (photo: DayPhoto) => {
    const text = sanitizeText(commentDraft, 240);
    if (!text) return;
    const nextComments = [
      ...(photo.comments ?? []),
      {
        id: createUuid(),
        text,
        authorRole: sharing.activeRole,
        createdAt: new Date().toISOString(),
      },
    ];
    onUpdatePhoto(photo.id, { comments: nextComments });
    setCommentDraft('');
  };

  const getBacksideMeta = (photo: DayPhoto) => {
    const raw = photo.comments ?? [];
    const backNote =
      raw.find((c) => c.id === '__polaroid_back_note__')?.text ?? '';
    const backVoice =
      raw.find((c) => c.id === '__polaroid_back_voice__')?.text ?? '';
    const visibleComments = raw.filter(
      (c) => !c.id.startsWith('__polaroid_back_')
    );
    return { backNote, backVoice, visibleComments };
  };

  const upsertBacksideField = (
    photo: DayPhoto,
    specialId: '__polaroid_back_note__' | '__polaroid_back_voice__',
    value: string
  ) => {
    const others = (photo.comments ?? []).filter((c) => c.id !== specialId);
    const next = value
      ? [
          ...others,
          {
            id: specialId,
            text:
              specialId === '__polaroid_back_note__'
                ? sanitizeText(value, 380)
                : value,
            authorRole: sharing.activeRole,
            createdAt: new Date().toISOString(),
          },
        ]
      : others;
    onUpdatePhoto(photo.id, { comments: next });
  };

  const startBackVoiceRecord = async (photo: DayPhoto) => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingPhotoId(null);
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            upsertBacksideField(photo, '__polaroid_back_voice__', reader.result);
          }
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = rec;
      setRecordingPhotoId(photo.id);
      rec.start();
      recTimerRef.current = setTimeout(() => {
        if (rec.state === 'recording') rec.stop();
      }, 10000);
    } catch {
      setRecordingPhotoId(null);
    }
  };

  const stopBackVoiceRecord = () => {
    if (recTimerRef.current) clearTimeout(recTimerRef.current);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const pushPhotoData = (
    dataUrl: string,
    caption: string,
    washi: WashiStyle,
    frameColor: PolaroidFrameColor = selectedFrame
  ) => {
    const randomTilt = Number(((Math.random() - 0.5) * 6).toFixed(1));
    const newPhoto: DayPhoto = {
      id: createUuid(),
      entryDate,
      dataUrl,
      syncState: 'pending',
      frameColor,
      caption: sanitizeText(caption, 160) || 'Khoảnh khắc hôm nay ♡',
      washiStyle: washi,
      rotationDeg: randomTilt,
      isCover: photos.length === 0,
      authorRole: sharing.activeRole,
      createdAt: new Date().toISOString(),
    };
    onAddPhoto(newPhoto);
  };

  const shareSinglePhoto = async (photo: DayPhoto) => {
    try {
      const resp = await fetch(photo.dataUrl);
      const blob = await resp.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `polaroid-${photo.entryDate}.${ext}`, {
        type: blob.type || 'image/jpeg',
      });
      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          title: photo.caption || 'Ảnh Polaroid kỷ niệm',
          text: photo.caption,
          files: [file],
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polaroid-${photo.entryDate}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // User cancelled share sheet or offline
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const pickedFiles = Array.from(files);
    setUploadError('');
    setUploading(true);
    try {
      for (const file of pickedFiles) {
        const check = validateImageFile(file);
        if (!check.ok) {
          setUploadError(check.reason);
          continue;
        }
        try {
          const compressed = await compressImageToDataUrl(file);
          pushPhotoData(compressed, captionDraft, selectedWashi);
        } catch (err) {
          setUploadError(
            err instanceof Error
              ? err.message
              : 'Không thể xử lý ảnh này. Hãy thử chọn ảnh JPG hoặc PNG nhé!'
          );
        }
      }
      setCaptionDraft('');
    } finally {
      setUploading(false);
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
      if (albumInputRef.current) albumInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Capture & Upload Bar */}
      <div
        className={`rounded-3xl border-2 p-4 shadow-sm ${
          isNight
            ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
            : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">Ảnh trong ngày</h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden fallback native capture input */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => void handleFiles(e.target.files)}
              className="sr-only"
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => setCameraModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3a75a8] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#2f6390] disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              Chụp ảnh
            </button>

            <label
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-[#3d7c57] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#316647] ${
                uploading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              <span>{uploading ? 'Đang tải...' : 'Tải ảnh lên'}</span>
              <input
                ref={albumInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => void handleFiles(e.target.files)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* Caption & Washi tape selector before snapping */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            placeholder="Viết chú thích cho ảnh..."
            className={`flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none ${
              isNight
                ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
                : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
            }`}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {POLAROID_FRAME_OPTIONS.map((fr) => (
              <button
                key={fr.id}
                type="button"
                onClick={() => setSelectedFrame(fr.id)}
                title={`Khung: ${fr.label}`}
                style={{ backgroundColor: fr.swatchHex }}
                className={`h-6 w-6 rounded-full border transition ${
                  selectedFrame === fr.id
                    ? 'scale-110 border-[#382619] ring-2 ring-[#b57a29]'
                    : 'border-[#bfa586] opacity-85 hover:opacity-100'
                }`}
              />
            ))}
            <span className="mx-0.5 opacity-30">|</span>
            {WASHI_OPTIONS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWashi(w.id)}
                title={w.label}
                className={`h-6 w-10 rounded-md border transition ${w.className} ${
                  selectedWashi === w.id
                    ? 'scale-105 border-[#382619] ring-2 ring-[#8b633c]'
                    : 'border-white/75 opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {uploadError && (
          <p className="mt-2 text-xs font-bold text-[#c54650]">{uploadError}</p>
        )}
      </div>

      {/* Polaroid Pinboard Area */}
      {photos.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center ${
            isNight
              ? 'border-[#6f523b] bg-[#291e17]/80 text-[#dfd0bc]'
              : 'border-[#b99064] bg-[#fbf5e9]/85 text-[#5c4430]'
          }`}
        >
          <PressedFlower className="mb-2 opacity-85" />
          <p className="text-sm font-bold">Chưa có ảnh nào trong ngày</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
          {photos.map((photo, idx) => {
            const { backNote, backVoice, visibleComments } =
              getBacksideMeta(photo);
            const isFlipped = Boolean(flippedIds[photo.id]);
            const hasBackSecret = Boolean(backNote || backVoice);

            return (
              <div
                key={photo.id}
                className="group relative flex justify-center"
                style={{
                  transform: `rotate(${photo.rotationDeg}deg)`,
                }}
              >
                <WashiTape
                  style={photo.washiStyle}
                  className="-top-2.5 absolute left-1/2 z-10 -translate-x-1/2 -rotate-2"
                />

                <PuffyHeartSticker
                  color={
                    photo.authorRole
                      ? getMemberHeart(sharing, photo.authorRole)
                      : idx % 2 === 0
                        ? 'sky'
                        : 'sage'
                  }
                  size={22}
                  className="-right-2 top-3 absolute z-10"
                />

                {isFlipped ? (
                  /* --- VINTAGE 3D FLIPPED POLAROID BACKSIDE --- */
                  <div className="polaroid-card paper-cream-torn flex w-full max-w-[320px] flex-col justify-between rounded-sm border border-[#e0cdb0] p-3.5 text-[#382619] shadow-lg">
                    <div>
                      <div className="flex items-center justify-between border-b border-dashed border-[#cbb28d] pb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#7c6045]">
                        <span>INSTAX FILM • {photo.entryDate}</span>
                        <button
                          type="button"
                          onClick={() => {
                            ambientEngine.playPaperUnfurl();
                            setFlippedIds((prev) => ({
                              ...prev,
                              [photo.id]: false,
                            }));
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-[#3a75a8] px-2.5 py-0.5 font-sans text-[10px] font-extrabold text-white"
                        >
                          <RotateCw className="h-3 w-3" /> Mặt trước
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        defaultValue={backNote}
                        onBlur={(e) =>
                          upsertBacksideField(
                            photo,
                            '__polaroid_back_note__',
                            e.target.value
                          )
                        }
                        placeholder="Ghi chú mặt sau ảnh..."
                        className="font-handwriting-soft mt-2.5 w-full resize-none rounded-xl border border-[#e4d3b8] bg-[#fffcf6] p-2.5 text-sm leading-relaxed text-[#382619] outline-none placeholder:text-[#9c8369]"
                      />
                    </div>

                    {/* 10-Second Talking Polaroid Audio Strip */}
                    <div className="mt-3 rounded-xl border border-[#e3d1b4] bg-[#f7efe0] p-2.5 text-xs">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-extrabold text-[#5c4430]">
                        <span>Ghi âm mặt sau (10s)</span>
                        {backVoice && (
                          <button
                            type="button"
                            onClick={() =>
                              upsertBacksideField(
                                photo,
                                '__polaroid_back_voice__',
                                ''
                              )
                            }
                            className="text-[10px] font-bold text-[#b5424d] hover:underline"
                          >
                            Xóa thu âm
                          </button>
                        )}
                      </div>

                      {backVoice ? (
                        <audio
                          controls
                          src={backVoice}
                          className="h-8 w-full"
                        />
                      ) : recordingPhotoId === photo.id ? (
                        <button
                          type="button"
                          onClick={stopBackVoiceRecord}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#c54650] py-1.5 text-xs font-extrabold text-white animate-pulse"
                        >
                          <Square className="h-3 w-3 fill-current" /> Đang thu...
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void startBackVoiceRecord(photo)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3d7c57] py-1.5 text-xs font-extrabold text-white hover:bg-[#316647]"
                        >
                          <Mic className="h-3.5 w-3.5" /> Thu 10 giây
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* --- POLAROID FRONT SIDE --- */
                  <div
                    className={`polaroid-card w-full max-w-[320px] rounded-sm p-3 pb-4 transition-transform duration-200 group-hover:scale-[1.02] ${getPolaroidFrameClass(
                      photo.frameColor
                    )}`}
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      className="relative block w-full overflow-hidden rounded-[2px] bg-[#efe6d6]"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2">
                        <AuthorBadge sharing={sharing} role={photo.authorRole} />
                      </div>
                      {photo.syncState === 'pending' && (
                        <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-2xs">
                          Đang lưu...
                        </span>
                      )}
                    </button>

                    <PolaroidCaptionInput
                      value={photo.caption}
                      frameColor={photo.frameColor}
                      fontStyle={fontStyle}
                      onCommit={(nextCaption) =>
                        onUpdatePhoto(photo.id, { caption: nextCaption })
                      }
                    />

                    {/* Emoji Reaction Bar + Flip Backside + Sticky Comment Trigger */}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-[#efe4d1] pt-2">
                      <div className="flex items-center gap-0.5">
                        {QUICK_REACTIONS.map((emoji) => {
                          const active = (photo.reactions ?? []).includes(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleReaction(photo, emoji)}
                              className={`rounded-full px-1.5 py-0.5 text-xs transition ${
                                active
                                  ? 'scale-110 bg-[#f6e3bf] ring-1 ring-[#c5892f]'
                                  : 'opacity-55 hover:bg-[#f3ead9] hover:opacity-100'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            ambientEngine.playPaperUnfurl();
                            setFlippedIds((prev) => ({
                              ...prev,
                              [photo.id]: true,
                            }));
                          }}
                          title="Lật mặt sau ảnh Polaroid"
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition ${
                            hasBackSecret
                              ? 'bg-[#3a75a8] text-white'
                              : 'bg-[#efe5d3] text-[#3f2c1e] hover:bg-[#e5d6be]'
                          }`}
                        >
                          <RotateCw className="h-3 w-3" />
                          {backVoice ? '🎙️ Mặt sau' : 'Mặt sau'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenCommentPhotoId((curr) =>
                              curr === photo.id ? null : photo.id
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-[#efe5d3] px-2 py-0.5 text-[10px] font-bold text-[#3f2c1e] hover:bg-[#e5d6be]"
                        >
                          <MessageSquarePlus className="h-3 w-3" />
                          {visibleComments.length > 0
                            ? `${visibleComments.length}`
                            : 'Nhắn'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Sticky Comments */}
                    {(visibleComments.length > 0 ||
                      openCommentPhotoId === photo.id) && (
                      <div className="mt-2 space-y-1.5 rounded-xl bg-[#f5ecdc] p-2 text-[11px] text-[#382619]">
                        {visibleComments.map((c) => (
                          <div key={c.id} className="leading-snug">
                            <span className="font-extrabold text-[#3a75a8]">
                              {getMemberNickname(sharing, c.authorRole || 'owner')}:{' '}
                            </span>
                            <span>{c.text}</span>
                          </div>
                        ))}
                        {openCommentPhotoId === photo.id && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              addComment(photo);
                            }}
                            className="flex gap-1 pt-1"
                          >
                            <input
                              type="text"
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              placeholder="Dán 1 lời nhắn nhỏ dưới ảnh..."
                              className="flex-1 rounded-lg border border-[#d6c09d] bg-white px-2 py-1 text-[11px] text-[#382619] outline-none"
                            />
                            <button
                              type="submit"
                              aria-label="Gửi lời nhắn"
                              className="rounded-lg bg-[#3a75a8] px-2 py-1 text-white hover:bg-[#2f6390]"
                            >
                              <Send className="h-3 w-3" />
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#5e4634]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const order = WASHI_OPTIONS.map((w) => w.id);
                            const next =
                              order[
                                (order.indexOf(photo.washiStyle) + 1) %
                                  order.length
                              ];
                            onUpdatePhoto(photo.id, { washiStyle: next });
                          }}
                          className="rounded-full bg-[#efe5d3] px-2 py-0.5 font-semibold text-[#3f2c1e] hover:bg-[#e5d6be]"
                        >
                          Băng keo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const order = POLAROID_FRAME_OPTIONS.map((f) => f.id);
                            const curr = photo.frameColor || 'classic-white';
                            const next =
                              order[(order.indexOf(curr) + 1) % order.length];
                            onUpdatePhoto(photo.id, { frameColor: next });
                          }}
                          title="Đổi màu khung Polaroid"
                          className="inline-flex items-center gap-1 rounded-full bg-[#efe5d3] px-2 py-0.5 font-semibold text-[#3f2c1e] hover:bg-[#e5d6be]"
                        >
                          <Palette className="h-3 w-3" /> Khung
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePhoto(photo.id, { isCover: !photo.isCover })
                          }
                          title="Đặt làm ảnh bìa trên Lịch"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                            photo.isCover
                              ? 'bg-[#c5892f] text-white'
                              : 'bg-[#efe5d3] text-[#3f2c1e] hover:bg-[#e5d6be]'
                          }`}
                        >
                          <Star className="h-3 w-3" />
                          {photo.isCover ? 'Bìa lịch' : 'Đặt bìa'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePhoto(photo.id)}
                          aria-label="Xóa ảnh"
                          className="rounded-full p-1 text-[#b5424d] hover:bg-[#fde4e7]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Real Device Live Camera Modal */}
      {cameraModalOpen && (
        <LiveCameraModal
          isOpen={cameraModalOpen}
          entryDate={entryDate}
          initialCaption={captionDraft}
          initialWashi={selectedWashi}
          initialFrameColor={selectedFrame}
          onClose={() => setCameraModalOpen(false)}
          onConfirmPhoto={(dataUrl, caption, washi, frameColor) => {
            pushPhotoData(dataUrl, caption, washi, frameColor);
            setCaptionDraft('');
          }}
          onFallbackNativeCamera={() => nativeCameraInputRef.current?.click()}
        />
      )}

      {/* Lightbox preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className={`polaroid-card relative max-w-lg rounded-md p-4 ${getPolaroidFrameClass(
              previewPhoto.frameColor
            )}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute -right-3 -top-3 rounded-full bg-[#fbf5e9] p-1.5 text-[#382619] shadow-md"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewPhoto.dataUrl}
              alt={previewPhoto.caption}
              className="max-h-[68vh] w-full rounded-xs object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p
                className={`text-sm font-bold ${
                  previewPhoto.frameColor === 'film-black'
                    ? 'text-[#f4ebd9]'
                    : 'text-[#382619]'
                }`}
              >
                {previewPhoto.caption}
              </p>
              <button
                type="button"
                onClick={() => void shareSinglePhoto(previewPhoto)}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#3a75a8] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#2f6390]"
              >
                <Share2 className="h-3.5 w-3.5" /> Chia sẻ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
