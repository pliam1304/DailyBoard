'use client';

import React, { useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  MessageSquarePlus,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { compressImageToDataUrl } from '@/lib/media';
import { createUuid, getMemberHeart, getMemberNickname } from '@/lib/sharing';
import { sanitizeText, validateImageFile } from '@/lib/security';
import {
  AuthorBadge,
  PressedFlower,
  PuffyHeartSticker,
  WASHI_OPTIONS,
  WashiTape,
} from '@/components/decor/ScrapbookDecor';
import { LiveCameraModal } from '@/components/board/LiveCameraModal';
import type {
  BoardSharingState,
  DayPhoto,
  FontStyle,
  ThemeMode,
  WashiStyle,
} from '@/types/catyboard';

const QUICK_REACTIONS = ['❤️', '🐾', '🥰', '😂', '✨'];

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
  const [uploading, setUploading] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<DayPhoto | null>(null);
  const [openCommentPhotoId, setOpenCommentPhotoId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [uploadError, setUploadError] = useState('');

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

  const pushPhotoData = (dataUrl: string, caption: string, washi: WashiStyle) => {
    const randomTilt = Number(((Math.random() - 0.5) * 6).toFixed(1));
    const newPhoto: DayPhoto = {
      id: createUuid(),
      entryDate,
      dataUrl,
      caption: sanitizeText(caption, 160) || 'Khoảnh khắc hôm nay ♡',
      washiStyle: washi,
      rotationDeg: randomTilt,
      isCover: photos.length === 0,
      authorRole: sharing.activeRole,
      createdAt: new Date().toISOString(),
    };
    onAddPhoto(newPhoto);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const check = validateImageFile(file);
        if (!check.ok) {
          setUploadError(check.reason);
          continue;
        }
        const compressed = await compressImageToDataUrl(file);
        pushPhotoData(compressed, captionDraft, selectedWashi);
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
          <div>
            <h3 className="text-sm font-extrabold">
              📸 Ảnh Thật Trong Ngày (Polaroid)
            </h3>
            <p
              className={`text-xs ${
                isNight ? 'text-[#cbb7a1]' : 'text-[#6b5340]'
              }`}
            >
              Mở camera trực tiếp trên thiết bị (iPhone / MacBook / Webcam) hoặc chọn ảnh từ thư viện
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden fallback native capture + album upload inputs */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={(e) => void handleFiles(e.target.files)}
              className="hidden"
            />
            <input
              ref={albumInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={(e) => void handleFiles(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => setCameraModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3a75a8] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#2f6390] disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              Chụp ảnh ngay
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => albumInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3d7c57] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#316647] disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'Đang tải...' : 'Chọn từ thư viện'}
            </button>
          </div>
        </div>

        {/* Caption & Washi tape selector before snapping */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            placeholder="Dòng chú thích ngắn cho ảnh Polaroid (tùy chọn)..."
            className={`flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none ${
              isNight
                ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
                : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
            }`}
          />
          <div className="flex flex-wrap items-center gap-1.5">
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
          <p className="text-sm font-bold">Ngày này chưa có tấm ảnh Polaroid nào</p>
          <p className="mt-1 text-xs opacity-85">
            Bấm “Chụp ảnh ngay” để mở camera thật và ghim khoảnh khắc hôm nay lên bảng!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
          {photos.map((photo, idx) => (
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

              <div className="polaroid-card w-full max-w-[320px] rounded-sm p-3 pb-4 transition-transform duration-200 group-hover:scale-[1.02]">
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(photo)}
                  className="relative block w-full overflow-hidden rounded-[2px] bg-[#efe6d6]"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2">
                    <AuthorBadge sharing={sharing} role={photo.authorRole} />
                  </div>
                </button>

                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) =>
                    onUpdatePhoto(photo.id, { caption: e.target.value })
                  }
                  className={`mt-2.5 w-full bg-transparent text-center text-sm font-bold text-[#382619] outline-none focus:underline ${
                    fontStyle === 'handwriting' ? 'font-handwriting-soft text-base' : ''
                  }`}
                />

                {/* Emoji Reaction Bar + Sticky Comment Trigger */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-[#efe4d1] pt-2">
                  <div className="flex items-center gap-1">
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
                    {(photo.comments?.length ?? 0) > 0
                      ? `${photo.comments!.length} lời nhắn`
                      : 'Ghi chú ảnh'}
                  </button>
                </div>

                {/* Inline Sticky Comments */}
                {((photo.comments?.length ?? 0) > 0 ||
                  openCommentPhotoId === photo.id) && (
                  <div className="mt-2 space-y-1.5 rounded-xl bg-[#f5ecdc] p-2 text-[11px] text-[#382619]">
                    {(photo.comments ?? []).map((c) => (
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

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#5e4634]">
                  <button
                    type="button"
                    onClick={() => {
                      const order = WASHI_OPTIONS.map((w) => w.id);
                      const next =
                        order[(order.indexOf(photo.washiStyle) + 1) % order.length];
                      onUpdatePhoto(photo.id, { washiStyle: next });
                    }}
                    className="rounded-full bg-[#efe5d3] px-2.5 py-0.5 font-semibold text-[#3f2c1e] hover:bg-[#e5d6be]"
                  >
                    Đổi băng keo
                  </button>

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
            </div>
          ))}
        </div>
      )}

      {/* Real Device Live Camera Modal */}
      {cameraModalOpen && (
        <LiveCameraModal
          isOpen={cameraModalOpen}
          entryDate={entryDate}
          initialCaption={captionDraft}
          initialWashi={selectedWashi}
          onClose={() => setCameraModalOpen(false)}
          onConfirmPhoto={(dataUrl, caption, washi) => {
            pushPhotoData(dataUrl, caption, washi);
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
            className="polaroid-card relative max-w-lg rounded-md p-4"
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
              className="max-h-[70vh] w-full rounded-xs object-contain"
            />
            <p className="mt-3 text-center text-sm font-bold text-[#382619]">
              {previewPhoto.caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
