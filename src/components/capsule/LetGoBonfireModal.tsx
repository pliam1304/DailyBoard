'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Flame, ShieldCheck, Wind, X } from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import type { ThemeMode } from '@/types/catyboard';

interface LetGoBonfireModalProps {
  isOpen: boolean;
  catName: string;
  theme: ThemeMode;
  onClose: () => void;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  warm: boolean;
}

export function LetGoBonfireModal({
  isOpen,
  catName,
  theme,
  onClose,
}: LetGoBonfireModalProps) {
  const [stage, setStage] = useState<'write' | 'burning' | 'breathe'>('write');
  const [text, setText] = useState('');
  const [burnProgress, setBurnProgress] = useState(0); // 0..1
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>(
    'inhale'
  );
  const [breathSec, setBreathSec] = useState(4);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isNight = theme === 'cozy-night';

  useEffect(() => {
    if (isOpen) {
      setStage('write');
      setText('');
      setBurnProgress(0);
    }
  }, [isOpen]);

  // 2.4-second Rising Ember & Ash Burn Animation on Canvas
  useEffect(() => {
    if (!isOpen || stage !== 'burning') return;
    let rafId = 0;
    const startMs = performance.now();
    const durationMs = 2400;
    const embers: EmberParticle[] = [];

    const tick = (nowMs: number) => {
      const p = Math.min(1, (nowMs - startMs) / durationMs);
      setBurnProgress(p);

      const canvas = canvasRef.current;
      if (canvas) {
        const W = 360;
        const H = 220;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== W * dpr) {
          canvas.width = W * dpr;
          canvas.height = H * dpr;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, W, H);

          const fireY = H * (1 - p);

          // Spawn rising sparks & ash along the burning paper edge
          if (p < 0.94) {
            for (let k = 0; k < 4; k += 1) {
              embers.push({
                x: 24 + Math.random() * (W - 48),
                y: fireY + (Math.random() - 0.5) * 14,
                vx: (Math.random() - 0.5) * 1.4,
                vy: -1.3 - Math.random() * 2.2,
                size: 1.8 + Math.random() * 3.2,
                alpha: 0.95,
                warm: Math.random() > 0.28,
              });
            }
          }

          // Glowing orange ember line along burn edge
          if (p > 0.02 && p < 0.96) {
            const grad = ctx.createLinearGradient(0, fireY - 12, 0, fireY + 14);
            grad.addColorStop(0, 'rgba(255, 196, 82, 0)');
            grad.addColorStop(0.5, 'rgba(255, 134, 36, 0.85)');
            grad.addColorStop(1, 'rgba(92, 34, 14, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(18, fireY - 12, W - 36, 26);
          }

          for (let i = embers.length - 1; i >= 0; i -= 1) {
            const em = embers[i];
            em.x += em.vx + Math.sin(em.y * 0.05) * 0.35;
            em.y += em.vy;
            em.alpha -= 0.018;
            if (em.alpha <= 0) {
              embers.splice(i, 1);
              continue;
            }
            ctx.beginPath();
            ctx.arc(em.x, em.y, em.size, 0, Math.PI * 2);
            ctx.fillStyle = em.warm
              ? `rgba(255, ${150 + Math.round(em.alpha * 90)}, 56, ${em.alpha})`
              : `rgba(180, 168, 156, ${em.alpha * 0.7})`;
            ctx.fill();
          }

          ctx.restore();
        }
      }

      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Erase text from memory completely!
        setText('');
        ambientEngine.playPurrChime();
        setBreathPhase('inhale');
        setBreathSec(4);
        setStage('breathe');
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, stage]);

  // 4-7-8 Calm Breathing Guide after burning
  useEffect(() => {
    if (!isOpen || stage !== 'breathe') return;
    const timer = setInterval(() => {
      setBreathSec((prev) => {
        if (prev > 1) return prev - 1;
        setBreathPhase((curr) => {
          if (curr === 'inhale') {
            setBreathSec(7);
            return 'hold';
          }
          if (curr === 'hold') {
            setBreathSec(8);
            return 'exhale';
          }
          setBreathSec(4);
          return 'inhale';
        });
        return 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, stage]);

  const handleBurn = () => {
    if (!text.trim()) return;
    ambientEngine.playFireCrackleBurst();
    setStage('burning');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-[28px] border-2 p-5 shadow-2xl ${
          isNight
            ? 'border-[#6f4835] bg-[#241914] text-[#f6ead8]'
            : 'border-[#c89d6d] bg-[#faf3e3] text-[#382619]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#c95b3c] text-white shadow-xs">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Góc giải tỏa</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full bg-black/10 p-2 hover:bg-black/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {stage === 'write' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-[#eef7f0] px-3 py-2 text-[11px] font-bold text-[#255935]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Không lưu lại nội dung sau khi đốt.</span>
            </div>

            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Viết ra điều đang làm bạn bận lòng..."
              className="paper-kraft-ticket w-full resize-none rounded-2xl border border-[#cfb48e] p-3.5 text-xs leading-relaxed text-[#382619] outline-none placeholder:text-[#7c6248]"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-black/10 px-4 py-2 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!text.trim()}
                onClick={handleBurn}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#c95b3c] px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#ad4b2f] disabled:opacity-45"
              >
                <Flame className="h-4 w-4" /> Đốt bỏ
              </button>
            </div>
          </div>
        )}

        {stage === 'burning' && (
          <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-[#1b1310] p-4">
            <div
              style={{
                clipPath: `inset(0 0 ${Math.round(burnProgress * 100)}% 0)`,
                opacity: Math.max(0, 1 - burnProgress * 0.9),
              }}
              className="paper-kraft-ticket max-h-44 w-full max-w-[300px] overflow-hidden rounded-xl border border-[#cfb48e] p-3 text-xs text-[#382619] shadow-lg transition-none"
            >
              <p className="line-clamp-5 whitespace-pre-wrap">{text}</p>
            </div>

            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%' }}
              className="pointer-events-none absolute inset-0"
            />
          </div>
        )}

        {stage === 'breathe' && (
          <div className="space-y-4 py-3 text-center">
            <div className="mx-auto flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-[#f2c179] bg-gradient-to-b from-[#ffe5b4]/35 to-[#f0a868]/20 shadow-inner transition-transform duration-1000"
              style={{
                transform:
                  breathPhase === 'inhale'
                    ? 'scale(1.12)'
                    : breathPhase === 'hold'
                      ? 'scale(1.12)'
                      : 'scale(0.88)',
              }}
            >
              <Wind className="mb-1 h-5 w-5 text-[#d98736]" />
              <div className="text-xs font-extrabold">
                {breathPhase === 'inhale'
                  ? 'Hít vào êm...'
                  : breathPhase === 'hold'
                    ? 'Giữ nhẹ...'
                    : 'Thở ra chậm...'}
              </div>
              <div className="pixel-led mt-0.5 text-lg font-black text-[#c97428]">
                {breathSec}s
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-extrabold">
                🐾 {catName}: “Mọi muộn phiền vừa tan theo tro ấm rồi ♡”
              </p>
              <p className="text-[11px] opacity-80">
                Thở cùng mình một nhịp 4–7–8 trước khi quay lại bàn nhé.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl bg-[#3d7c57] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#316647]"
            >
              Đã nhẹ lòng rồi ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
