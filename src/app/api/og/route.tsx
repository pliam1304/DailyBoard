import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { ImageResponse } from '@takumi-rs/image-response';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

let cachedFonts:
  | {
      name: string;
      data: Buffer;
      weight: number;
      style: 'normal';
      generic: 'sans-serif';
    }[]
  | null = null;

function loadOgFonts() {
  if (cachedFonts) return cachedFonts;
  const fontsDir = path.join(process.cwd(), 'src/assets/fonts');
  cachedFonts = [
    {
      name: 'Be Vietnam Pro',
      data: fs.readFileSync(path.join(fontsDir, 'BeVietnamPro-SemiBold.ttf')),
      weight: 600,
      style: 'normal',
      generic: 'sans-serif',
    },
    {
      name: 'Be Vietnam Pro',
      data: fs.readFileSync(path.join(fontsDir, 'BeVietnamPro-ExtraBold.ttf')),
      weight: 800,
      style: 'normal',
      generic: 'sans-serif',
    },
  ];
  return cachedFonts;
}

const TILE_PALETTE = [
  { bg: '#eef6fc', border: '#8ec0e8', color: '#244f76', rot: '-3deg' },
  { bg: '#eef8f0', border: '#8dc99d', color: '#215431', rot: '2deg' },
  { bg: '#fdf2f4', border: '#e8a8b4', color: '#7d2f3c', rot: '-2deg' },
  { bg: '#fff9e8', border: '#dfc07c', color: '#6b4714', rot: '3deg' },
];

function renderDiaryOgElement(options?: {
  inviteCode?: string;
  boardTitle?: string;
}) {
  const cleanInvite = (options?.inviteCode || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 20)
    .toUpperCase();
  const cleanTitle = (options?.boardTitle || 'NHẬT KÍ').trim().slice(0, 14);
  const letters = Array.from(cleanTitle.toUpperCase());

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#b68655',
        padding: '22px',
        fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* Inner Warm Corkboard Frame */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f3e7d3',
          backgroundImage:
            'radial-gradient(rgba(148, 108, 68, 0.16) 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
          borderRadius: '34px',
          border: '4px solid #d5b48c',
          padding: '48px 54px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Pastel Washi Tape Strip */}
        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: '480px',
            width: '160px',
            height: '28px',
            backgroundColor: 'rgba(155, 206, 170, 0.72)',
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            display: 'flex',
          }}
        />

        {/* LEFT COLUMN: Brand Tiles + Crisp Vietnamese Copy */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '630px',
            height: '100%',
            paddingTop: '12px',
            paddingBottom: '10px',
          }}
        >
          {/* Top Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: cleanInvite ? '#3d7c57' : '#4a3425',
                color: '#fdf7ed',
                fontSize: '18px',
                fontWeight: 700,
                padding: '8px 18px',
                borderRadius: '999px',
                letterSpacing: '0.03em',
              }}
            >
              {cleanInvite
                ? `Lời mời bảng chung • ${cleanInvite}`
                : 'Scrapbook & Lofi Desk'}
            </div>
          </div>

          {/* Middle Hero: Puffy Scrapbook Letter Tiles + Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {letters.map((ch, idx) => {
                if (ch === ' ') {
                  return <div key={`sp-${idx}`} style={{ width: '16px', display: 'flex' }} />;
                }
                const pal = TILE_PALETTE[idx % TILE_PALETTE.length];
                return (
                  <div
                    key={`${ch}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '62px',
                      height: '70px',
                      backgroundColor: pal.bg,
                      border: `3px solid ${pal.border}`,
                      borderRadius: '18px',
                      color: pal.color,
                      fontSize: '36px',
                      fontWeight: 800,
                      boxShadow: '0 6px 14px rgba(74, 52, 37, 0.14)',
                      transform: `rotate(${pal.rot})`,
                    }}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#382619',
                  lineHeight: 1.28,
                }}
              >
                {cleanInvite
                  ? 'Cùng lưu giữ ảnh Polaroid, ghi chú & nghe nhạc Lofi mỗi ngày.'
                  : 'Góc nhật ký ảnh Polaroid, lọ viên nang & nhạc Lofi.'}
              </div>
              <div
                style={{
                  fontSize: '21px',
                  fontWeight: 600,
                  color: '#6b5340',
                  lineHeight: 1.4,
                }}
              >
                Riêng tư chuẩn AES-256 • Đồng bộ tức thì trên iPhone, MacBook & PC.
              </div>
            </div>

            {/* Clean Feature Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {[
                { label: 'Ảnh Polaroid', bg: '#fffaf0', color: '#4a3425' },
                { label: 'Lọ Viên Nang', bg: '#fff4dc', color: '#7a4e18' },
                { label: 'Phòng Nhạc Lofi', bg: '#e9f4fc', color: '#244f76' },
                { label: 'Bảng Đôi 2 Người', bg: '#eaf6ee', color: '#215431' },
              ].map((pill) => (
                <div
                  key={pill.label}
                  style={{
                    display: 'flex',
                    backgroundColor: pill.bg,
                    color: pill.color,
                    border: '2px solid rgba(182, 134, 85, 0.35)',
                    borderRadius: '999px',
                    padding: '8px 18px',
                    fontSize: '17px',
                    fontWeight: 700,
                  }}
                >
                  {pill.label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Domain */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#7a5c42',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '999px',
                backgroundColor: '#3d7c57',
                display: 'flex',
              }}
            />
            <span>dailyboard-ten.vercel.app</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Tilted Polaroid Card + Capsule Jar Accent */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '410px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Main Tilted Polaroid Frame */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '340px',
              backgroundColor: '#fffdf8',
              borderRadius: '10px',
              padding: '18px 18px 26px 18px',
              boxShadow: '0 22px 44px rgba(56, 38, 25, 0.24)',
              border: '2px solid #e7d8c2',
              transform: 'rotate(-3deg)',
              position: 'relative',
            }}
          >
            {/* Washi Tape on Polaroid Top */}
            <div
              style={{
                position: 'absolute',
                top: '-14px',
                left: '110px',
                width: '116px',
                height: '26px',
                backgroundColor: 'rgba(130, 185, 228, 0.78)',
                borderRadius: '4px',
                transform: 'rotate(2deg)',
                display: 'flex',
              }}
            />

            {/* Warm Window Scene Inside Polaroid */}
            <div
              style={{
                width: '100%',
                height: '248px',
                borderRadius: '6px',
                background:
                  'linear-gradient(180deg, #7ebce8 0%, #c6e4f8 58%, #f6e7cc 100%)',
                border: '2px solid #d4c4ac',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Sun & Soft Clouds */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '24px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.78)',
                    display: 'flex',
                  }}
                />
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '999px',
                    backgroundColor: '#fff0a6',
                    boxShadow: '0 0 28px rgba(255, 236, 145, 0.95)',
                    display: 'flex',
                  }}
                />
              </div>

              {/* Minimal Cozy Cat Silhouette on Windowsill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: '#fffaf0',
                    border: '3px solid #423022',
                    borderRadius: '34px 34px 18px 18px',
                    width: '86px',
                    height: '76px',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '18px',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '999px',
                        backgroundColor: '#423022',
                        display: 'flex',
                      }}
                    />
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '999px',
                        backgroundColor: '#423022',
                        display: 'flex',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: '36px',
                      height: '10px',
                      borderRadius: '999px',
                      backgroundColor: '#7ebce8',
                      border: '2px solid #423022',
                      display: 'flex',
                    }}
                  />
                </div>

                {/* Date Stamp */}
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: 'rgba(56, 38, 25, 0.68)',
                    color: '#ffbe6b',
                    fontSize: '15px',
                    fontWeight: 800,
                    padding: '5px 10px',
                    borderRadius: '8px',
                    letterSpacing: '0.08em',
                  }}
                >
                  POLAROID FILM
                </div>
              </div>
            </div>

            {/* Polaroid Caption */}
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: '#382619',
              }}
            >
              Một ngày thật êm
            </div>
          </div>

          {/* Overlapping Mini 3D Capsule Card at Bottom Right */}
          <div
            style={{
              position: 'absolute',
              bottom: '26px',
              right: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#fffaf0',
              border: '3px solid #c89d6d',
              borderRadius: '22px',
              padding: '12px 18px',
              boxShadow: '0 14px 28px rgba(56, 38, 25, 0.22)',
              transform: 'rotate(3deg)',
            }}
          >
            {/* Two-tone Glossy Capsule Graphic */}
            <div
              style={{
                display: 'flex',
                width: '54px',
                height: '24px',
                borderRadius: '999px',
                overflow: 'hidden',
                border: '2px solid #8a5a44',
                transform: 'rotate(-16deg)',
              }}
            >
              <div
                style={{
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#f29cb0',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#fff3d6',
                  display: 'flex',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#382619',
                }}
              >
                Lọ Viên Nang
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#7a5c42',
                }}
              >
                Gửi lời nhắn cho ngày mai
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const inviteCode = req.nextUrl.searchParams.get('invite') || undefined;
  const boardTitle = req.nextUrl.searchParams.get('title') || undefined;

  return new ImageResponse(
    renderDiaryOgElement({ inviteCode, boardTitle }),
    {
      width: 1200,
      height: 630,
      format: 'png',
      fonts: loadOgFonts(),
      headers: {
        'Cache-Control':
          'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
