'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Disc, Mic, Square, Trash2 } from 'lucide-react';
import { createUuid } from '@/lib/sharing';
import { AuthorBadge } from '@/components/decor/ScrapbookDecor';
import type { BoardSharingState, ThemeMode, VoiceMemo } from '@/types/catyboard';

interface VoiceMemoCardProps {
  entryDate: string;
  memos: VoiceMemo[];
  sharing: BoardSharingState;
  theme: ThemeMode;
  onAddMemo: (memo: VoiceMemo) => void;
  onDeleteMemo: (id: string) => void;
}

const MAX_DURATION_SEC = 30;

export function VoiceMemoCard({
  entryDate,
  memos,
  sharing,
  theme,
  onAddMemo,
  onDeleteMemo,
}: VoiceMemoCardProps) {
  const [title, setTitle] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<number>(0);

  const isNight = theme === 'cozy-night';

  const cleanupHardware = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupHardware();
    };
  }, []);

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const startRecording = async () => {
    setErrorMsg('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMsg('Trình duyệt hiện chưa hỗ trợ thu âm trực tiếp (cần HTTPS hoặc localhost).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsed(0);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanupHardware();
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl) return;
          onAddMemo({
            id: createUuid(),
            entryDate,
            title: title.trim() || 'Lời nhắn giọng nói nhỏ 🎙️',
            dataUrl,
            durationSec: Math.max(1, elapsedRef.current),
            authorRole: sharing.activeRole,
            createdAt: new Date().toISOString(),
          });
          setTitle('');
          setElapsed(0);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_DURATION_SEC) {
          stopRecording();
        }
      }, 1000);
    } catch {
      cleanupHardware();
      setErrorMsg('Chưa có quyền Micro — hãy cấp quyền micro trên trình duyệt để thu âm nhé!');
    }
  };

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-sm ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#b95567] text-white">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold">
              🎙️ Băng Cassette Giọng Nói (tối đa 30s)
            </h3>
            <p
              className={`text-[11px] ${
                isNight ? 'text-[#cbb7a1]' : 'text-[#6b5340]'
              }`}
            >
              Thu nhanh một lời nhắn hay câu chúc ngủ ngon dính vào ngày này
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tên cuộn băng (vd: Chúc ngủ ngon, Góc mưa tối nay...)"
          className={`flex-1 rounded-xl border px-3 py-1.5 text-xs outline-none ${
            isNight
              ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
              : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
          }`}
        />

        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#b54852] px-4 py-2 text-xs font-extrabold text-white shadow-xs animate-pulse"
          >
            <Square className="h-3.5 w-3.5 fill-white" />
            Dừng thu ({elapsed}s/{MAX_DURATION_SEC}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#b95567] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#9f4555]"
          >
            <Mic className="h-3.5 w-3.5" /> Bắt đầu thu âm
          </button>
        )}
      </div>

      {errorMsg && (
        <p className="mt-2 text-[11px] font-semibold text-[#c54650]">{errorMsg}</p>
      )}

      {memos.length > 0 && (
        <div className="mt-3 space-y-2">
          {memos.map((memo) => (
            <div
              key={memo.id}
              className={`rounded-2xl border p-2.5 ${
                isNight
                  ? 'border-[#584231] bg-[#36281f]'
                  : 'border-[#e0ccb0] bg-[#f4ead8]'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  <Disc className="h-3.5 w-3.5 text-[#b57a29]" />
                  <span>{memo.title}</span>
                  <span className="text-[10px] opacity-70">({memo.durationSec}s)</span>
                  <AuthorBadge sharing={sharing} role={memo.authorRole} />
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMemo(memo.id)}
                  aria-label="Xóa băng thu âm"
                  className="rounded p-1 text-[#b54852] opacity-70 hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <audio controls src={memo.dataUrl} className="h-8 w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
