'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Dices,
  HeartHandshake,
  LayoutList,
  Lock,
  Pencil,
  Plus,
  RotateCw,
  Shuffle,
  Smartphone,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import {
  CAPSULE_CHARMS,
  CAPSULE_FINISHES,
  CAPSULE_PALETTES,
  CAPSULE_PRESCRIPTIONS,
  CAPSULE_SCROLL_SKINS,
  encodeCapsuleStyle,
  extractCapsulesFromNotes,
  JAR_VESSELS,
  parseCapsuleStyle,
  type CapsuleCharmId,
  type CapsuleColorId,
  type CapsuleFinishId,
  type CapsulePalette,
  type CapsulePrescriptionId,
  type CapsuleScrollSkinId,
  type JarVesselStyle,
} from '@/lib/capsules';
import { CapsuleGraphic } from '@/components/capsule/CapsuleGraphic';
import {
  formatDisplayDateVi,
  formatShortDate,
  parseDateKey,
  shiftDateKey,
  toLocalDateKey,
} from '@/lib/date';
import {
  checkRateLimit,
  decryptPrivateContent,
  encryptPrivateContent,
  isEncryptedContent,
  recordRateLimitFailure,
  resetRateLimit,
  sanitizeText,
  verifyJournalPin,
} from '@/lib/security';
import { createUuid, getMemberNickname, isSharedDuo } from '@/lib/sharing';
import { AuthorBadge } from '@/components/decor/ScrapbookDecor';
import type {
  BoardSharingState,
  NoteItem,
  ThemeMode,
} from '@/types/catyboard';

export const JAR_VESSEL_STORAGE_KEY = 'nhatki_jar_vessel_v1';

export function loadSavedJarVessel(): JarVesselStyle {
  if (typeof window === 'undefined') return 'apothecary';
  const raw = window.localStorage.getItem(JAR_VESSEL_STORAGE_KEY);
  if (raw === 'star-bottle' || raw === 'cat-jar' || raw === 'apothecary') {
    return raw;
  }
  return 'apothecary';
}

interface CapsuleJarModalProps {
  isOpen: boolean;
  initialMode?: 'jar' | 'compose';
  entryDate: string;
  notes: NoteItem[];
  sharing: BoardSharingState;
  journalPin?: string;
  theme: ThemeMode;
  onClose: () => void;
  onAddNote: (note: NoteItem) => void;
  onUpdateNote: (id: string, patch: Partial<NoteItem>) => void;
  onDeleteNote: (id: string) => void;
}

type ModalViewMode = 'jar' | 'compose' | 'tray';

interface PillBody {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  halfLen: number;
  radius: number;
  palette: CapsulePalette;
  finishId: CapsuleFinishId;
  scrollHex: string;
  isLocked: boolean;
  isToday: boolean;
  isFromPartner: boolean;
  dropping: boolean;
  pouringOut: boolean;
}

interface FireflyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

const CANVAS_W = 304;
const CANVAS_H = 368;
const JAR_CENTER_X = 152;
const FLOOR_Y = 342;

const QUICK_CAPSULE_PROMPTS = [
  'Một điều nhỏ hôm nay làm mình mỉm cười...',
  'Nếu ngày nào đó mở lại lúc đang buồn, hãy nhớ...',
  'Khoảnh khắc dễ thương nhất hôm nay là...',
  'Gửi một lời động viên ấm áp cho ngày mai...',
];

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey).getTime();
  const b = parseDateKey(toKey).getTime();
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

function getJarMilestone(count: number): {
  badge: string;
  title: string;
  nextGoal: number;
} {
  if (count >= 100) {
    return { badge: '👑', title: 'Kho Báu Năm Tháng', nextGoal: 365 };
  }
  if (count >= 30) {
    return { badge: '✨', title: 'Tiệm Thuốc Tâm Hồn', nextGoal: 100 };
  }
  if (count >= 7) {
    return { badge: '🌼', title: 'Hũ Nắng Dịu Dàng', nextGoal: 30 };
  }
  return { badge: '🌱', title: 'Lọ Nhỏ Khởi Đầu', nextGoal: 7 };
}

function closestPointsOnSegments(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): { px: number; py: number; qx: number; qy: number; s: number; t: number } {
  const ux = bx - ax;
  const uy = by - ay;
  const vx = dx - cx;
  const vy = dy - cy;
  const wx = ax - cx;
  const wy = ay - cy;

  const a = ux * ux + uy * uy;
  const b = ux * vx + uy * vy;
  const c = vx * vx + vy * vy;
  const d = ux * wx + uy * wy;
  const e = vx * wx + vy * wy;
  const denom = a * c - b * b;

  let s = 0;
  let t = 0;
  if (denom > 1e-6) {
    s = Math.max(0, Math.min(1, (b * e - c * d) / denom));
  }
  t = (b * s + e) / (c > 1e-6 ? c : 1);
  if (t < 0) {
    t = 0;
    s = Math.max(0, Math.min(1, -d / (a > 1e-6 ? a : 1)));
  } else if (t > 1) {
    t = 1;
    s = Math.max(0, Math.min(1, (b - d) / (a > 1e-6 ? a : 1)));
  }

  return {
    px: ax + s * ux,
    py: ay + s * uy,
    qx: cx + t * vx,
    qy: cy + t * vy,
    s,
    t,
  };
}

function getVesselNeckHalfWidth(vessel: JarVesselStyle): number {
  if (vessel === 'star-bottle') return 35;
  if (vessel === 'cat-jar') return 58;
  return 44;
}

function getJarHalfWidthAtY(y: number, vessel: JarVesselStyle): number {
  if (vessel === 'star-bottle') {
    if (y < 74) return 35;
    if (y < 112) {
      const t = (y - 74) / 38;
      const smooth = t * t * (3 - 2 * t);
      return 35 + smooth * (84 - 35);
    }
    const norm = Math.max(-0.96, Math.min(0.96, (y - 226) / 122));
    return Math.max(46, Math.sqrt(1 - norm * norm) * 120);
  }

  if (vessel === 'cat-jar') {
    if (y < 62) return 58;
    if (y < 96) {
      const t = (y - 62) / 34;
      return 58 + t * t * (116 - 58);
    }
    if (y > 318) {
      const t = Math.min(1, (y - 318) / 26);
      return 116 - t * 22;
    }
    return 116;
  }

  if (y < 66) return 44;
  if (y < 108) {
    const t = (y - 66) / 42;
    const smooth = t * t * (3 - 2 * t);
    return 44 + smooth * (115 - 44);
  }
  if (y > 322) {
    const t = Math.min(1, (y - 322) / 22);
    return 115 - t * 18;
  }
  return 115;
}

export function CapsuleJarModal({
  isOpen,
  initialMode = 'jar',
  entryDate,
  notes,
  sharing,
  journalPin,
  theme,
  onClose,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: CapsuleJarModalProps) {
  const todayKey = toLocalDateKey();
  const isNight = theme === 'cozy-night';
  const isDuo = isSharedDuo(sharing);
  const partnerRole = sharing.activeRole === 'owner' ? 'partner' : 'owner';
  const partnerNick = getMemberNickname(sharing, partnerRole);

  const [mode, setMode] = useState<ModalViewMode>(initialMode);
  const [jarVessel, setJarVessel] = useState<JarVesselStyle>(() =>
    loadSavedJarVessel()
  );
  const [filterPresc, setFilterPresc] = useState<
    CapsulePrescriptionId | 'all' | 'partner'
  >('all');

  // Composer / Edit Studio state
  const [editingCapsuleId, setEditingCapsuleId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] =
    useState<CapsuleColorId>('clear-firefly');
  const [selectedFinish, setSelectedFinish] =
    useState<CapsuleFinishId>('gold-collar');
  const [selectedPresc, setSelectedPresc] =
    useState<CapsulePrescriptionId>('gratitude');
  const [selectedCharm, setSelectedCharm] = useState<CapsuleCharmId>('clover');
  const [selectedScrollSkin, setSelectedScrollSkin] =
    useState<CapsuleScrollSkinId>('parchment');
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [unlockDateDraft, setUnlockDateDraft] = useState(() =>
    shiftDateKey(toLocalDateKey(), 7)
  );
  const [isPrivateDraft, setIsPrivateDraft] = useState(false);
  const [composePinDraft, setComposePinDraft] = useState('');
  const [composeError, setComposeError] = useState('');
  const [spinKey, setSpinKey] = useState(0);
  const [sealingCinema, setSealingCinema] = useState<'none' | 'open' | 'snap'>(
    'none'
  );

  // Session-verified PIN (strictly in React memory)
  const [sessionPin, setSessionPin] = useState('');

  // Unwrapping & interactive pull-apart ritual state (referenced by ID so never stale!)
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(
    null
  );
  const [unwrapStage, setUnwrapStage] = useState<
    'sealed' | 'pin_prompt' | 'popping' | 'unfurled'
  >('sealed');
  const [pullProgress, setPullProgress] = useState<number>(0);
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [pinUnlockInput, setPinUnlockInput] = useState('');
  const [pinUnlockError, setPinUnlockError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Gyroscope, Uncork & Pour state
  const [needsIosMotionPerm, setNeedsIosMotionPerm] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [visualTiltDeg, setVisualTiltDeg] = useState(0);
  const [corkOpen, setCorkOpen] = useState(false);
  const [pouringActive, setPouringActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bodiesRef = useRef<PillBody[]>([]);
  const firefliesRef = useRef<FireflyParticle[]>([]);
  const gravityRef = useRef<{ gx: number; gy: number }>({ gx: 0, gy: 0.52 });
  const visualTiltRef = useRef<number>(0);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
  }>({ active: false, startX: 0, startY: 0, lastX: 0 });
  const capsuleSwipeRef = useRef<{
    active: boolean;
    startX: number;
    latestProg: number;
  }>({ active: false, startX: 0, latestProg: 0 });
  const corkOpenRef = useRef(false);
  const jarVesselRef = useRef<JarVesselStyle>(jarVessel);
  const pendingDropIdRef = useRef<string | null>(null);

  const capsules = useMemo(() => extractCapsulesFromNotes(notes), [notes]);
  const capsulesRef = useRef<NoteItem[]>(capsules);
  useEffect(() => {
    capsulesRef.current = capsules;
  }, [capsules]);

  const selectedCapsule = useMemo(
    () =>
      selectedCapsuleId
        ? capsules.find((c) => c.id === selectedCapsuleId) ?? null
        : null,
    [capsules, selectedCapsuleId]
  );

  const todayCapsulesCount = useMemo(
    () => capsules.filter((c) => c.entryDate === todayKey).length,
    [capsules, todayKey]
  );
  const monthPrefix = todayKey.slice(0, 7);
  const monthCapsulesCount = useMemo(
    () => capsules.filter((c) => c.entryDate.startsWith(monthPrefix)).length,
    [capsules, monthPrefix]
  );

  const recentSevenDays = useMemo(() => {
    return [-6, -5, -4, -3, -2, -1, 0].map((offset) => {
      const dk = shiftDateKey(todayKey, offset);
      const dayPill = capsules.find((c) => c.entryDate === dk);
      return {
        dateKey: dk,
        shortDay: offset === 0 ? 'Nay' : dk.slice(8, 10),
        palette: dayPill ? parseCapsuleStyle(dayPill.paperStyle).palette : null,
      };
    });
  }, [capsules, todayKey]);

  const milestone = useMemo(
    () => getJarMilestone(capsules.length),
    [capsules.length]
  );

  const filteredCapsules = useMemo(() => {
    return capsules.filter((c) => {
      if (filterPresc === 'all') return true;
      if (filterPresc === 'partner') {
        return Boolean(c.authorRole && c.authorRole !== sharing.activeRole);
      }
      return parseCapsuleStyle(c.paperStyle).prescriptionId === filterPresc;
    });
  }, [capsules, filterPresc, sharing.activeRole]);

  const setCorkStateImmediate = (open: boolean) => {
    corkOpenRef.current = open;
    setCorkOpen(open);
  };

  const setTiltImmediate = (deg: number) => {
    visualTiltRef.current = deg;
    setVisualTiltDeg(deg);
  };

  const handleChangeVessel = (v: JarVesselStyle) => {
    setJarVessel(v);
    jarVesselRef.current = v;
    ambientEngine.playGlassClink(0.65);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(JAR_VESSEL_STORAGE_KEY, v);
      window.dispatchEvent(new Event('nhatki-jar-vessel-changed'));
    }
  };

  const randomizeComposerDesign = () => {
    ambientEngine.playGlassClink(0.5);
    const randColor =
      CAPSULE_PALETTES[Math.floor(Math.random() * CAPSULE_PALETTES.length)].id;
    const randFinish =
      CAPSULE_FINISHES[Math.floor(Math.random() * CAPSULE_FINISHES.length)].id;
    const randCharm =
      CAPSULE_CHARMS[Math.floor(Math.random() * CAPSULE_CHARMS.length)].id;
    const randScroll =
      CAPSULE_SCROLL_SKINS[
        Math.floor(Math.random() * CAPSULE_SCROLL_SKINS.length)
      ].id;
    setSelectedColor(randColor);
    setSelectedFinish(randFinish);
    setSelectedCharm(randCharm);
    setSelectedScrollSkin(randScroll);
  };

  const resetComposerForm = useCallback(() => {
    setEditingCapsuleId(null);
    setTitleDraft('');
    setContentDraft('');
    setComposePinDraft('');
    setComposeError('');
    setIsPrivateDraft(false);
    setUnlockDateDraft(shiftDateKey(toLocalDateKey(), 7));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedCapsuleId(null);
      setConfirmDeleteId(null);
      resetComposerForm();
      setCorkStateImmediate(false);
      setPouringActive(false);
      setTiltImmediate(0);
      setPullProgress(0);

      if (firefliesRef.current.length === 0) {
        firefliesRef.current = Array.from({ length: 14 }, () => ({
          x: 65 + Math.random() * 174,
          y: 95 + Math.random() * 215,
          vx: (Math.random() - 0.5) * 0.24,
          vy: -0.12 - Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          size: 1.4 + Math.random() * 1.8,
        }));
      }
    }
  }, [isOpen, initialMode, resetComposerForm]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const OrientationCtor = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof OrientationCtor?.requestPermission === 'function') {
      setNeedsIosMotionPerm(true);
    } else if ('DeviceOrientationEvent' in window) {
      setMotionEnabled(true);
    }
  }, [isOpen]);

  const requestMotionPermission = async () => {
    if (typeof window === 'undefined') return;
    try {
      const OrientationCtor = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof OrientationCtor?.requestPermission === 'function') {
        const res = await OrientationCtor.requestPermission();
        if (res === 'granted') {
          setMotionEnabled(true);
          setNeedsIosMotionPerm(false);
        }
      } else {
        setMotionEnabled(true);
      }
    } catch {
      // Fallback to touch/drag tilt
    }
  };

  const shakeJar = useCallback((strength = 1) => {
    ambientEngine.playGlassClink(0.95);
    for (const b of bodiesRef.current) {
      b.vx += (Math.random() - 0.5) * 11 * strength;
      b.vy -= (4.5 + Math.random() * 6.2) * strength;
      b.omega += (Math.random() - 0.5) * 0.34 * strength;
    }
  }, []);

  const inspectCapsule = useCallback(
    (capsule: NoteItem) => {
      setMode('jar');
      setSelectedCapsuleId(capsule.id);
      setConfirmDeleteId(null);
      setPinUnlockInput('');
      setPinUnlockError('');
      setPullProgress(0);
      capsuleSwipeRef.current = { active: false, startX: 0, latestProg: 0 };

      const isTimeLocked = Boolean(
        capsule.unlockDate && capsule.unlockDate > todayKey
      );
      if (isTimeLocked) {
        setUnwrapStage('sealed');
        ambientEngine.playGlassClink(0.6);
        return;
      }

      if (capsule.isPrivate || isEncryptedContent(capsule.content)) {
        if (!journalPin && !isEncryptedContent(capsule.content)) {
          setDecryptedText(capsule.content);
          setUnwrapStage('sealed');
          return;
        }
        if (sessionPin) {
          void decryptPrivateContent(capsule.content, sessionPin).then((res) => {
            if (res !== null) {
              setDecryptedText(res);
              setUnwrapStage('sealed');
            } else {
              setUnwrapStage('pin_prompt');
            }
          });
          return;
        }
        setUnwrapStage('pin_prompt');
        return;
      }

      setDecryptedText(capsule.content);
      setUnwrapStage('sealed');
    },
    [journalPin, sessionPin, todayKey]
  );

  const inspectCapsuleRef = useRef(inspectCapsule);
  useEffect(() => {
    inspectCapsuleRef.current = inspectCapsule;
  }, [inspectCapsule]);

  const beginEditCapsule = (capsule: NoteItem, plainContent: string) => {
    const meta = parseCapsuleStyle(capsule.paperStyle);
    setEditingCapsuleId(capsule.id);
    setSelectedColor(meta.colorId);
    setSelectedFinish(meta.finishId);
    setSelectedPresc(meta.prescriptionId);
    setSelectedCharm(meta.charmId);
    setSelectedScrollSkin(meta.scrollSkinId);
    setTitleDraft(capsule.title);
    setContentDraft(plainContent);
    setIsPrivateDraft(capsule.isPrivate);
    setUnlockDateDraft(capsule.unlockDate || shiftDateKey(todayKey, 7));
    setSelectedCapsuleId(null);
    setMode('compose');
  };

  // DeviceOrientation + DeviceMotion shake
  useEffect(() => {
    if (!isOpen || !motionEnabled || typeof window === 'undefined') return;

    let lastShakeMs = 0;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (dragStateRef.current.active) return;
      const gamma = typeof e.gamma === 'number' ? e.gamma : 0;
      const beta = typeof e.beta === 'number' ? e.beta : 55;
      const gx = Math.max(-0.92, Math.min(0.92, (gamma / 42) * 0.76));
      const gy =
        beta < -12
          ? Math.max(-0.75, (beta / 45) * 0.65)
          : Math.max(0.24, Math.min(0.8, ((beta + 22) / 70) * 0.58));
      gravityRef.current = { gx, gy };
      setTiltImmediate(Math.max(-20, Math.min(20, gamma * 0.28)));
    };

    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const mag =
        Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
      const now = performance.now();
      if (mag > 34 && now - lastShakeMs > 700) {
        lastShakeMs = now;
        shakeJar(1.08);
      }
    };

    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('devicemotion', onMotion);
    };
  }, [isOpen, motionEnabled, shakeJar]);

  // Persist settled physics bodies across tab switches; ONLY spawn new body at bottleneck!
  useEffect(() => {
    if (!isOpen) return;
    const visibleNotes = capsules.slice(0, 90);
    const existingById = new Map(bodiesRef.current.map((b) => [b.id, b]));
    const nextBodies: PillBody[] = visibleNotes.map((note, index) => {
      const meta = parseCapsuleStyle(note.paperStyle);
      const isLocked = Boolean(note.unlockDate && note.unlockDate > todayKey);
      const isToday = note.entryDate === todayKey;
      const isFromPartner = Boolean(
        isDuo && note.authorRole && note.authorRole !== sharing.activeRole
      );
      const prev = existingById.get(note.id);
      if (prev) {
        prev.palette = meta.palette;
        prev.finishId = meta.finishId;
        prev.scrollHex = meta.scrollSkin.swatchHex;
        prev.isLocked = isLocked;
        prev.isToday = isToday;
        prev.isFromPartner = isFromPartner;
        return prev;
      }

      const isJustDropped = pendingDropIdRef.current === note.id;
      if (isJustDropped) {
        pendingDropIdRef.current = null;
        return {
          id: note.id,
          x: JAR_CENTER_X + (Math.random() - 0.5) * 6,
          y: 10,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 3.6,
          angle: (Math.random() - 0.5) * 0.5,
          omega: (Math.random() - 0.5) * 0.08,
          halfLen: 9,
          radius: 7.4,
          palette: meta.palette,
          finishId: meta.finishId,
          scrollHex: meta.scrollSkin.swatchHex,
          isLocked,
          isToday,
          isFromPartner,
          dropping: true,
          pouringOut: false,
        };
      }

      const col = index % 5;
      const row = Math.floor(index / 5);
      return {
        id: note.id,
        x: 76 + col * 36 + (row % 2) * 9 + (Math.random() - 0.5) * 5,
        y: Math.max(92, FLOOR_Y - 12 - row * 16),
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0,
        angle: (Math.random() - 0.5) * Math.PI,
        omega: 0,
        halfLen: 9,
        radius: 7.4,
        palette: meta.palette,
        finishId: meta.finishId,
        scrollHex: meta.scrollSkin.swatchHex,
        isLocked,
        isToday,
        isFromPartner,
        dropping: false,
        pouringOut: false,
      };
    });

    bodiesRef.current = nextBodies;
  }, [capsules, isOpen, todayKey, isDuo, sharing.activeRole]);

  // Smooth, jam-free "Pour 1 Pill Out of Neck" animation!
  const triggerSmoothPourOut = () => {
    const candidates = filteredCapsules.filter(
      (c) => !c.unlockDate || c.unlockDate <= todayKey
    );
    const pool = candidates.length > 0 ? candidates : filteredCapsules;
    if (pool.length === 0 || pouringActive) return;

    const chosenNote = pool[Math.floor(Math.random() * pool.length)];
    const targetBody = bodiesRef.current.find((b) => b.id === chosenNote.id);

    ambientEngine.playCorkPop();
    setCorkStateImmediate(true);
    setPouringActive(true);
    setTiltImmediate(-18);

    if (targetBody) {
      targetBody.pouringOut = true;
    } else {
      setTimeout(() => {
        setPouringActive(false);
        setCorkStateImmediate(false);
        setTiltImmediate(0);
        inspectCapsule(chosenNote);
      }, 420);
    }
  };

  // 60fps 2D Canvas Physics & 3D Cylindrical Pill Renderer
  useEffect(() => {
    if (!isOpen || mode !== 'jar') return;
    let rafId = 0;
    let frameTick = 0;

    const stepAndDraw = () => {
      frameTick += 1;
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(stepAndDraw);
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(CANVAS_W * dpr);
      const targetH = Math.round(CANVAS_H * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bodies = bodiesRef.current;
      const vessel = jarVesselRef.current;
      const neckHalfW = getVesselNeckHalfWidth(vessel);
      const { gx, gy } = gravityRef.current;
      const isUpsideDown = corkOpenRef.current && gy < -0.08;

      for (const b of bodies) {
        if (b.pouringOut) {
          // Guided smooth levitation/pour right up through the open bottleneck!
          b.vx = (JAR_CENTER_X - b.x) * 0.16;
          b.vy = -5.8;
          b.omega = 0.08;
          b.x += b.vx;
          b.y += b.vy;
          b.angle += b.omega;

          if (b.y < 14) {
            b.pouringOut = false;
            b.x = JAR_CENTER_X;
            b.y = 140;
            b.vx = 0;
            b.vy = 1.2;
            setPouringActive(false);
            setCorkStateImmediate(false);
            setTiltImmediate(0);
            ambientEngine.playGlassClink(0.95);
            const noteObj = capsulesRef.current.find((n) => n.id === b.id);
            if (noteObj) inspectCapsuleRef.current(noteObj);
            break;
          }
          continue;
        }

        let ax = gx;
        if (isUpsideDown && b.y < 150) {
          ax += (JAR_CENTER_X - b.x) * 0.018;
        }
        b.vx = (b.vx + ax) * 0.986;
        b.vy = (b.vy + gy) * 0.986;
        b.omega *= 0.93;
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.omega;
        if (b.dropping && b.y > 88) {
          b.dropping = false;
        }

        // Physical tilt-phone pour detection when cork is opened manually
        if (
          corkOpenRef.current &&
          !b.dropping &&
          b.y < 20 &&
          Math.abs(b.x - JAR_CENTER_X) < neckHalfW
        ) {
          b.y = 135;
          b.x = JAR_CENTER_X;
          b.vx = 0;
          b.vy = 1.2;
          setCorkStateImmediate(false);
          setPouringActive(false);
          setTiltImmediate(0);
          gravityRef.current = { gx: 0, gy: 0.52 };
          ambientEngine.playGlassClink(1);
          const pouredNote = capsulesRef.current.find((n) => n.id === b.id);
          if (pouredNote) inspectCapsuleRef.current(pouredNote);
          break;
        }
      }

      // 3-iteration collision solver
      for (let iter = 0; iter < 3; iter += 1) {
        for (const b of bodies) {
          if (b.pouringOut) continue;
          const cos = Math.cos(b.angle);
          const sin = Math.sin(b.angle);

          for (const sign of [-1, 1]) {
            const lx = b.x + sign * cos * b.halfLen;
            const ly = b.y + sign * sin * b.halfLen;

            if (ly + b.radius > FLOOR_Y) {
              const pen = ly + b.radius - FLOOR_Y;
              b.y -= pen;
              if (b.vy > 0) {
                if (iter === 0 && b.vy > 2.3) {
                  ambientEngine.playGlassClink(Math.min(1, b.vy / 8));
                }
                b.vy *= -0.3;
                b.vx *= 0.86;
              }
              b.omega -= sign * cos * pen * 0.03;
            }

            const inOpenNeck =
              corkOpenRef.current &&
              Math.abs(lx - JAR_CENTER_X) < neckHalfW - b.radius * 0.45;
            const ceilingY = b.dropping || inOpenNeck ? -42 : 54;
            if (ly - b.radius < ceilingY) {
              const pen = ceilingY - (ly - b.radius);
              b.y += pen;
              if (b.vy < 0) b.vy *= -0.3;
              b.omega += sign * cos * pen * 0.025;
            }

            const halfW = getJarHalfWidthAtY(Math.max(28, ly), vessel);
            const minX = JAR_CENTER_X - halfW + b.radius;
            const maxX = JAR_CENTER_X + halfW - b.radius;
            if (lx < minX) {
              const pen = minX - lx;
              b.x += pen;
              if (b.vx < 0) {
                if (iter === 0 && Math.abs(b.vx) > 2.4) {
                  ambientEngine.playGlassClink(Math.min(1, Math.abs(b.vx) / 8));
                }
                b.vx *= -0.34;
              }
              b.omega += sign * sin * pen * 0.028;
            } else if (lx > maxX) {
              const pen = lx - maxX;
              b.x -= pen;
              if (b.vx > 0) {
                if (iter === 0 && Math.abs(b.vx) > 2.4) {
                  ambientEngine.playGlassClink(Math.min(1, Math.abs(b.vx) / 8));
                }
                b.vx *= -0.34;
              }
              b.omega -= sign * sin * pen * 0.028;
            }
          }
        }

        for (let i = 0; i < bodies.length; i += 1) {
          const a = bodies[i];
          if (a.pouringOut) continue;
          const acos = Math.cos(a.angle) * a.halfLen;
          const asin = Math.sin(a.angle) * a.halfLen;
          const ax1 = a.x - acos;
          const ay1 = a.y - asin;
          const ax2 = a.x + acos;
          const ay2 = a.y + asin;

          for (let j = i + 1; j < bodies.length; j += 1) {
            const b = bodies[j];
            if (b.pouringOut) continue;
            const maxReach = a.halfLen + b.halfLen + a.radius + b.radius;
            if (
              Math.abs(b.x - a.x) > maxReach ||
              Math.abs(b.y - a.y) > maxReach
            ) {
              continue;
            }

            const bcos = Math.cos(b.angle) * b.halfLen;
            const bsin = Math.sin(b.angle) * b.halfLen;
            const cp = closestPointsOnSegments(
              ax1,
              ay1,
              ax2,
              ay2,
              b.x - bcos,
              b.y - bsin,
              b.x + bcos,
              b.y + bsin
            );

            const dx = cp.qx - cp.px;
            const dy = cp.qy - cp.py;
            const distSq = dx * dx + dy * dy;
            const minDist = a.radius + b.radius;

            if (distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq) || 0.001;
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minDist - dist) * 0.5;

              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;

              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const vn = rvx * nx + rvy * ny;
              if (vn < 0) {
                if (iter === 0 && -vn > 3.1) {
                  ambientEngine.playGlassClink(Math.min(0.85, -vn / 10));
                }
                const imp = -(1 + 0.26) * vn * 0.5;
                a.vx -= imp * nx;
                a.vy -= imp * ny;
                b.vx += imp * nx;
                b.vy += imp * ny;

                a.omega -= (cp.s - 0.5) * 2 * imp * 0.017;
                b.omega += (cp.t - 0.5) * 2 * imp * 0.017;
              }
            }
          }
        }
      }

      // Render Jar & 3D Cylindrical Capsules
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const traceVesselPath = () => {
        ctx.beginPath();
        if (vessel === 'star-bottle') {
          ctx.moveTo(116, 28);
          ctx.lineTo(188, 28);
          ctx.lineTo(188, 74);
          ctx.bezierCurveTo(192, 98, 276, 124, 276, 224);
          ctx.bezierCurveTo(276, 316, 218, 350, 152, 350);
          ctx.bezierCurveTo(86, 350, 28, 316, 28, 224);
          ctx.bezierCurveTo(28, 124, 112, 98, 116, 74);
          ctx.closePath();
        } else if (vessel === 'cat-jar') {
          ctx.moveTo(92, 34);
          ctx.lineTo(212, 34);
          ctx.lineTo(212, 62);
          ctx.bezierCurveTo(220, 80, 272, 90, 272, 126);
          ctx.lineTo(272, 316);
          ctx.quadraticCurveTo(272, 348, 238, 348);
          ctx.lineTo(66, 348);
          ctx.quadraticCurveTo(32, 348, 32, 316);
          ctx.lineTo(32, 126);
          ctx.bezierCurveTo(32, 90, 84, 80, 92, 62);
          ctx.closePath();
        } else {
          ctx.moveTo(104, 28);
          ctx.lineTo(200, 28);
          ctx.lineTo(200, 64);
          ctx.bezierCurveTo(202, 84, 272, 84, 272, 112);
          ctx.lineTo(272, 322);
          ctx.quadraticCurveTo(272, 348, 244, 348);
          ctx.lineTo(60, 348);
          ctx.quadraticCurveTo(32, 348, 32, 322);
          ctx.lineTo(32, 112);
          ctx.bezierCurveTo(32, 84, 102, 84, 104, 64);
          ctx.closePath();
        }
      };

      // Table shadow
      ctx.beginPath();
      ctx.ellipse(JAR_CENTER_X, 357, 102, 7.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = isNight ? 'rgba(0,0,0,0.48)' : 'rgba(72,46,24,0.16)';
      ctx.fill();

      // Cork / Cat-Ear Lid
      ctx.save();
      if (corkOpenRef.current) {
        ctx.translate(36, -22);
        ctx.rotate(0.45);
      }
      if (vessel === 'cat-jar') {
        ctx.fillStyle = '#c4905a';
        ctx.strokeStyle = '#6c4724';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 25);
        ctx.lineTo(112, 6);
        ctx.lineTo(128, 21);
        ctx.lineTo(176, 21);
        ctx.lineTo(192, 6);
        ctx.lineTo(204, 25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawRoundedRectPath(ctx, 88, 20, 128, 20, 7);
        ctx.fill();
        ctx.stroke();
      } else {
        const corkW = vessel === 'star-bottle' ? 62 : 84;
        const corkX = JAR_CENTER_X - corkW / 2;
        drawRoundedRectPath(ctx, corkX, 8, corkW, 36, 9);
        const corkGrad = ctx.createLinearGradient(corkX, 8, corkX + corkW, 44);
        corkGrad.addColorStop(0, '#cfa06b');
        corkGrad.addColorStop(0.5, '#b6834c');
        corkGrad.addColorStop(1, '#986939');
        ctx.fillStyle = corkGrad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#6c4724';
        ctx.stroke();
      }
      ctx.restore();

      // Glass interior tint
      traceVesselPath();
      const lightShiftX = gx * 42;
      const glassBg = ctx.createLinearGradient(
        32 + lightShiftX,
        28,
        272 + lightShiftX,
        348
      );
      if (isNight) {
        glassBg.addColorStop(0, 'rgba(210, 232, 248, 0.14)');
        glassBg.addColorStop(0.5, 'rgba(180, 214, 238, 0.08)');
        glassBg.addColorStop(1, 'rgba(235, 220, 195, 0.18)');
      } else {
        glassBg.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
        glassBg.addColorStop(0.5, 'rgba(234, 246, 254, 0.48)');
        glassBg.addColorStop(1, 'rgba(255, 250, 240, 0.78)');
      }
      ctx.fillStyle = glassBg;
      ctx.fill();

      // Interior clip (except pouringOut pill which exits top!)
      ctx.save();
      traceVesselPath();
      ctx.clip();

      for (const f of firefliesRef.current) {
        f.x += f.vx - gx * 0.14;
        f.y += f.vy;
        if (f.y < 72) f.y = 330;
        if (f.x < 42) f.x = 260;
        if (f.x > 262) f.x = 46;
        const alpha =
          0.25 + 0.45 * Math.abs(Math.sin(frameTick * 0.035 + f.phase));
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fillStyle =
          vessel === 'star-bottle' || isNight
            ? `rgba(255, 230, 138, ${alpha})`
            : `rgba(255, 248, 220, ${alpha * 0.9})`;
        ctx.fill();
      }

      ctx.fillStyle = isNight
        ? 'rgba(244, 232, 214, 0.12)'
        : 'rgba(92, 66, 44, 0.11)';
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        vessel === 'cat-jar'
          ? '🐾 MOCHI REMEDY JAR 🐾'
          : vessel === 'star-bottle'
            ? '✦ STARLIGHT WISHES ✦'
            : 'APOTHECARY • SOUL PILLS',
        JAR_CENTER_X,
        138
      );
      ctx.restore();

      // Draw every 3D-shaded capsule
      for (const b of bodies) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        const r = b.radius;
        const hl = b.halfLen;

        // Soft pill shadow
        drawRoundedRectPath(ctx, -hl - r, -r + 2, (hl + r) * 2, r * 2, r);
        ctx.fillStyle = 'rgba(38, 24, 14, 0.16)';
        ctx.fill();

        // Inner rolled paper scroll for translucent crystal shells
        if (b.palette.translucent) {
          drawRoundedRectPath(ctx, -1, -r * 0.56, hl + r * 0.56, r * 1.12, 2);
          ctx.fillStyle = b.scrollHex || '#f5e4c3';
          ctx.fill();
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = '#b88e58';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(hl * 0.44, -r * 0.56);
          ctx.lineTo(hl * 0.44, r * 0.56);
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = '#d95365';
          ctx.stroke();
        }

        // Right half (halfB with 4-stop 3D volumetric cylindrical gradient)
        ctx.beginPath();
        ctx.moveTo(-1, -r);
        ctx.lineTo(hl, -r);
        ctx.arc(hl, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-1, r);
        ctx.closePath();
        const gradB = ctx.createLinearGradient(0, -r, 0, r);
        gradB.addColorStop(0, b.palette.halfBLight);
        gradB.addColorStop(0.45, b.palette.halfB);
        gradB.addColorStop(0.85, b.palette.halfBDark);
        gradB.addColorStop(1, b.palette.halfB);
        ctx.fillStyle = gradB;
        ctx.fill();

        // Living snowglobe micro-particle pulse inside translucent capsules
        if (b.palette.translucent) {
          const glowAlpha =
            0.45 + 0.45 * Math.abs(Math.sin(frameTick * 0.05 + b.x));
          ctx.fillStyle =
            b.palette.coreEffect === 'sakura'
              ? `rgba(255, 166, 190, ${glowAlpha})`
              : b.palette.coreEffect === 'ocean'
                ? `rgba(220, 255, 252, ${glowAlpha})`
                : `rgba(255, 232, 120, ${glowAlpha})`;
          ctx.beginPath();
          ctx.arc(hl * 0.68, -r * 0.25, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Left sleeve cap (halfA with curved 3D elliptical seam!)
        const capR = r + 0.55;
        ctx.beginPath();
        ctx.moveTo(1.2, -capR);
        ctx.lineTo(-hl, -capR);
        ctx.arc(-hl, 0, capR, -Math.PI / 2, Math.PI / 2, true);
        ctx.lineTo(1.2, capR);
        ctx.ellipse(1.2, 0, 2.1, capR, 0, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath();
        const gradA = ctx.createLinearGradient(0, -capR, 0, capR);
        gradA.addColorStop(0, b.palette.halfALight);
        gradA.addColorStop(0.45, b.palette.halfA);
        gradA.addColorStop(0.85, b.palette.halfADark);
        gradA.addColorStop(1, b.palette.halfA);
        ctx.fillStyle = gradA;
        ctx.fill();

        // Finish details on cap
        if (b.finishId === 'star-dust' || b.palette.shimmer) {
          ctx.fillStyle = 'rgba(255,248,210,0.88)';
          ctx.beginPath();
          ctx.arc(-hl * 0.65, -r * 0.15, 1.1, 0, Math.PI * 2);
          ctx.arc(-hl * 0.2, r * 0.32, 0.9, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.finishId === 'candy-stripe') {
          ctx.strokeStyle = 'rgba(255,255,255,0.34)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-hl * 0.9, r * 0.6);
          ctx.lineTo(-hl * 0.35, -r * 0.6);
          ctx.moveTo(-hl * 0.3, r * 0.6);
          ctx.lineTo(0.5, -r * 0.6);
          ctx.stroke();
        }

        // Metallic Gold Collar Band
        if (b.finishId === 'gold-collar' || b.finishId === 'star-dust') {
          ctx.fillStyle = b.palette.collarHex;
          ctx.fillRect(0.2, -capR, 2.3, capR * 2);
        }

        // Crisp outer capsule border
        drawRoundedRectPath(ctx, -hl - r, -r, (hl + r) * 2, r * 2, r);
        ctx.lineWidth = b.isToday || b.isFromPartner ? 1.9 : 1.35;
        ctx.strokeStyle = b.isFromPartner
          ? '#e05a7a'
          : b.isToday
            ? '#d4942a'
            : b.palette.stroke;
        ctx.stroke();

        // Specular shine along top cylinder
        drawRoundedRectPath(
          ctx,
          -hl - r * 0.45,
          -r * 0.68,
          (hl + r) * 1.38,
          r * 0.38,
          2.2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fill();

        if (b.isLocked) {
          ctx.fillStyle = '#fff6d6';
          ctx.beginPath();
          ctx.arc(-hl * 0.45, 0, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Outer glass rim & reflections
      traceVesselPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isNight
        ? 'rgba(218, 236, 250, 0.52)'
        : 'rgba(124, 164, 192, 0.72)';
      ctx.stroke();

      const rimW =
        vessel === 'star-bottle' ? 84 : vessel === 'cat-jar' ? 132 : 106;
      const rimY = vessel === 'cat-jar' ? 30 : 24;
      drawRoundedRectPath(ctx, JAR_CENTER_X - rimW / 2, rimY, rimW, 7.5, 3.8);
      ctx.fillStyle = isNight
        ? 'rgba(220, 238, 252, 0.34)'
        : 'rgba(255, 255, 255, 0.82)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isNight
        ? 'rgba(218, 236, 250, 0.5)'
        : 'rgba(124, 164, 192, 0.72)';
      ctx.stroke();

      if (vessel === 'star-bottle') {
        ctx.fillStyle = '#e0a938';
        ctx.fillRect(115, 64, 74, 4.5);
        ctx.font = '13px sans-serif';
        ctx.fillText('⭐', 184, 77);
      }

      const glareOffset = Math.max(-7, Math.min(7, -gx * 9));
      ctx.beginPath();
      if (vessel === 'star-bottle') {
        ctx.arc(JAR_CENTER_X, 224, 108, Math.PI * 0.72, Math.PI * 1.24);
      } else {
        ctx.moveTo(45 + glareOffset, 118);
        ctx.lineTo(45 + glareOffset, 312);
      }
      ctx.lineWidth = 4.8;
      ctx.lineCap = 'round';
      ctx.strokeStyle = isNight
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(255, 255, 255, 0.68)';
      ctx.stroke();

      ctx.restore();
      rafId = requestAnimationFrame(stepAndDraw);
    };

    rafId = requestAnimationFrame(stepAndDraw);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, mode, isNight]);

  // Rotation-aware Canvas Pointer Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    const stepX = e.clientX - dragStateRef.current.lastX;
    dragStateRef.current.lastX = e.clientX;

    const gx = Math.max(-0.92, Math.min(0.92, dx / 85));
    const gy = corkOpenRef.current
      ? Math.max(-0.68, Math.min(0.85, 0.44 + dy / 115))
      : Math.max(-0.42, Math.min(0.85, 0.52 + dy / 160));
    gravityRef.current = { gx, gy };
    setTiltImmediate(Math.max(-22, Math.min(22, dx * 0.2)));

    if (Math.abs(stepX) > 22) {
      for (const b of bodiesRef.current) {
        b.vx += stepX * 0.11;
        b.vy -= Math.min(3.4, Math.abs(stepX) * 0.055);
      }
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const moved =
      Math.hypot(
        e.clientX - dragStateRef.current.startX,
        e.clientY - dragStateRef.current.startY
      ) > 10;
    dragStateRef.current.active = false;
    gravityRef.current = { gx: 0, gy: 0.52 };
    setTiltImmediate(0);

    if (!moved && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      // Inverse-rotate pointer around element center so hit-testing is exact even when tilted!
      const centerClientX = rect.left + rect.width / 2;
      const centerClientY = rect.top + rect.height / 2;
      const relX = e.clientX - centerClientX;
      const relY = e.clientY - centerClientY;
      const rad = (-visualTiltRef.current * Math.PI) / 180;
      const unrotX = relX * Math.cos(rad) - relY * Math.sin(rad);
      const unrotY = relX * Math.sin(rad) + relY * Math.cos(rad);

      const scale = CANVAS_W / (rect.width || CANVAS_W);
      const cx = CANVAS_W / 2 + unrotX * scale;
      const cy = CANVAS_H / 2 + unrotY * scale;

      if (cy < 56 && Math.abs(cx - JAR_CENTER_X) < 70) {
        ambientEngine.playCorkPop();
        setCorkStateImmediate(!corkOpenRef.current);
        return;
      }

      let closest: PillBody | null = null;
      let bestDist = 24;
      for (const b of bodiesRef.current) {
        const d = Math.hypot(b.x - cx, b.y - cy);
        if (d < bestDist) {
          bestDist = d;
          closest = b;
        }
      }
      if (closest) {
        const found = capsules.find((n) => n.id === closest!.id);
        if (found) inspectCapsule(found);
      }
    }
  };

  const triggerPopAndUnfurl = (capsule: NoteItem, plainContent: string) => {
    setDecryptedText(plainContent);
    setPullProgress(1);
    setUnwrapStage('popping');
    ambientEngine.playCapsulePop();

    const meta = parseCapsuleStyle(capsule.paperStyle);
    const nextStyle = encodeCapsuleStyle(
      meta.colorId,
      meta.prescriptionId,
      meta.openedCount + 1,
      meta.charmId,
      meta.scrollSkinId,
      meta.finishId
    );
    onUpdateNote(capsule.id, { paperStyle: nextStyle });

    setTimeout(() => {
      ambientEngine.playPaperUnfurl();
      setUnwrapStage('unfurled');
    }, 430);
  };

  const onCapsulePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (unwrapStage !== 'sealed' || isSelectedTimeLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    capsuleSwipeRef.current = { active: true, startX: e.clientX, latestProg: 0 };
  };

  const onCapsulePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!capsuleSwipeRef.current.active || !selectedCapsule) return;
    const dist = Math.abs(e.clientX - capsuleSwipeRef.current.startX);
    const prog = Math.min(1, dist / 68);
    capsuleSwipeRef.current.latestProg = prog;
    setPullProgress(prog);
    if (prog >= 0.62) {
      capsuleSwipeRef.current.active = false;
      triggerPopAndUnfurl(selectedCapsule, decryptedText);
    }
  };

  const onCapsulePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!capsuleSwipeRef.current.active || !selectedCapsule) return;
    const dist = Math.abs(e.clientX - capsuleSwipeRef.current.startX);
    const latest = capsuleSwipeRef.current.latestProg;
    capsuleSwipeRef.current.active = false;
    if (dist < 8 || latest >= 0.62) {
      triggerPopAndUnfurl(selectedCapsule, decryptedText);
    } else {
      setPullProgress(0);
    }
  };

  const handleUnlockCapsuleWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapsule) return;
    const rate = checkRateLimit('journal_pin');
    if (!rate.allowed) {
      setPinUnlockError(`Thử sai nhiều lần — chờ ${rate.retryAfterSec}s nhé!`);
      return;
    }

    if (journalPin) {
      const validPin = await verifyJournalPin(pinUnlockInput, journalPin);
      if (!validPin) {
        const lim = recordRateLimitFailure('journal_pin');
        setPinUnlockError(
          lim.locked
            ? `Sai PIN — tạm khóa ${lim.retryAfterSec}s!`
            : 'Mã PIN chưa đúng!'
        );
        return;
      }
    }

    const plain = await decryptPrivateContent(
      selectedCapsule.content,
      pinUnlockInput
    );
    if (plain === null) {
      recordRateLimitFailure('journal_pin');
      setPinUnlockError('Không giải mã được bằng mã PIN này.');
      return;
    }

    resetRateLimit('journal_pin');
    setSessionPin(pinUnlockInput);
    setPinUnlockInput('');
    setPinUnlockError('');
    triggerPopAndUnfurl(selectedCapsule, plain);
  };

  const handleDrawRandomCapsule = () => {
    const unlocked = filteredCapsules.filter(
      (c) => !c.unlockDate || c.unlockDate <= todayKey
    );
    shakeJar(0.95);
    const pool = unlocked.length > 0 ? unlocked : filteredCapsules;
    if (pool.length === 0) return;

    const picked = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      inspectCapsule(picked);
    }, 260);
  };

  const handleSaveOrDropCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sealingCinema !== 'none') return;
    setComposeError('');
    const cleanText = sanitizeText(contentDraft, 8000);
    if (!cleanText) {
      setComposeError('Hãy viết vài dòng nhắn gửi để cuộn vào viên thuốc nhé!');
      return;
    }

    const effectiveUnlockDate =
      selectedPresc === 'time_locked'
        ? unlockDateDraft || shiftDateKey(todayKey, 7)
        : undefined;

    let finalContent = cleanText;
    if (isPrivateDraft && journalPin) {
      const pinToUse = composePinDraft.trim() || sessionPin;
      if (!pinToUse) {
        setComposeError(
          'Nhập mã PIN hiện tại để mã hóa riêng tư (AES-256) viên thuốc này.'
        );
        return;
      }
      const ok = await verifyJournalPin(pinToUse, journalPin);
      if (!ok) {
        setComposeError('Mã PIN xác nhận chưa đúng.');
        return;
      }
      setSessionPin(pinToUse);
      finalContent = await encryptPrivateContent(cleanText, pinToUse);
    }

    const prescMeta =
      CAPSULE_PRESCRIPTIONS.find((p) => p.id === selectedPresc) ??
      CAPSULE_PRESCRIPTIONS[0];
    const nowIso = new Date().toISOString();

    if (editingCapsuleId) {
      const existing = capsules.find((c) => c.id === editingCapsuleId);
      const prevOpened = existing
        ? parseCapsuleStyle(existing.paperStyle).openedCount
        : 0;
      onUpdateNote(editingCapsuleId, {
        title:
          sanitizeText(titleDraft, 120) ||
          `${prescMeta.emoji} ${prescMeta.label}`,
        content: finalContent,
        paperStyle: encodeCapsuleStyle(
          selectedColor,
          selectedPresc,
          prevOpened,
          selectedCharm,
          selectedScrollSkin,
          selectedFinish
        ),
        isPrivate: isPrivateDraft,
        unlockDate: effectiveUnlockDate,
        updatedAt: nowIso,
      });
      ambientEngine.playGlassClink(0.7);
      resetComposerForm();
      setMode('tray');
      return;
    }

    const newId = createUuid();
    const newCapsule: NoteItem = {
      id: newId,
      entryDate,
      kind: 'time_capsule',
      title:
        sanitizeText(titleDraft, 120) ||
        `${prescMeta.emoji} ${prescMeta.label}`,
      content: finalContent,
      paperStyle: encodeCapsuleStyle(
        selectedColor,
        selectedPresc,
        0,
        selectedCharm,
        selectedScrollSkin,
        selectedFinish
      ),
      isPrivate: isPrivateDraft,
      unlockDate: effectiveUnlockDate,
      pinned: false,
      authorRole: sharing.activeRole,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Play 3D Snap-Together Sealing Cinema before dropping into the jar!
    setSealingCinema('open');
    ambientEngine.playPaperUnfurl();

    setTimeout(() => {
      setSealingCinema('snap');
      ambientEngine.playCapsulePop();
    }, 260);

    setTimeout(() => {
      setSealingCinema('none');
      pendingDropIdRef.current = newId;
      setCorkStateImmediate(true);
      setSelectedCapsuleId(null);
      setMode('jar');
      ambientEngine.playCorkPop();
      onAddNote(newCapsule);
      resetComposerForm();

      setTimeout(() => {
        setCorkStateImmediate(false);
      }, 950);
    }, 980);
  };

  if (!isOpen) return null;

  const selectedMeta = selectedCapsule
    ? parseCapsuleStyle(selectedCapsule.paperStyle)
    : null;
  const isSelectedTimeLocked = Boolean(
    selectedCapsule?.unlockDate && selectedCapsule.unlockDate > todayKey
  );

  const activeComposePalette =
    CAPSULE_PALETTES.find((c) => c.id === selectedColor) ?? CAPSULE_PALETTES[0];
  const activeComposeCharm =
    CAPSULE_CHARMS.find((c) => c.id === selectedCharm) ?? CAPSULE_CHARMS[0];
  const activeComposePresc =
    CAPSULE_PRESCRIPTIONS.find((p) => p.id === selectedPresc) ??
    CAPSULE_PRESCRIPTIONS[0];
  const activeComposeScroll =
    CAPSULE_SCROLL_SKINS.find((s) => s.id === selectedScrollSkin) ??
    CAPSULE_SCROLL_SKINS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-2.5 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className={`my-auto w-full max-w-3xl rounded-[28px] border-2 p-4 shadow-2xl sm:p-6 ${
          isNight
            ? 'border-[#6f523b] bg-[#261c15] text-[#f4e8d6]'
            : 'border-[#c89d6d] bg-[#faf3e3] text-[#382619]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header + Clean 3-Mode Navigation */}
        <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold">💊 Lọ Thuốc Tâm Hồn</h2>
              <span className="rounded-full bg-[#b57a29] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                {capsules.length} viên
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${
                  isNight
                    ? 'border-[#6f523b] bg-[#36281e] text-[#ffd98e]'
                    : 'border-[#dfc69e] bg-[#fff8e8] text-[#7a4e18]'
                }`}
              >
                {milestone.badge} {milestone.title}
              </span>
            </div>
            <p className="mt-0.5 text-xs opacity-80">
              {todayCapsulesCount > 0
                ? `Hôm nay đã thả ${todayCapsulesCount} viên ✓ • Tháng này: ${monthCapsulesCount} viên`
                : `Chưa thả viên nào hôm nay • Tháng này: ${monthCapsulesCount} viên`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('jar');
              }}
              className={`rounded-2xl px-3 py-1.5 text-xs font-extrabold transition ${
                mode === 'jar'
                  ? 'bg-[#b57a29] text-white shadow-xs'
                  : isNight
                    ? 'bg-[#36281e] text-[#eadbc6]'
                    : 'bg-[#efe2cc] text-[#4a3425]'
              }`}
            >
              🫙 Lọ thuốc
            </button>
            <button
              type="button"
              onClick={() => {
                resetComposerForm();
                setMode('compose');
              }}
              className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-extrabold transition ${
                mode === 'compose'
                  ? 'bg-[#3d7c57] text-white shadow-xs'
                  : isNight
                    ? 'bg-[#36281e] text-[#eadbc6]'
                    : 'bg-[#efe2cc] text-[#4a3425]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> Bào chế
            </button>
            <button
              type="button"
              onClick={() => setMode('tray')}
              className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-extrabold transition ${
                mode === 'tray'
                  ? 'bg-[#3a75a8] text-white shadow-xs'
                  : isNight
                    ? 'bg-[#36281e] text-[#eadbc6]'
                    : 'bg-[#efe2cc] text-[#4a3425]'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Khay ({capsules.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng lọ thuốc"
              className={`rounded-full p-2 ${
                isNight
                  ? 'bg-[#3a2b20] text-[#f4e8d6] hover:bg-[#49372a]'
                  : 'bg-[#efe2cc] text-[#382619] hover:bg-[#e4d2b6]'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* === TAB 2: BESPOKE 3D CAPSULE CRAFTING STUDIO === */}
        {mode === 'compose' && (
          <form
            onSubmit={(e) => void handleSaveOrDropCapsule(e)}
            className="max-h-[75vh] space-y-3.5 overflow-y-auto pr-1"
          >
            {/* Interactive 3D Holo-Stage with Floating Pedestal & 360° Spin */}
            <div
              className={`relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl border-2 p-4 sm:flex-row ${
                isNight
                  ? 'border-[#6f523b] bg-gradient-to-br from-[#38291e] via-[#2a1f17] to-[#1e1610]'
                  : 'border-[#dfcba9] bg-gradient-to-br from-[#fffefa] via-[#faf0de] to-[#f1e1c5]'
              }`}
            >
              {/* Subtle moving ambient sheen across stage */}
              <div
                aria-hidden="true"
                className="animate-holo-sweep pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />

              <div className="flex flex-col items-center sm:flex-row sm:gap-5">
                <div className="py-2">
                  <CapsuleGraphic
                    palette={activeComposePalette}
                    finishId={selectedFinish}
                    charmEmoji={activeComposeCharm.emoji}
                    rxStamp={activeComposePresc.rxCode}
                    scrollHex={activeComposeScroll.swatchHex}
                    splitProgress={sealingCinema === 'open' ? 0.65 : 0}
                    snapLocking={sealingCinema === 'snap'}
                    interactive3D
                    float3D
                    showPedestal
                    spinTriggerKey={spinKey}
                    size="lg"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#b57a29]/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#b57a29]">
                    ✦ Mô hình 3D tương tác (di chuột / chạm để nghiêng)
                  </div>
                  <div className="mt-1 text-sm font-extrabold">
                    {activeComposePalette.label} •{' '}
                    {
                      CAPSULE_FINISHES.find((f) => f.id === selectedFinish)
                        ?.shortLabel
                    }
                  </div>
                  <div className="mt-0.5 text-xs opacity-80">
                    {activeComposePalette.subtitle} • Kèm{' '}
                    {activeComposeCharm.emoji} {activeComposeCharm.label}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    ambientEngine.playGlassClink(0.45);
                    setSpinKey((k) => k + 1);
                  }}
                  className={`inline-flex items-center gap-1 rounded-2xl border px-3 py-2 text-xs font-extrabold transition ${
                    isNight
                      ? 'border-[#6f523b] bg-[#3d2d22] text-[#f4e8d6] hover:bg-[#4a3729]'
                      : 'border-[#d6bc98] bg-white text-[#4a3425] shadow-2xs hover:bg-[#f4ead8]'
                  }`}
                >
                  <RotateCw className="h-3.5 w-3.5" /> Xoay 360°
                </button>
                <button
                  type="button"
                  onClick={() => {
                    randomizeComposerDesign();
                    setSpinKey((k) => k + 1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-2xl bg-[#b57a29] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#99651f]`}
                >
                  <Dices className="h-4 w-4" /> Phối ngẫu nhiên
                </button>
              </div>
            </div>

            {/* Step 1: 10 Collectible 3D Shell Palettes */}
            <div
              className={`rounded-2xl border p-3 text-xs ${
                isNight
                  ? 'border-[#5a4230] bg-[#32251c]'
                  : 'border-[#dfcba9] bg-white/85'
              }`}
            >
              <div className="mb-2 font-extrabold">
                1. Chọn chất liệu & màu vỏ nhộng 3D (10 phiên bản):
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {CAPSULE_PALETTES.map((pal) => {
                  const selected = selectedColor === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setSelectedColor(pal.id)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition ${
                        selected
                          ? 'border-[#b57a29] bg-[#fff6e0] text-[#382619] ring-2 ring-[#b57a29]/45 -translate-y-0.5 shadow-xs'
                          : isNight
                            ? 'border-[#4a3728] bg-[#261c15] text-[#eadbc6] hover:bg-[#38291f]'
                            : 'border-[#e8d9c0] bg-[#fbf7ef] text-[#382619] hover:bg-[#f3e8d4]'
                      }`}
                    >
                      <CapsuleGraphic
                        palette={pal}
                        finishId={selectedFinish}
                        size="xs"
                      />
                      <div className="w-full truncate text-[11px] font-extrabold">
                        {pal.label}
                      </div>
                      <div className="w-full truncate text-[9px] opacity-70">
                        {pal.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Shell Finish + Keepsake Charm + Scroll Skin */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div
                className={`rounded-2xl border p-2.5 text-xs ${
                  isNight
                    ? 'border-[#5a4230] bg-[#32251c]'
                    : 'border-[#dfcba9] bg-white/85'
                }`}
              >
                <div className="mb-1.5 font-extrabold">2. Họa tiết & Đai vỏ:</div>
                <div className="flex flex-wrap gap-1">
                  {CAPSULE_FINISHES.map((fn) => (
                    <button
                      key={fn.id}
                      type="button"
                      onClick={() => setSelectedFinish(fn.id)}
                      className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold transition ${
                        selectedFinish === fn.id
                          ? 'border-transparent bg-[#b57a29] text-white'
                          : isNight
                            ? 'border-[#4a3728] bg-[#261c15] text-[#eadbc6]'
                            : 'border-[#e5d5bc] bg-[#fbf5e9] text-[#382619]'
                      }`}
                    >
                      {fn.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-2.5 text-xs ${
                  isNight
                    ? 'border-[#5a4230] bg-[#32251c]'
                    : 'border-[#dfcba9] bg-white/85'
                }`}
              >
                <div className="mb-1.5 font-extrabold">3. Kỷ vật bỏ kèm:</div>
                <div className="flex flex-wrap gap-1">
                  {CAPSULE_CHARMS.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedCharm(ch.id)}
                      title={ch.label}
                      className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                        selectedCharm === ch.id
                          ? 'border-[#b57a29] bg-[#fff3d6] text-[#4a3425] scale-105'
                          : isNight
                            ? 'border-[#4a3728] bg-[#261c15]'
                            : 'border-[#e5d5bc] bg-[#fbf5e9]'
                      }`}
                    >
                      {ch.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-2.5 text-xs ${
                  isNight
                    ? 'border-[#5a4230] bg-[#32251c]'
                    : 'border-[#dfcba9] bg-white/85'
                }`}
              >
                <div className="mb-1.5 font-extrabold">4. Giấy cuộn thư:</div>
                <div className="flex flex-wrap gap-1">
                  {CAPSULE_SCROLL_SKINS.map((sk) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => setSelectedScrollSkin(sk.id)}
                      className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold transition ${
                        selectedScrollSkin === sk.id
                          ? 'border-transparent bg-[#3a75a8] text-white'
                          : isNight
                            ? 'border-[#4a3728] bg-[#261c15] text-[#eadbc6]'
                            : 'border-[#e5d5bc] bg-[#fbf5e9] text-[#382619]'
                      }`}
                    >
                      {sk.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Emotional Prescription */}
            <div>
              <div className="mb-1.5 text-xs font-extrabold">
                5. Đơn thuốc cảm xúc (dành cho lúc mở xem):
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {CAPSULE_PRESCRIPTIONS.map((pr) => {
                  const active = selectedPresc === pr.id;
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => setSelectedPresc(pr.id)}
                      className={`rounded-2xl border px-2.5 py-2 text-left text-xs transition ${
                        active
                          ? 'border-transparent bg-[#3a75a8] text-white shadow-xs'
                          : isNight
                            ? 'border-[#5a4230] bg-[#32251c] text-[#eadbc6] hover:bg-[#3d2d22]'
                            : 'border-[#dfcba9] bg-white/80 text-[#382619] hover:bg-[#f4e8d3]'
                      }`}
                    >
                      <div className="font-extrabold">
                        {pr.emoji} {pr.shortTag}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-[10px] opacity-80">
                        {pr.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPresc === 'time_locked' && (
              <div
                className={`space-y-2 rounded-2xl border p-3 text-xs ${
                  isNight
                    ? 'border-[#5a4230] bg-[#32251c]'
                    : 'border-[#dfcba9] bg-[#fff9ec]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    <Clock className="h-4 w-4 text-[#b57a29]" />
                    Niêm phong cho tới ngày:
                  </span>
                  <input
                    type="date"
                    min={shiftDateKey(todayKey, 1)}
                    value={unlockDateDraft}
                    onChange={(e) => setUnlockDateDraft(e.target.value)}
                    className="rounded-xl border border-[#c8a982] bg-white px-3 py-1 text-xs font-bold text-[#382619]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Ngày mai', days: 1 },
                    { label: '+7 ngày', days: 7 },
                    { label: '+30 ngày', days: 30 },
                    { label: '+6 tháng', days: 180 },
                    { label: '+1 năm', days: 365 },
                  ].map((preset) => {
                    const target = shiftDateKey(todayKey, preset.days);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setUnlockDateDraft(target)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          unlockDateDraft === target
                            ? 'bg-[#b57a29] text-white'
                            : 'bg-black/10 hover:bg-black/15'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Writing Starters */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CAPSULE_PROMPTS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() =>
                    setContentDraft((prev) =>
                      prev ? `${prev}\n${starter} ` : `${starter} `
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    isNight
                      ? 'border-[#5a4230] bg-[#32251c] text-[#dfd0bc] hover:bg-[#3f2f23]'
                      : 'border-[#e0ccb0] bg-[#f4ead8] text-[#553e2c] hover:bg-[#eadbc2]'
                  }`}
                >
                  + {starter}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Nhãn nhỏ trên cuộn giấy (tùy chọn)..."
              className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${
                isNight
                  ? 'border-[#5a4230] bg-[#32251c] text-[#f4e8d6] placeholder:text-[#b39b82]'
                  : 'border-[#d8c1a0] bg-white text-[#382619] placeholder:text-[#967c63]'
              }`}
            />

            <textarea
              rows={4}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              placeholder="Viết lá thư nhỏ cuộn vào trong viên thuốc..."
              className={`w-full resize-none rounded-2xl border p-3 text-xs leading-relaxed outline-none ${
                isNight
                  ? 'border-[#5a4230] bg-[#32251c] text-[#f4e8d6] placeholder:text-[#b39b82]'
                  : 'border-[#d8c1a0] bg-white text-[#382619] placeholder:text-[#967c63]'
              }`}
            />

            {/* End-to-End Encryption Option */}
            <div
              className={`space-y-2 rounded-2xl border p-3 text-xs ${
                isNight
                  ? 'border-[#5a4230] bg-[#32251c]'
                  : 'border-[#dfcba9] bg-white/80'
              }`}
            >
              <label className="flex cursor-pointer items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <Lock className="h-3.5 w-3.5 text-[#3d7c57]" />
                  {isDuo
                    ? 'Khóa riêng tư cho riêng tôi'
                    : 'Khóa bảo mật viên thuốc này'}
                  {journalPin && (
                    <span className="rounded-full bg-[#eef7f0] px-2 py-0.5 text-[10px] font-extrabold text-[#255935]">
                      Mã hóa AES-256
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={isPrivateDraft}
                  onChange={(e) => setIsPrivateDraft(e.target.checked)}
                  className="accent-[#3d7c57]"
                />
              </label>

              {isPrivateDraft && journalPin && !sessionPin && (
                <input
                  type="password"
                  value={composePinDraft}
                  onChange={(e) => setComposePinDraft(e.target.value)}
                  placeholder="Nhập mã PIN của bạn để khóa & mã hóa nội dung..."
                  className="w-full rounded-xl border border-[#cbb08c] bg-white px-3 py-1.5 text-xs text-[#382619] outline-none"
                />
              )}
            </div>

            {composeError && (
              <p className="text-xs font-bold text-[#c54650]">{composeError}</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  resetComposerForm();
                  setMode('jar');
                }}
                className={`rounded-2xl px-4 py-2 text-xs font-bold ${
                  isNight
                    ? 'bg-[#3a2b20] text-[#eadbc6]'
                    : 'bg-[#ede0cc] text-[#382619]'
                }`}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={sealingCinema !== 'none'}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3d7c57] px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#316647] disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {sealingCinema !== 'none'
                  ? 'Đang đóng khóa 3D...'
                  : editingCapsuleId
                    ? 'Lưu cập nhật viên thuốc'
                    : 'Đóng viên nhộng & Thả vào lọ'}
              </button>
            </div>
          </form>
        )}

        {/* === TAB 3: ORGANIZED APOTHECARY TRAY ("KHAY THUỐC") === */}
        {mode === 'tray' && (
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterPresc('all')}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  filterPresc === 'all'
                    ? 'bg-[#4a3425] text-white'
                    : isNight
                      ? 'bg-[#32251c] text-[#eadbc6]'
                      : 'bg-[#efe4d1] text-[#4a3425]'
                }`}
              >
                Tất cả ({capsules.length})
              </button>
              {CAPSULE_PRESCRIPTIONS.map((pr) => {
                const cnt = capsules.filter(
                  (c) =>
                    parseCapsuleStyle(c.paperStyle).prescriptionId === pr.id
                ).length;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setFilterPresc(pr.id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      filterPresc === pr.id
                        ? 'bg-[#3a75a8] text-white'
                        : isNight
                          ? 'bg-[#32251c] text-[#eadbc6]'
                          : 'bg-[#efe4d1] text-[#4a3425]'
                    }`}
                  >
                    {pr.emoji} {pr.shortTag} ({cnt})
                  </button>
                );
              })}
            </div>

            {filteredCapsules.length === 0 ? (
              <div
                className={`rounded-3xl border-2 border-dashed p-8 text-center text-xs ${
                  isNight
                    ? 'border-[#5a4230] text-[#cbb7a1]'
                    : 'border-[#d6bc98] text-[#6b5340]'
                }`}
              >
                Chưa có viên thuốc nào trong ngăn này.
              </div>
            ) : (
              <div className="grid max-h-[60vh] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredCapsules.map((cap) => {
                  const meta = parseCapsuleStyle(cap.paperStyle);
                  const locked = Boolean(
                    cap.unlockDate && cap.unlockDate > todayKey
                  );
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => inspectCapsule(cap)}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                        isNight
                          ? 'border-[#5a4230] bg-[#32251c] hover:bg-[#3c2c21]'
                          : 'border-[#dfcba9] bg-white/90 hover:bg-[#fffaf0]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CapsuleGraphic
                          palette={meta.palette}
                          finishId={meta.finishId}
                          charmEmoji={meta.charm.emoji}
                          scrollHex={meta.scrollSkin.swatchHex}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold opacity-75">
                            <span>
                              {meta.prescription.emoji}{' '}
                              {meta.prescription.shortTag}
                            </span>
                            <span>•</span>
                            <span>{formatShortDate(cap.entryDate)}</span>
                          </div>
                          <div className="truncate text-xs font-extrabold">
                            {cap.title}
                          </div>
                          <div className="mt-0.5 text-[10px] opacity-75">
                            {locked
                              ? `⏳ Mở sau ${daysBetweenDateKeys(todayKey, cap.unlockDate!)} ngày (${formatShortDate(cap.unlockDate!)})`
                              : cap.isPrivate
                                ? '🔒 Khóa riêng tư'
                                : `Đã mở ${meta.openedCount} lần`}
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-xl bg-[#b57a29]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#b57a29]">
                        Cầm lên
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === TAB 1: INTERACTIVE 2D PHYSICS JAR & SWIPE-TO-POP STAGE === */}
        {mode === 'jar' && (
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
            {/* Left: Vessel Selector + Responsive 60fps Glass Jar Canvas */}
            <div className="flex flex-col items-center md:col-span-6">
              <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1.5">
                {JAR_VESSELS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleChangeVessel(v.id)}
                    title={v.subtitle}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                      jarVessel === v.id
                        ? 'bg-[#4a3425] text-[#ffd978] shadow-xs'
                        : isNight
                          ? 'bg-[#32251c] text-[#dfd0bc] hover:bg-[#3d2d22]'
                          : 'bg-[#efe4d1] text-[#4a3425] hover:bg-[#e5d5bc]'
                    }`}
                  >
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>

              <div
                className="relative flex w-full justify-center overflow-visible transition-transform duration-200 select-none"
                style={{ transform: `rotate(${visualTiltDeg}deg)` }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  style={{
                    width: '100%',
                    maxWidth: CANVAS_W,
                    aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                    touchAction: 'none',
                  }}
                  className="cursor-grab active:cursor-grabbing"
                />
                {capsules.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 pt-14 text-center">
                    <span className="text-2xl">🫙</span>
                    <p className="mt-1 text-xs font-extrabold">
                      Lọ thủy tinh đang chờ viên đầu tiên
                    </p>
                    <p className="mt-0.5 text-[11px] opacity-75">
                      Bấm “Bào chế” để tự phối màu và thả viên nhộng hôm nay vào lọ!
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-center text-[11px]">
                {needsIosMotionPerm && !motionEnabled && (
                  <button
                    type="button"
                    onClick={() => void requestMotionPermission()}
                    className="inline-flex items-center gap-1 rounded-full bg-[#3a75a8] px-3 py-1 font-extrabold text-white shadow-2xs"
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Bật nghiêng điện thoại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    ambientEngine.playCorkPop();
                    setCorkStateImmediate(!corkOpen);
                  }}
                  className={`rounded-full px-2.5 py-0.5 font-bold transition ${
                    corkOpen
                      ? 'bg-[#3d7c57] text-white'
                      : isNight
                        ? 'bg-[#32251c] text-[#eadbc6]'
                        : 'bg-[#efe4d1] text-[#4a3425]'
                  }`}
                >
                  {corkOpen
                    ? '🔓 Nắp đang mở (dốc máy hoặc chạm viên thuốc)'
                    : '🔒 Chạm nút bần để mở nắp'}
                </button>
              </div>
            </div>

            {/* Right: Interactive 3D Pull-Apart Stage OR Prescription & 7-Day Rhythm */}
            <div className="space-y-3 md:col-span-6">
              {selectedCapsule && selectedMeta ? (
                <div
                  className={`rounded-3xl border-2 p-4 shadow-md ${
                    isNight
                      ? 'border-[#6f523b] bg-[#32251c]'
                      : 'border-[#d6bc98] bg-white/95'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#efe4d0] px-2.5 py-0.5 text-[11px] font-extrabold text-[#4a3425]">
                      {selectedMeta.prescription.rxCode} •{' '}
                      {selectedMeta.prescription.emoji}{' '}
                      {selectedMeta.prescription.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCapsuleId(null)}
                      className="text-[11px] font-bold opacity-70 hover:opacity-100"
                    >
                      Đóng lại ✕
                    </button>
                  </div>

                  {/* Interactive 3D SVG Capsule that Splits Apart with Your Finger! */}
                  <div
                    onPointerDown={onCapsulePointerDown}
                    onPointerMove={onCapsulePointerMove}
                    onPointerUp={onCapsulePointerUp}
                    onPointerCancel={onCapsulePointerUp}
                    style={{ touchAction: 'none' }}
                    className="relative my-2 flex flex-col items-center justify-center py-2 cursor-pointer select-none"
                  >
                    {(unwrapStage === 'popping' ||
                      unwrapStage === 'unfurled') && (
                      <Sparkles className="pointer-events-none absolute top-0 h-5 w-5 animate-ping text-[#e0a938]" />
                    )}
                    <CapsuleGraphic
                      palette={selectedMeta.palette}
                      finishId={selectedMeta.finishId}
                      charmEmoji={selectedMeta.charm.emoji}
                      rxStamp={selectedMeta.prescription.rxCode}
                      scrollHex={selectedMeta.scrollSkin.swatchHex}
                      splitProgress={
                        unwrapStage === 'popping' || unwrapStage === 'unfurled'
                          ? 1
                          : pullProgress
                      }
                      interactive3D={unwrapStage === 'sealed'}
                      float3D={unwrapStage === 'sealed'}
                      showPedestal={unwrapStage === 'sealed'}
                      size="lg"
                    />
                  </div>

                  {isSelectedTimeLocked ? (
                    <div className="rounded-2xl border border-dashed border-[#c8a982] bg-[#fffaf0] p-3.5 text-center text-xs text-[#4a3425]">
                      <Clock className="mx-auto mb-1 h-5 w-5 text-[#b57a29]" />
                      <div className="font-extrabold">{selectedCapsule.title}</div>
                      <p className="mt-1 opacity-85">
                        Viên thuốc đang niêm phong kín — còn{' '}
                        <strong>
                          {daysBetweenDateKeys(
                            todayKey,
                            selectedCapsule.unlockDate!
                          )}{' '}
                          ngày
                        </strong>{' '}
                        nữa (mở ngày{' '}
                        <strong>
                          {formatShortDate(selectedCapsule.unlockDate!)}
                        </strong>
                        ).
                      </p>
                    </div>
                  ) : unwrapStage === 'pin_prompt' ? (
                    <form
                      onSubmit={(e) => void handleUnlockCapsuleWithPin(e)}
                      className="space-y-2 rounded-2xl bg-[#f7efe0] p-3 text-xs text-[#382619]"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold">
                        <Lock className="h-3.5 w-3.5 text-[#3d7c57]" />
                        Viên thuốc riêng tư — nhập PIN để bóc vỏ:
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="password"
                          value={pinUnlockInput}
                          onChange={(e) => setPinUnlockInput(e.target.value)}
                          placeholder="Mã PIN..."
                          className="flex-1 rounded-xl border border-[#cbb08c] bg-white px-3 py-1.5 text-xs outline-none"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-xl bg-[#3d7c57] px-3.5 py-1.5 font-extrabold text-white"
                        >
                          <Unlock className="h-3.5 w-3.5" /> Bóc
                        </button>
                      </div>
                      {pinUnlockError && (
                        <p className="font-bold text-[#c54650]">
                          {pinUnlockError}
                        </p>
                      )}
                    </form>
                  ) : unwrapStage === 'sealed' ? (
                    <div className="space-y-2.5 text-center">
                      <div className="text-xs font-bold opacity-85">
                        Bỏ lọ ngày {formatDisplayDateVi(selectedCapsule.entryDate)}{' '}
                        • Vuốt ngang viên thuốc hoặc bấm nút dưới
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          triggerPopAndUnfurl(selectedCapsule, decryptedText)
                        }
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#b57a29] py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#99651f]"
                      >
                        <Sparkles className="h-4 w-4" /> Xoay & Bóc vỏ kén
                      </button>
                    </div>
                  ) : (
                    /* Unfurled Scroll */
                    <div
                      className={`animate-scroll-unfurl rounded-2xl border p-4 shadow-inner ${selectedMeta.scrollSkin.bgClass} ${selectedMeta.scrollSkin.textClass} ${selectedMeta.scrollSkin.borderClass}`}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 border-b border-current/15 pb-2 text-[11px]">
                        <span className="font-bold opacity-80">
                          📅 {formatDisplayDateVi(selectedCapsule.entryDate)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold">
                            {selectedMeta.charm.emoji} {selectedMeta.charm.label}
                          </span>
                          <AuthorBadge
                            sharing={sharing}
                            role={selectedCapsule.authorRole}
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold">
                        {selectedCapsule.title}
                      </h4>
                      <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                        {decryptedText}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-current/15 pt-2.5">
                        <div className="flex items-center gap-1">
                          {confirmDeleteId === selectedCapsule.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteNote(selectedCapsule.id);
                                setSelectedCapsuleId(null);
                                setConfirmDeleteId(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#c54650] px-2.5 py-1 text-[11px] font-extrabold text-white"
                            >
                              <Trash2 className="h-3 w-3" /> Xác nhận xóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteId(selectedCapsule.id)
                              }
                              className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold text-[#c54650] hover:bg-black/5"
                            >
                              <Trash2 className="h-3 w-3" /> Xóa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              beginEditCapsule(selectedCapsule, decryptedText)
                            }
                            className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold opacity-80 hover:bg-black/5 hover:opacity-100"
                          >
                            <Pencil className="h-3 w-3" /> Sửa
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCapsuleId(null)}
                          className="rounded-xl bg-[#3d7c57] px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-2xs hover:bg-[#316647]"
                        >
                          🫶 Cuộn lại cất vào lọ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 7-Day Rhythm Strip */}
                  <div
                    className={`rounded-2xl border p-3 ${
                      isNight
                        ? 'border-[#5a4230] bg-[#32251c]'
                        : 'border-[#dfcba9] bg-white/85'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold">
                      <span>🗓️ Nhịp bỏ thuốc 7 ngày gần nhất</span>
                      <span className="opacity-75">
                        Mốc kế: {capsules.length}/{milestone.nextGoal} viên
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {recentSevenDays.map((d) => (
                        <div
                          key={d.dateKey}
                          className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold ${
                            d.dateKey === todayKey
                              ? isNight
                                ? 'bg-[#463426] ring-1 ring-[#ffd98e]'
                                : 'bg-[#fbf1dc] ring-1 ring-[#c89d6d]'
                              : ''
                          }`}
                        >
                          <span>{d.shortDay}</span>
                          {d.palette ? (
                            <span
                              className="flex h-3 w-5 overflow-hidden rounded-full border"
                              style={{ borderColor: d.palette.stroke }}
                            >
                              <span
                                className="h-full w-1/2"
                                style={{ backgroundColor: d.palette.halfA }}
                              />
                              <span
                                className="h-full w-1/2"
                                style={{
                                  backgroundColor: d.palette.translucent
                                    ? '#fdf6e4'
                                    : d.palette.halfB,
                                }}
                              />
                            </span>
                          ) : (
                            <span className="h-3 w-3 rounded-full border border-dashed border-current opacity-30" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prescription Filter & Actions */}
                  <div
                    className={`rounded-2xl border p-3.5 ${
                      isNight
                        ? 'border-[#5a4230] bg-[#32251c]'
                        : 'border-[#dfcba9] bg-white/85'
                    }`}
                  >
                    <div className="mb-2 text-xs font-extrabold">
                      Chọn đơn thuốc bạn cần lúc này:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterPresc('all')}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                          filterPresc === 'all'
                            ? 'bg-[#4a3425] text-white'
                            : isNight
                              ? 'bg-[#261c15] text-[#eadbc6]'
                              : 'bg-[#efe4d1] text-[#4a3425]'
                        }`}
                      >
                        Tất cả ({capsules.length})
                      </button>

                      {isDuo && (
                        <button
                          type="button"
                          onClick={() => setFilterPresc('partner')}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            filterPresc === 'partner'
                              ? 'bg-[#c45b6d] text-white'
                              : isNight
                                ? 'bg-[#261c15] text-[#f5cbd2]'
                                : 'bg-[#fde9ec] text-[#8f3242]'
                          }`}
                        >
                          <HeartHandshake className="h-3 w-3" /> Từ {partnerNick} (
                          {
                            capsules.filter(
                              (c) =>
                                c.authorRole &&
                                c.authorRole !== sharing.activeRole
                            ).length
                          }
                          )
                        </button>
                      )}

                      {CAPSULE_PRESCRIPTIONS.map((pr) => {
                        const cnt = capsules.filter(
                          (c) =>
                            parseCapsuleStyle(c.paperStyle).prescriptionId ===
                            pr.id
                        ).length;
                        return (
                          <button
                            key={pr.id}
                            type="button"
                            onClick={() => setFilterPresc(pr.id)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                              filterPresc === pr.id
                                ? 'bg-[#3a75a8] text-white'
                                : isNight
                                  ? 'bg-[#261c15] text-[#eadbc6]'
                                  : 'bg-[#efe4d1] text-[#4a3425]'
                            }`}
                          >
                            {pr.emoji} {pr.shortTag} ({cnt})
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={triggerSmoothPourOut}
                        disabled={filteredCapsules.length === 0 || pouringActive}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-extrabold transition disabled:opacity-45 ${
                          isNight
                            ? 'border-[#6f523b] bg-[#261c15] text-[#f4e8d6] hover:bg-[#3a2b20]'
                            : 'border-[#cbb08c] bg-[#fbf5e9] text-[#382619] hover:bg-[#f0e3cd]'
                        }`}
                      >
                        🫗 Đổ 1 viên ra tay
                      </button>
                      <button
                        type="button"
                        onClick={handleDrawRandomCapsule}
                        disabled={filteredCapsules.length === 0}
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#b57a29] px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#99651f] disabled:opacity-45"
                      >
                        <Shuffle className="h-3.5 w-3.5" /> Lắc & Bóc 1 viên
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
