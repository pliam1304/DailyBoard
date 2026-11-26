'use client';

import React, { useState } from 'react';
import { Fish, Heart, Sparkles } from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import { CAT_DECOR_CATALOG } from '@/lib/search';
import {
  getMemberHeart,
  getMemberNickname,
  HEART_BADGE_META,
  isSharedDuo,
} from '@/lib/sharing';
import { MOOD_META, WEATHER_META } from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  CatDecorId,
  CatMood,
  CatStyle,
  ThemeMode,
  WeatherType,
} from '@/types/catyboard';

interface CatCompanionProps {
  catName: string;
  partnerCatName?: string;
  catStyle: CatStyle;
  mood: CatMood;
  weather: WeatherType;
  theme: ThemeMode;
  isPlayingMusic: boolean;
  completedCount: number;
  totalCount: number;
  fishPoints?: number;
  activeDecor?: CatDecorId[];
  onToggleDecor?: (decorId: CatDecorId) => void;
  sharing?: BoardSharingState;
  partnerOnline?: boolean;
  onSendHeartPing?: () => void;
  onChangeMood: (mood: CatMood) => void;
  onChangeWeather: (weather: WeatherType) => void;
  compact?: boolean;
}

function CozyCatSvg({
  catStyle,
  mood,
  isPlayingMusic,
  scarfColor,
  headphoneColor,
  width,
  height,
  furColor = '#fffaf0',
  wearBeanie = false,
}: {
  catStyle: CatStyle;
  mood: CatMood;
  isPlayingMusic: boolean;
  scarfColor: string;
  headphoneColor: string;
  width: number;
  height: number;
  furColor?: string;
  wearBeanie?: boolean;
}) {
  if (catStyle === 'pixel') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 32 28"
        shapeRendering="crispEdges"
        className="animate-float-slow drop-shadow-sm transition-transform group-hover:scale-105"
      >
        <rect x="6" y="4" width="4" height="4" fill={furColor} />
        <rect x="20" y="4" width="4" height="4" fill={furColor} />
        <rect x="6" y="8" width="18" height="12" fill={furColor} />
        <rect x="4" y="10" width="2" height="8" fill={furColor} />
        <rect x="24" y="10" width="2" height="8" fill={furColor} />
        <rect x="8" y="20" width="14" height="6" fill="#f3e5d0" />
        <rect x="8" y="6" width="2" height="2" fill="#f4b6bd" />
        <rect x="20" y="6" width="2" height="2" fill="#f4b6bd" />
        {mood === 'sleepy' ? (
          <>
            <rect x="9" y="12" width="4" height="1" fill="#423022" />
            <rect x="17" y="12" width="4" height="1" fill="#423022" />
          </>
        ) : (
          <>
            <rect x="10" y="11" width="2" height="3" fill="#423022" />
            <rect x="18" y="11" width="2" height="3" fill="#423022" />
          </>
        )}
        <rect x="8" y="14" width="2" height="1" fill="#f4a8b2" />
        <rect x="20" y="14" width="2" height="1" fill="#f4a8b2" />
        <rect x="14" y="14" width="2" height="2" fill="#423022" />
        <rect x="25" y="18" width="4" height="2" fill={furColor} />
        <rect x="27" y="15" width="2" height="3" fill={furColor} />
        {isPlayingMusic && (
          <>
            <rect x="4" y="9" width="2" height="6" fill={headphoneColor} />
            <rect x="24" y="9" width="2" height="6" fill={headphoneColor} />
            <rect x="6" y="3" width="18" height="2" fill={headphoneColor} />
          </>
        )}
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 112"
      className="animate-float-slow drop-shadow-sm transition-transform group-hover:scale-105"
    >
      <path
        d="M102 88 C122 86 128 66 118 58"
        fill="none"
        stroke="#423022"
        strokeWidth="4"
        strokeLinecap="round"
        className="cat-tail"
      />
      {isPlayingMusic && (
        <path
          d="M32 52 C32 16 96 16 96 52"
          fill="none"
          stroke={headphoneColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      <path
        d="M34 94 C32 66 36 44 43 32 L54 44 C61 42 68 42 75 44 L86 32 C93 44 97 66 95 94 Z"
        fill={furColor}
        stroke="#423022"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M44 37 L48 44 L41 44 Z" fill="#f3b6bc" opacity="0.85" />
      <path d="M84 37 L87 44 L80 44 Z" fill="#f3b6bc" opacity="0.85" />
      {isPlayingMusic && (
        <>
          <rect
            x="26"
            y="47"
            width="10"
            height="18"
            rx="5"
            fill={headphoneColor}
            stroke="#423022"
            strokeWidth="2.5"
          />
          <rect
            x="92"
            y="47"
            width="10"
            height="18"
            rx="5"
            fill={headphoneColor}
            stroke="#423022"
            strokeWidth="2.5"
          />
        </>
      )}
      {mood === 'sleepy' ? (
        <>
          <path d="M48 59 Q53 63 58 59" fill="none" stroke="#423022" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M71 59 Q76 63 81 59" fill="none" stroke="#423022" strokeWidth="2.8" strokeLinecap="round" />
        </>
      ) : mood === 'happy' || mood === 'love' ? (
        <>
          <path d="M48 60 Q53 54 58 60" fill="none" stroke="#423022" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M71 60 Q76 54 81 60" fill="none" stroke="#423022" strokeWidth="2.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="53" cy="59" r="3" fill="#423022" />
          <circle cx="76" cy="59" r="3" fill="#423022" />
          <circle cx="54" cy="58" r="1" fill="#ffffff" />
          <circle cx="77" cy="58" r="1" fill="#ffffff" />
        </>
      )}
      <ellipse cx="46" cy="65" rx="4.5" ry="2.5" fill="#f4b2b9" opacity="0.8" />
      <ellipse cx="83" cy="65" rx="4.5" ry="2.5" fill="#f4b2b9" opacity="0.8" />
      <path d="M61 64 Q64.5 68 68 64" fill="none" stroke="#423022" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M64.5 66 Q61 71 57 69 M64.5 66 Q68 71 72 69"
        fill="none"
        stroke="#423022"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M28 58 L41 61 M27 65 L40 65 M101 58 L88 61 M102 65 L89 65"
        stroke="#423022"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {catStyle !== 'doodle' && (
        <path
          d="M42 76 Q64.5 84 87 76 L85 83 Q64.5 90 44 83 Z"
          fill={scarfColor}
          stroke="#423022"
          strokeWidth="2.2"
        />
      )}
      {wearBeanie && (
        <g>
          <path
            d="M44 42 C46 24 83 24 85 42 Z"
            fill="#d4727e"
            stroke="#423022"
            strokeWidth="2.4"
          />
          <rect
            x="42"
            y="39"
            width="45"
            height="7"
            rx="3.5"
            fill="#f4d092"
            stroke="#423022"
            strokeWidth="2"
          />
          <circle cx="64.5" cy="23" r="5" fill="#fffaf0" stroke="#423022" strokeWidth="2" />
        </g>
      )}
      <ellipse cx="52" cy="94" rx="7" ry="4.5" fill={furColor} stroke="#423022" strokeWidth="2.5" />
      <ellipse cx="77" cy="94" rx="7" ry="4.5" fill={furColor} stroke="#423022" strokeWidth="2.5" />
    </svg>
  );
}

export function CatCompanion({
  catName,
  partnerCatName = 'Latte',
  catStyle,
  mood,
  weather,
  theme,
  isPlayingMusic,
  completedCount,
  totalCount,
  fishPoints = 0,
  activeDecor = [],
  onToggleDecor,
  sharing,
  partnerOnline = false,
  onSendHeartPing,
  onChangeMood,
  onChangeWeather,
  compact = false,
}: CatCompanionProps) {
  const [hearts, setHearts] = useState<number[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const [decorOpen, setDecorOpen] = useState(false);

  const isNight = theme === 'cozy-night';
  const showRain = weather === 'rainy' || isNight;
  const isDuo = sharing ? isSharedDuo(sharing) : false;

  const ownerNick = sharing ? getMemberNickname(sharing, 'owner') : 'Him';
  const partnerNick = sharing ? getMemberNickname(sharing, 'partner') : 'Her';
  const ownerHeart = sharing ? getMemberHeart(sharing, 'owner') : 'sky';
  const partnerHeart = sharing ? getMemberHeart(sharing, 'partner') : 'sage';

  const petCat = () => {
    ambientEngine.playPurrChime();
    const id = Date.now();
    setHearts((prev) => [...prev.slice(-3), id]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((item) => item !== id));
    }, 1100);

    const messages = isDuo
      ? [
          `${catName} & ${partnerCatName}: Chúc ${ownerNick} và ${partnerNick} một ngày thật êm ♡`,
          `${catName}: Nhớ chụp ảnh Polaroid gửi cho nhau nha!`,
          `${partnerCatName}: Gừ gừ... 2 đứa mình ngồi nghe nhạc chung nào~`,
        ]
      : [
          `${catName}: Meow~ Hôm nay bạn vất vả rồi ♡`,
          `${catName}: Nhớ chụp 1 tấm ảnh kỷ niệm nha!`,
          completedCount > 0
            ? `${catName}: Đã xong ${completedCount} việc rồi, giỏi quá!`
            : `${catName}: Cùng bật chút lofi rồi từ từ làm nhé~`,
        ];
    setBubble(messages[Math.floor(Math.random() * messages.length)]);
    setTimeout(() => setBubble(null), 3200);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-2 p-4 transition-all ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      } shadow-md`}
    >
      {/* Window backdrop behind the cat(s) */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-3 transition-colors ${
          isNight
            ? 'border-[#5a4230] bg-gradient-to-b from-[#1a2338] via-[#26324d] to-[#3a3242]'
            : weather === 'rainy'
              ? 'border-[#b9cfdf] bg-gradient-to-b from-[#a8c2d8] via-[#cbe0ee] to-[#e9f1f5]'
              : 'border-[#bdd9eb] bg-gradient-to-b from-[#89c4ee] via-[#c6e6fa] to-[#f4efe4]'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-white/25" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] bg-white/25" />

        {/* Unlocked Fairy Lights across window top */}
        {activeDecor.includes('fairy-lights') && (
          <div className="pointer-events-none absolute inset-x-2 top-1 z-20 flex justify-around">
            {[0, 1, 2, 3, 4, 5, 6].map((dot) => (
              <span
                key={dot}
                className="h-2.5 w-2.5 rounded-full bg-[#ffe691] shadow-[0_0_10px_rgba(255,224,112,0.95)]"
                style={{
                  transform: `translateY(${dot % 2 === 0 ? 2 : 6}px)`,
                }}
              />
            ))}
          </div>
        )}

        {isNight || weather === 'starry' ? (
          <>
            <div className="absolute right-4 top-3 h-7 w-7 rounded-full bg-[#ffe89e] shadow-[0_0_18px_rgba(255,232,158,0.85)]" />
            <div className="absolute left-6 top-4 h-1.5 w-1.5 rounded-full bg-white/90" />
            <div className="absolute left-14 top-8 h-1 w-1 rounded-full bg-white/75" />
            <div className="absolute right-16 top-6 h-1.5 w-1.5 rounded-full bg-white/80" />
          </>
        ) : (
          <>
            <div className="absolute right-4 top-3 h-8 w-8 rounded-full bg-[#fff1a8] shadow-[0_0_20px_rgba(255,235,140,0.8)]" />
            <div className="absolute left-4 top-4 h-4 w-12 rounded-full bg-white/70 blur-[0.5px]" />
            <div className="absolute left-10 top-6 h-3 w-10 rounded-full bg-white/60" />
          </>
        )}

        {showRain && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[12, 28, 44, 62, 78, 90].map((leftPct, i) => (
              <div
                key={leftPct}
                className="rain-streak absolute top-0 h-6 w-[1.5px] rounded-full bg-white/50"
                style={{ left: `${leftPct}%`, animationDelay: `${i * 0.22}s` }}
              />
            ))}
          </div>
        )}

        {/* Interactive 1-Cat (Solo) or 2-Cats (Duo) Scene */}
        <div className="relative z-10 flex items-end justify-between pt-3">
          <button
            type="button"
            onClick={petCat}
            title={isDuo ? `Chạm để vuốt ve ${catName} & ${partnerCatName}` : `Chạm để vuốt ve ${catName}`}
            className="group relative flex items-end focus:outline-none"
          >
            {hearts.map((h) => (
              <span
                key={h}
                className="pointer-events-none -top-3 left-10 absolute animate-bounce text-base text-[#ef7b8d]"
              >
                ♡
              </span>
            ))}

            <CozyCatSvg
              catStyle={catStyle}
              mood={mood}
              isPlayingMusic={isPlayingMusic}
              scarfColor={HEART_BADGE_META[ownerHeart].hex}
              headphoneColor="#74b3e5"
              width={isDuo ? (compact ? 70 : 88) : compact ? 86 : 112}
              height={isDuo ? (compact ? 62 : 76) : compact ? 74 : 94}
              furColor="#fffaf0"
              wearBeanie={activeDecor.includes('cozy-beanie')}
            />

            {isDuo && (
              <>
                <span className="mb-10 -mx-2 text-sm text-[#e87989] animate-pulse">
                  ♡
                </span>
                <CozyCatSvg
                  catStyle={catStyle}
                  mood={mood}
                  isPlayingMusic={isPlayingMusic}
                  scarfColor={HEART_BADGE_META[partnerHeart].hex}
                  headphoneColor="#8dc99d"
                  width={compact ? 68 : 84}
                  height={compact ? 60 : 72}
                  furColor="#f8ecd9"
                  wearBeanie={activeDecor.includes('cozy-beanie')}
                />
              </>
            )}
          </button>

          {/* Unlocked Sill Props + Status badge */}
          <div className="flex flex-col items-end gap-1.5 pb-1">
            {(activeDecor.includes('cactus') ||
              activeDecor.includes('steaming-mug') ||
              activeDecor.includes('books')) && (
              <div className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-sm shadow-2xs">
                {activeDecor.includes('steaming-mug') && <span title="Ly cà phê ấm">☕</span>}
                {activeDecor.includes('cactus') && <span title="Chậu xương rồng">🌵</span>}
                {activeDecor.includes('books') && <span title="Chồng sách lofi">📚</span>}
              </div>
            )}
            {isDuo && partnerOnline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#2f6e44] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#8cf0a8]" />
                Đang online cùng nhau
              </span>
            )}
            {isPlayingMusic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#3a75a8] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                <Sparkles className="h-3 w-3" /> Đang chill
              </span>
            )}
            <div className="rounded-xl border border-[#dfcba9] bg-[#fffaf0] px-2.5 py-1.5 text-right text-xs text-[#382619] shadow-sm">
              <div className="font-extrabold">
                {isDuo ? `${catName} & ${partnerCatName}` : catName}
              </div>
              <div className="text-[10px] font-medium text-[#6b5340]">
                {isDuo
                  ? `${HEART_BADGE_META[ownerHeart].emoji} ${ownerNick} • ${HEART_BADGE_META[partnerHeart].emoji} ${partnerNick}`
                  : totalCount > 0
                    ? `Xong ${completedCount}/${totalCount} việc`
                    : 'Chạm mèo để nựng'}
              </div>
            </div>
            {isDuo && onSendHeartPing && !compact && (
              <button
                type="button"
                onClick={onSendHeartPing}
                className="inline-flex items-center gap-1 rounded-full bg-[#c45b6d] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs transition hover:bg-[#ad4c5d]"
              >
                <Heart className="h-3 w-3" /> Gửi ♡
              </button>
            )}
          </div>
        </div>
      </div>

      {bubble && (
        <div className="mt-2 rounded-2xl border border-[#dfc8a6] bg-[#fffaf0] px-3 py-1.5 text-xs font-semibold text-[#382619] shadow-sm">
          {bubble}
        </div>
      )}

      {!compact && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(MOOD_META) as CatMood[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeMood(m)}
                className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                  mood === m
                    ? `${MOOD_META[m].badgeBg} border-transparent shadow-xs`
                    : isNight
                      ? 'border-[#5a4332] bg-[#3b2d22] text-[#f0e3d0] hover:bg-[#49372a]'
                      : 'border-[#e2cfb3] bg-[#f4ead8] text-[#4b3525] hover:bg-[#ece0c9]'
                }`}
              >
                {MOOD_META[m].emoji} {MOOD_META[m].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(WEATHER_META) as WeatherType[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onChangeWeather(w)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                    weather === w
                      ? 'border-transparent bg-[#3a75a8] text-white shadow-xs'
                      : isNight
                        ? 'border-[#543f2f] bg-[#382a20] text-[#e6d7c3] hover:bg-[#453428]'
                        : 'border-[#e2cfb3] bg-[#f4ead8] text-[#553e2c] hover:bg-[#ece0c9]'
                  }`}
                >
                  {WEATHER_META[w].emoji} {WEATHER_META[w].label}
                </button>
              ))}
            </div>

            {onToggleDecor && (
              <button
                type="button"
                onClick={() => setDecorOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full bg-[#b57a29] px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-2xs hover:bg-[#99651f]"
              >
                <Fish className="h-3 w-3" /> {fishPoints} cá • Đồ mèo
              </button>
            )}
          </div>

          {decorOpen && onToggleDecor && (
            <div
              className={`rounded-2xl border p-2.5 text-xs ${
                isNight
                  ? 'border-[#5a4230] bg-[#241b14] text-[#f2e5d2]'
                  : 'border-[#e0ccb0] bg-[#f5ecdc] text-[#382619]'
              }`}
            >
              <div className="mb-1.5 text-[11px] font-bold opacity-85">
                🐟 Tích cá từ chụp ảnh, ghi chú & xong việc để mở đồ trang trí cửa sổ:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CAT_DECOR_CATALOG.map((item) => {
                  const unlocked = fishPoints >= item.fishCost;
                  const active = activeDecor.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onToggleDecor(item.id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        !unlocked
                          ? 'cursor-not-allowed bg-black/10 opacity-50'
                          : active
                            ? 'bg-[#3d7c57] text-white'
                            : 'bg-white text-[#382619] hover:bg-[#efe4d1]'
                      }`}
                    >
                      {item.emoji} {item.label}
                      {!unlocked ? ` (${item.fishCost}🐟)` : active ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
