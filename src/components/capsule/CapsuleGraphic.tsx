'use client';

import React, { useId, useState } from 'react';
import type {
  CapsuleFinishId,
  CapsulePalette,
} from '@/lib/capsules';

interface CapsuleGraphicProps {
  palette: CapsulePalette;
  finishId?: CapsuleFinishId;
  charmEmoji?: string;
  rxStamp?: string;
  scrollHex?: string;
  splitProgress?: number; // 0 = closed, 0..0.99 = pulling apart, 1 = popped open
  size?: 'xs' | 'sm' | 'md' | 'lg';
  interactive3D?: boolean;
  float3D?: boolean;
  spinTriggerKey?: number;
  snapLocking?: boolean;
  showPedestal?: boolean;
  className?: string;
}

export function CapsuleGraphic({
  palette,
  finishId = 'gold-collar',
  charmEmoji = '🍀',
  rxStamp,
  scrollHex = '#f5e4c3',
  splitProgress = 0,
  size = 'md',
  interactive3D = false,
  float3D = false,
  spinTriggerKey = 0,
  snapLocking = false,
  showPedestal = false,
  className = '',
}: CapsuleGraphicProps) {
  const uid = useId().replace(/:/g, '');
  const [tilt, setTilt] = useState<{ rx: number; ry: number; glareX: number } | null>(
    null
  );

  const dims = {
    xs: { w: 56, h: 28 },
    sm: { w: 92, h: 44 },
    md: { w: 196, h: 88 },
    lg: { w: 256, h: 112 },
  }[size];

  const clamped = Math.max(0, Math.min(1, splitProgress));
  const offsetPx = clamped * 48;
  const tiltDeg = clamped * 20;
  const isDetailed = size === 'md' || size === 'lg';

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive3D) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / (rect.width || 1) - 0.5) * 2; // -1..1
    const ny = ((e.clientY - rect.top) / (rect.height || 1) - 0.5) * 2; // -1..1
    setTilt({
      rx: -ny * 20,
      ry: nx * 26,
      glareX: nx * 28,
    });
  };

  const handlePointerLeave = () => {
    if (!interactive3D) return;
    setTilt(null);
  };

  const wrapperAnimClass = snapLocking
    ? 'animate-capsule-snap-3d'
    : spinTriggerKey > 0
      ? 'animate-capsule-spin-360'
      : float3D && !tilt
        ? 'animate-capsule-3d-float'
        : '';

  return (
    <div
      key={spinTriggerKey > 0 ? `spin-${spinTriggerKey}` : 'idle'}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`capsule-3d-stage relative inline-flex items-center justify-center select-none ${className}`}
    >
      {/* 3D Tilted Golden Apothecary Pedestal Ring */}
      {showPedestal && isDetailed && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 flex items-center justify-center"
          style={{ width: dims.w * 0.86, height: dims.w * 0.86 }}
        >
          <div className="animate-pedestal-ring h-full w-full rounded-full border-2 border-dashed border-[#d9a648]/45 bg-radial from-[#ffd978]/15 to-transparent" />
        </div>
      )}

      <div
        className={`transition-transform duration-150 ease-out ${wrapperAnimClass}`}
        style={
          tilt && !snapLocking
            ? {
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.04)`,
              }
            : undefined
        }
      >
        <svg
          width={dims.w}
          height={dims.h}
          viewBox="0 0 250 108"
          className="overflow-visible drop-shadow-md"
          aria-hidden="true"
        >
          <defs>
            {/* Volumetric 5-Stop Studio PBR Cylindrical Gradient for Left Sleeve Cap */}
            <linearGradient id={`capA-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.halfALight} />
              <stop offset="20%" stopColor={palette.halfALight} />
              <stop offset="48%" stopColor={palette.halfA} />
              <stop offset="84%" stopColor={palette.halfADark} />
              <stop offset="100%" stopColor={palette.halfA} />
            </linearGradient>

            {/* Volumetric 5-Stop Studio PBR Cylindrical Gradient for Right Body */}
            <linearGradient id={`capB-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.halfBLight} />
              <stop offset="22%" stopColor={palette.halfBLight} />
              <stop offset="52%" stopColor={palette.halfB} />
              <stop offset="86%" stopColor={palette.halfBDark} />
              <stop offset="100%" stopColor={palette.halfB} />
            </linearGradient>

            {/* 3D Curved Metallic Collar Ring */}
            <linearGradient id={`collar-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffbe0" />
              <stop offset="25%" stopColor={palette.collarHex} />
              <stop offset="55%" stopColor="#fff8d4" />
              <stop offset="85%" stopColor="#94681d" />
              <stop offset="100%" stopColor={palette.collarHex} />
            </linearGradient>

            {/* Diagonal Candy Stripe Pattern */}
            <pattern
              id={`stripe-${uid}`}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(30)"
            >
              <rect width="6" height="14" fill="rgba(255,255,255,0.28)" />
            </pattern>

            <clipPath id={`leftClip-${uid}`}>
              <path d="M 54 20 H 122 A 7.5 31 0 0 1 122 82 H 54 A 31 31 0 0 1 54 20 Z" />
            </clipPath>
            <clipPath id={`rightClip-${uid}`}>
              <path d="M 116 22.5 H 194 A 28.5 28.5 0 0 1 194 79.5 H 116 Z" />
            </clipPath>
          </defs>

          {/* 3D Ground Contact Shadow */}
          <ellipse
            cx="125"
            cy="95"
            rx={74 + offsetPx * 0.55}
            ry="6.5"
            fill="rgba(38, 22, 10, 0.2)"
          />

          {/* RIGHT BODY HALF (halfB + Living Snowglobe Core!) */}
          <g
            transform={`translate(${offsetPx}, ${clamped * 3}) rotate(${tiltDeg}, 158, 51)`}
          >
            {/* Inner Rolled Parchment Scroll & Animated Snowglobe Particles inside Clear Shells */}
            {palette.translucent && (
              <g>
                {/* Rolled Scroll */}
                <g transform="translate(154, 51) scale(0.9)">
                  <rect
                    x="-28"
                    y="-12"
                    width="56"
                    height="24"
                    rx="5"
                    fill={scrollHex}
                    stroke="#b58d59"
                    strokeWidth="1.5"
                  />
                  <ellipse
                    cx="26"
                    cy="0"
                    rx="3.5"
                    ry="11.5"
                    fill="#e6cfa8"
                    stroke="#b58d59"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="-3"
                    y="-12.5"
                    width="5.2"
                    height="25"
                    rx="1.2"
                    fill="#d95365"
                  />
                  <circle cx="-0.4" cy="0" r="3.8" fill="#f27989" />
                </g>

                {/* Animated Living Snowglobe Particles (Fireflies / Ocean Bubbles / Sakura Petals) */}
                {isDetailed && palette.coreEffect === 'firefly' && (
                  <g fill="#ffe47a">
                    <circle cx="138" cy="34" r="2.2">
                      <animate
                        attributeName="cy"
                        values="34;30;34"
                        dur="2.6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.4;1;0.4"
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx="178" cy="66" r="1.9">
                      <animate
                        attributeName="cy"
                        values="66;61;66"
                        dur="3.1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx="196" cy="43" r="2.4">
                      <animate
                        attributeName="opacity"
                        values="1;0.35;1"
                        dur="2.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}

                {isDetailed && palette.coreEffect === 'ocean' && (
                  <g>
                    <circle
                      cx="142"
                      cy="65"
                      r="3.2"
                      fill="rgba(255,255,255,0.85)"
                      stroke="#7fd8d2"
                      strokeWidth="0.8"
                    >
                      <animate
                        attributeName="cy"
                        values="67;33;67"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx="188"
                      cy="38"
                      r="2.2"
                      fill="rgba(235,255,254,0.75)"
                    >
                      <animate
                        attributeName="cy"
                        values="64;35;64"
                        dur="3.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}

                {isDetailed && palette.coreEffect === 'sakura' && (
                  <g fill="#ff9eb5">
                    <ellipse cx="142" cy="35" rx="3.2" ry="1.8" transform="rotate(-25 142 35)">
                      <animate
                        attributeName="cy"
                        values="33;66;33"
                        dur="4.2s"
                        repeatCount="indefinite"
                      />
                    </ellipse>
                    <ellipse cx="188" cy="62" rx="2.8" ry="1.6" transform="rotate(20 188 62)">
                      <animate
                        attributeName="cy"
                        values="64;35;64"
                        dur="3.6s"
                        repeatCount="indefinite"
                      />
                    </ellipse>
                  </g>
                )}
              </g>
            )}

            {/* Right Body Outer Glass/Porcelain Shell */}
            <path
              d="M 116 22.5 H 194 A 28.5 28.5 0 0 1 194 79.5 H 116 Z"
              fill={`url(#capB-${uid})`}
              stroke={palette.stroke}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />

            <g clipPath={`url(#rightClip-${uid})`}>
              {/* Curved 3D Glass Highlight Band */}
              <rect
                x={122 + (tilt ? tilt.glareX * 0.35 : 0)}
                y="26.5"
                width="86"
                height="8.5"
                rx="4.2"
                fill="rgba(255,255,255,0.74)"
              />
              {/* Bottom Rim Bounce Shadow */}
              <rect
                x="122"
                y="71"
                width="84"
                height="4.5"
                rx="2.2"
                fill="rgba(0,0,0,0.09)"
              />
            </g>

            {rxStamp && !palette.translucent && size !== 'xs' && (
              <text
                x="162"
                y="55"
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="800"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill={
                  palette.id === 'starlight-gold'
                    ? 'rgba(255,235,190,0.82)'
                    : 'rgba(66,46,32,0.45)'
                }
              >
                {rxStamp}
              </text>
            )}
          </g>

          {/* Center Emergent Scroll & Rising Keepsake Charm When Splitting Apart! */}
          {clamped > 0.05 && (
            <g
              transform={`translate(125, ${51 - clamped * 6}) scale(${
                0.88 + clamped * 0.22
              })`}
            >
              {!palette.translucent && (
                <g>
                  <rect
                    x="-26"
                    y="-11"
                    width="52"
                    height="22"
                    rx="4.5"
                    fill={scrollHex}
                    stroke="#b58d59"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="-2.5"
                    y="-11.5"
                    width="5"
                    height="23"
                    rx="1"
                    fill="#d95365"
                  />
                </g>
              )}
              <text
                x="0"
                y={-15 - clamped * 12}
                textAnchor="middle"
                fontSize="21"
                style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.22))' }}
              >
                {charmEmoji}
              </text>
            </g>
          )}

          {/* LEFT SLEEVE CAP HALF (halfA — with Curved 3D Elliptical Mouth!) */}
          <g
            transform={`translate(${-offsetPx}, ${clamped * 3}) rotate(${-tiltDeg}, 86, 51)`}
          >
            <path
              d="M 54 20 H 122 A 7.5 31 0 0 1 122 82 H 54 A 31 31 0 0 1 54 20 Z"
              fill={`url(#capA-${uid})`}
              stroke={palette.stroke}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />

            <g clipPath={`url(#leftClip-${uid})`}>
              {finishId === 'candy-stripe' && (
                <rect
                  x="18"
                  y="18"
                  width="112"
                  height="66"
                  fill={`url(#stripe-${uid})`}
                />
              )}

              {(finishId === 'star-dust' || palette.shimmer) && (
                <g fill="rgba(255,248,210,0.9)">
                  <circle cx="46" cy="40" r="2" />
                  <circle cx="74" cy="65" r="1.7" />
                  <circle cx="98" cy="36" r="2.2" />
                  <circle cx="108" cy="61" r="1.5" />
                  <path d="M65 44 L67 49 L72 51 L67 53 L65 58 L63 53 L58 51 L63 49 Z" />
                </g>
              )}

              {finishId === 'heart-stamp' && (
                <path
                  d="M78 59 C78 59 66 51.5 66 44.5 C66 41 68.8 38.8 72 38.8 C74.4 38.8 76.4 40 78 42 C79.6 40 81.6 38.8 84 38.8 C87.2 38.8 90 41 90 44.5 C90 51.5 78 59 78 59 Z"
                  fill="rgba(255,255,255,0.36)"
                  stroke="rgba(255,255,255,0.72)"
                  strokeWidth="1.5"
                />
              )}

              {/* Primary Cylindrical Top Specular Shine + Pearl Dot */}
              <rect
                x={36 + (tilt ? tilt.glareX * 0.35 : 0)}
                y="25"
                width="80"
                height="9.5"
                rx="4.8"
                fill="rgba(255,255,255,0.62)"
              />
              <circle cx="29.5" cy="35" r="3.4" fill="rgba(255,255,255,0.68)" />
            </g>

            {/* 3D Curved Metallic Collar Ring around the Elliptical Seam */}
            {(finishId === 'gold-collar' || finishId === 'star-dust') && (
              <path
                d="M 114.5 20 H 122 A 7.5 31 0 0 1 122 82 H 114.5 A 7.5 31 0 0 0 114.5 20 Z"
                fill={`url(#collar-${uid})`}
                stroke={palette.stroke}
                strokeWidth="1.4"
              />
            )}

            {/* Dark 3D Hollow Cap Interior Opening visible as the capsule splits open! */}
            {clamped > 0.04 && (
              <ellipse
                cx="122"
                cy="51"
                rx="6.2"
                ry="29"
                fill="rgba(28, 16, 10, 0.55)"
                stroke={palette.stroke}
                strokeWidth="1.2"
              />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
