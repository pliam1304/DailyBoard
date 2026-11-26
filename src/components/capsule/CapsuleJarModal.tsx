'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  HeartHandshake,
  Lock,
  Plus,
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
  CAPSULE_PALETTES,
  CAPSULE_PRESCRIPTIONS,
  CAPSULE_SCROLL_SKINS,
  encodeCapsuleStyle,
  extractCapsulesFromNotes,
  JAR_VESSELS,
  parseCapsuleStyle,
  type CapsuleCharmId,
  type CapsuleColorId,
  type CapsulePalette,
  type CapsulePrescriptionId,
  type CapsuleScrollSkinId,
  type JarVesselStyle,
} from '@/lib/capsules';
import {
  formatDisplayDateVi,
  formatShortDate,
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
  isLocked: boolean;
  isToday: boolean;
  isFromPartner: boolean;
  dropping: boolean;
}

interface FireflyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

const CANVAS_W = 320;
const CANVAS_H = 382;
const JAR_CENTER_X = 160;
const FLOOR_Y = 352;

const QUICK_CAPSULE_PROMPTS = [
  'Một điều nhỏ hôm nay làm mình thấy biết ơn...',
  'Nếu ngày nào đó mở lại lúc đang buồn, hãy nhớ...',
  'Khoảnh khắc dễ thương nhất hôm nay là...',
  'Gửi một cái ôm ấm cho ngày mai nhé...',
];

function getJarMilestone(count: number): { badge: string; title: string; nextGoal: number } {
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
  if (vessel === 'star-bottle') return 36;
  if (vessel === 'cat-jar') return 62;
  return 45;
}

function getJarHalfWidthAtY(y: number, vessel: JarVesselStyle): number {
  if (vessel === 'star-bottle') {
    if (y < 76) return 36;
    if (y < 116) {
      const t = (y - 76) / 40;
      const smooth = t * t * (3 - 2 * t);
      return 36 + smooth * (88 - 36);
    }
    // Round spherical potion flask belly
    const norm = Math.max(-0.96, Math.min(0.96, (y - 232) / 128));
    return Math.max(48, Math.sqrt(1 - norm * norm) * 128);
  }

  if (vessel === 'cat-jar') {
    if (y < 64) return 62;
    if (y < 98) {
      const t = (y - 64) / 34;
      return 62 + t * t * (124 - 62);
    }
    if (y > 328) {
      const t = Math.min(1, (y - 328) / 26);
      return 124 - t * 24;
    }
    return 124;
  }

  // Classic Apothecary Bottle
  if (y < 68) return 45;
  if (y < 110) {
    const t = (y - 68) / 42;
    const smooth = t * t * (3 - 2 * t);
    return 45 + smooth * (122 - 45);
  }
  if (y > 332) {
    const t = Math.min(1, (y - 332) / 22);
    return 122 - t * 18;
  }
  return 122;
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
  const [mode, setMode] = useState<'jar' | 'compose'>(initialMode);
  const [jarVessel, setJarVessel] = useState<JarVesselStyle>(() =>
    loadSavedJarVessel()
  );
  const [filterPresc, setFilterPresc] = useState<
    CapsulePrescriptionId | 'all' | 'partner'
  >('all');

  // Composer state
  const [selectedColor, setSelectedColor] =
    useState<CapsuleColorId>('clear-firefly');
  const [selectedPresc, setSelectedPresc] =
    useState<CapsulePrescriptionId>('gratitude');
  const [selectedCharm, setSelectedCharm] = useState<CapsuleCharmId>('clover');
  const [selectedScrollSkin, setSelectedScrollSkin] =
    useState<CapsuleScrollSkinId>('parchment');
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [unlockDateDraft, setUnlockDateDraft] = useState('');
  const [isPrivateDraft, setIsPrivateDraft] = useState(false);
  const [composePinDraft, setComposePinDraft] = useState('');
  const [composeError, setComposeError] = useState('');

  // Session-verified PIN (strictly in React memory)
  const [sessionPin, setSessionPin] = useState('');

  // Unwrapping & interactive pull-apart ritual state
  const [selectedCapsule, setSelectedCapsule] = useState<NoteItem | null>(null);
  const [unwrapStage, setUnwrapStage] = useState<
    'sealed' | 'pin_prompt' | 'popping' | 'unfurled'
  >('sealed');
  const [pullProgress, setPullProgress] = useState<number>(0); // 0..1 interactive finger drag to split shell!
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [pinUnlockInput, setPinUnlockInput] = useState('');
  const [pinUnlockError, setPinUnlockError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Gyroscope, Uncork & Tilt-to-Pour state
  const [needsIosMotionPerm, setNeedsIosMotionPerm] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [visualTiltDeg, setVisualTiltDeg] = useState(0);
  const [corkOpen, setCorkOpen] = useState(false);
  const [pourMode, setPourMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bodiesRef = useRef<PillBody[]>([]);
  const firefliesRef = useRef<FireflyParticle[]>([]);
  const gravityRef = useRef<{ gx: number; gy: number }>({ gx: 0, gy: 0.52 });
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
  }>({ active: false, startX: 0, startY: 0, lastX: 0 });
  const capsuleSwipeRef = useRef<{ active: boolean; startX: number }>({
    active: false,
    startX: 0,
  });
  const corkOpenRef = useRef(false);
  const pourModeRef = useRef(false);
  const jarVesselRef = useRef<JarVesselStyle>(jarVessel);
  const pendingDropIdRef = useRef<string | null>(null);

  const todayKey = toLocalDateKey();
  const isNight = theme === 'cozy-night';
  const isDuo = isSharedDuo(sharing);
  const partnerRole = sharing.activeRole === 'owner' ? 'partner' : 'owner';
  const partnerNick = getMemberNickname(sharing, partnerRole);

  const capsules = useMemo(() => extractCapsulesFromNotes(notes), [notes]);
  const capsulesRef = useRef<NoteItem[]>(capsules);
  useEffect(() => {
    capsulesRef.current = capsules;
  }, [capsules]);

  const todayCapsulesCount = useMemo(
    () => capsules.filter((c) => c.entryDate === todayKey).length,
    [capsules, todayKey]
  );
  const monthPrefix = todayKey.slice(0, 7);
  const monthCapsulesCount = useMemo(
    () => capsules.filter((c) => c.entryDate.startsWith(monthPrefix)).length,
    [capsules, monthPrefix]
  );

  // 7-day capsule rhythm strip
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

  const handleChangeVessel = (v: JarVesselStyle) => {
    setJarVessel(v);
    jarVesselRef.current = v;
    ambientEngine.playGlassClink(0.65);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(JAR_VESSEL_STORAGE_KEY, v);
      window.dispatchEvent(new Event('nhatki-jar-vessel-changed'));
    }
  };

  useEffect(() => {
    jarVesselRef.current = jarVessel;
  }, [jarVessel]);

  useEffect(() => {
    corkOpenRef.current = corkOpen;
  }, [corkOpen]);

  useEffect(() => {
    pourModeRef.current = pourMode;
  }, [pourMode]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedCapsule(null);
      setConfirmDeleteId(null);
      setComposeError('');
      setPourMode(false);
      setCorkOpen(false);
      setPullProgress(0);

      // Initialize gentle floating firefly dust motes inside the jar
      firefliesRef.current = Array.from({ length: 14 }, () => ({
        x: 70 + Math.random() * 180,
        y: 100 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.12 - Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        size: 1.4 + Math.random() * 1.8,
      }));
    }
  }, [isOpen, initialMode]);

  // Detect iOS 13+ DeviceOrientation permission requirement vs automatic availability
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
      b.vx += (Math.random() - 0.5) * 11.5 * strength;
      b.vy -= (4.8 + Math.random() * 6.5) * strength;
      b.omega += (Math.random() - 0.5) * 0.36 * strength;
    }
  }, []);

  const inspectCapsule = useCallback(
    (capsule: NoteItem) => {
      setSelectedCapsule(capsule);
      setConfirmDeleteId(null);
      setPinUnlockInput('');
      setPinUnlockError('');
      setPullProgress(0);

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

  // Attach DeviceOrientation (including upside-down Tilt-to-Pour!) + DeviceMotion shake
  useEffect(() => {
    if (!isOpen || !motionEnabled || typeof window === 'undefined') return;

    let lastShakeMs = 0;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (dragStateRef.current.active) return;
      const gamma = typeof e.gamma === 'number' ? e.gamma : 0; // -90..90
      const beta = typeof e.beta === 'number' ? e.beta : 55; // -180..180
      const gx = Math.max(-0.95, Math.min(0.95, (gamma / 42) * 0.78));
      const gy =
        beta < -10
          ? Math.max(-0.82, (beta / 45) * 0.68)
          : Math.max(0.24, Math.min(0.8, ((beta + 22) / 70) * 0.58));
      gravityRef.current = { gx, gy };
      setVisualTiltDeg(
        Math.max(
          -115,
          Math.min(115, beta < -15 ? gamma * 0.5 + 95 : gamma * 0.34)
        )
      );
    };

    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const mag =
        Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
      const now = performance.now();
      if (mag > 34 && now - lastShakeMs > 700) {
        lastShakeMs = now;
        shakeJar(1.1);
      }
    };

    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('devicemotion', onMotion);
    };
  }, [isOpen, motionEnabled, shakeJar]);

  // Sync physics bodies with real capsule notes
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
          x: JAR_CENTER_X + (Math.random() - 0.5) * 8,
          y: 12,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 3.5,
          angle: (Math.random() - 0.5) * 0.6,
          omega: (Math.random() - 0.5) * 0.08,
          halfLen: 8.8,
          radius: 7.3,
          palette: meta.palette,
          isLocked,
          isToday,
          isFromPartner,
          dropping: true,
        };
      }

      const col = index % 6;
      const row = Math.floor(index / 6);
      return {
        id: note.id,
        x: 80 + col * 31 + (row % 2) * 10 + (Math.random() - 0.5) * 6,
        y: Math.max(92, FLOOR_Y - 14 - row * 17),
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0,
        angle: (Math.random() - 0.5) * Math.PI,
        omega: 0,
        halfLen: 8.8,
        radius: 7.3,
        palette: meta.palette,
        isLocked,
        isToday,
        isFromPartner,
        dropping: false,
      };
    });

    bodiesRef.current = nextBodies;
  }, [capsules, isOpen, todayKey, isDuo, sharing.activeRole]);

  // Trigger a smooth animated Tilt-to-Pour ritual on desktop or 1-tap mobile
  const triggerTiltPourOut = () => {
    if (capsules.length === 0) return;
    ambientEngine.playCorkPop();
    setCorkOpen(true);
    setPourMode(true);
    setVisualTiltDeg(112);

    // Invert gravity toward bottleneck so pills genuinely roll up & pour out!
    gravityRef.current = { gx: 0.08, gy: -0.62 };
    for (const b of bodiesRef.current) {
      b.vx += (JAR_CENTER_X - b.x) * 0.035;
      b.vy -= 4.2 + Math.random() * 2.5;
    }

    // Safety fallback in case all pills jam at bottleneck shoulder
    setTimeout(() => {
      if (pourModeRef.current) {
        setPourMode(false);
        setCorkOpen(false);
        setVisualTiltDeg(0);
        gravityRef.current = { gx: 0, gy: 0.52 };
        const unlocked = capsulesRef.current.filter(
          (c) => !c.unlockDate || c.unlockDate <= todayKey
        );
        const pool = unlocked.length > 0 ? unlocked : capsulesRef.current;
        if (pool.length > 0) {
          inspectCapsuleRef.current(
            pool[Math.floor(Math.random() * pool.length)]
          );
        }
      }
    }, 1550);
  };

  // 60fps 2D Canvas Physics, Vessel Contours, Translucent Inner Scrolls & Firefly Dust
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

      // Funnel assist when uncorked & tilted upside-down so pills smoothly channel through neck
      const isUpsideDown = corkOpenRef.current && gy < -0.08;

      for (const b of bodies) {
        let ax = gx;
        if (isUpsideDown && b.y < 145) {
          ax += (JAR_CENTER_X - b.x) * 0.014;
        }
        b.vx = (b.vx + ax) * 0.988;
        b.vy = (b.vy + gy) * 0.988;
        b.omega *= 0.94;
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.omega;
        if (b.dropping && b.y > 90) {
          b.dropping = false;
        }

        // Detect when a pill physically pours out of the open bottleneck into the user's hand!
        if (
          corkOpenRef.current &&
          !b.dropping &&
          b.y < 22 &&
          Math.abs(b.x - JAR_CENTER_X) < neckHalfW
        ) {
          b.y = 128;
          b.x = JAR_CENTER_X;
          b.vx = 0;
          b.vy = 1.5;
          corkOpenRef.current = false;
          pourModeRef.current = false;
          setCorkOpen(false);
          setPourMode(false);
          setVisualTiltDeg(0);
          gravityRef.current = { gx: 0, gy: 0.52 };
          ambientEngine.playGlassClink(1);

          const pouredNote = capsulesRef.current.find((n) => n.id === b.id);
          if (pouredNote) {
            inspectCapsuleRef.current(pouredNote);
          }
          break;
        }
      }

      // 3-iteration rigid capsule collision solver
      for (let iter = 0; iter < 3; iter += 1) {
        for (const b of bodies) {
          const cos = Math.cos(b.angle);
          const sin = Math.sin(b.angle);

          for (const sign of [-1, 1]) {
            const lx = b.x + sign * cos * b.halfLen;
            const ly = b.y + sign * sin * b.halfLen;

            // Floor collision
            if (ly + b.radius > FLOOR_Y) {
              const pen = ly + b.radius - FLOOR_Y;
              b.y -= pen;
              if (b.vy > 0) {
                if (iter === 0 && b.vy > 2.3) {
                  ambientEngine.playGlassClink(Math.min(1, b.vy / 8));
                }
                b.vy *= -0.32;
                b.vx *= 0.88;
              }
              b.omega -= sign * cos * pen * 0.032;
            }

            // Cork ceiling (opens inside bottleneck when corkOpen is true!)
            const inOpenNeck =
              corkOpenRef.current &&
              Math.abs(lx - JAR_CENTER_X) < neckHalfW - b.radius * 0.5;
            const ceilingY = b.dropping || inOpenNeck ? -42 : 54;
            if (ly - b.radius < ceilingY) {
              const pen = ceilingY - (ly - b.radius);
              b.y += pen;
              if (b.vy < 0) b.vy *= -0.3;
              b.omega += sign * cos * pen * 0.025;
            }

            // Vessel-specific glass side walls
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
                b.vx *= -0.36;
              }
              b.omega += sign * sin * pen * 0.03;
            } else if (lx > maxX) {
              const pen = lx - maxX;
              b.x -= pen;
              if (b.vx > 0) {
                if (iter === 0 && Math.abs(b.vx) > 2.4) {
                  ambientEngine.playGlassClink(Math.min(1, Math.abs(b.vx) / 8));
                }
                b.vx *= -0.36;
              }
              b.omega -= sign * sin * pen * 0.03;
            }
          }
        }

        // Capsule-to-Capsule collisions
        for (let i = 0; i < bodies.length; i += 1) {
          const a = bodies[i];
          const acos = Math.cos(a.angle) * a.halfLen;
          const asin = Math.sin(a.angle) * a.halfLen;
          const ax1 = a.x - acos;
          const ay1 = a.y - asin;
          const ax2 = a.x + acos;
          const ay2 = a.y + asin;

          for (let j = i + 1; j < bodies.length; j += 1) {
            const b = bodies[j];
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
                const imp = -(1 + 0.28) * vn * 0.5;
                a.vx -= imp * nx;
                a.vy -= imp * ny;
                b.vx += imp * nx;
                b.vy += imp * ny;

                a.omega -= (cp.s - 0.5) * 2 * imp * 0.018;
                b.omega += (cp.t - 0.5) * 2 * imp * 0.018;
              }
            }
          }
        }
      }

      // Render Scene
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const traceVesselPath = () => {
        ctx.beginPath();
        if (vessel === 'star-bottle') {
          ctx.moveTo(122, 30);
          ctx.lineTo(198, 30);
          ctx.lineTo(198, 76);
          ctx.bezierCurveTo(202, 102, 290, 128, 290, 230);
          ctx.bezierCurveTo(290, 326, 228, 360, 160, 360);
          ctx.bezierCurveTo(92, 360, 30, 326, 30, 230);
          ctx.bezierCurveTo(30, 128, 118, 102, 122, 76);
          ctx.closePath();
        } else if (vessel === 'cat-jar') {
          ctx.moveTo(96, 36);
          ctx.lineTo(224, 36);
          ctx.lineTo(224, 64);
          ctx.bezierCurveTo(232, 82, 286, 92, 286, 130);
          ctx.lineTo(286, 324);
          ctx.quadraticCurveTo(286, 358, 250, 358);
          ctx.lineTo(70, 358);
          ctx.quadraticCurveTo(34, 358, 34, 324);
          ctx.lineTo(34, 130);
          ctx.bezierCurveTo(34, 92, 88, 82, 96, 64);
          ctx.closePath();
        } else {
          ctx.moveTo(110, 30);
          ctx.lineTo(210, 30);
          ctx.lineTo(210, 66);
          ctx.bezierCurveTo(212, 86, 286, 86, 286, 114);
          ctx.lineTo(286, 332);
          ctx.quadraticCurveTo(286, 358, 256, 358);
          ctx.lineTo(64, 358);
          ctx.quadraticCurveTo(34, 358, 34, 332);
          ctx.lineTo(34, 114);
          ctx.bezierCurveTo(34, 86, 108, 86, 110, 66);
          ctx.closePath();
        }
      };

      // Soft table shadow
      ctx.beginPath();
      ctx.ellipse(JAR_CENTER_X, 368, 108, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = isNight ? 'rgba(0,0,0,0.48)' : 'rgba(72,46,24,0.16)';
      ctx.fill();

      // Cork / Cat-Ear Lid (clickable to uncork!)
      ctx.save();
      if (corkOpenRef.current) {
        ctx.translate(38, -24);
        ctx.rotate(0.48);
      }
      if (vessel === 'cat-jar') {
        // Wooden lid with sculpted Mochi cat ears!
        ctx.fillStyle = '#c4905a';
        ctx.strokeStyle = '#6c4724';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(106, 26);
        ctx.lineTo(118, 6);
        ctx.lineTo(136, 22);
        ctx.lineTo(184, 22);
        ctx.lineTo(202, 6);
        ctx.lineTo(214, 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(92, 22, 136, 22, 8);
        ctx.fill();
        ctx.stroke();
      } else {
        const corkW = vessel === 'star-bottle' ? 66 : 88;
        const corkX = JAR_CENTER_X - corkW / 2;
        ctx.beginPath();
        ctx.roundRect(corkX, 8, corkW, 38, [8, 8, 12, 12]);
        const corkGrad = ctx.createLinearGradient(corkX, 8, corkX + corkW, 46);
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

      // Glass interior tint with dynamic light shift from tilt
      traceVesselPath();
      const lightShiftX = gx * 48;
      const glassBg = ctx.createLinearGradient(
        34 + lightShiftX,
        30,
        286 + lightShiftX,
        358
      );
      if (isNight) {
        glassBg.addColorStop(0, 'rgba(210, 232, 248, 0.14)');
        glassBg.addColorStop(0.5, 'rgba(180, 214, 238, 0.08)');
        glassBg.addColorStop(1, 'rgba(235, 220, 195, 0.18)');
      } else {
        glassBg.addColorStop(0, 'rgba(255, 255, 255, 0.68)');
        glassBg.addColorStop(0.5, 'rgba(232, 246, 254, 0.45)');
        glassBg.addColorStop(1, 'rgba(255, 250, 240, 0.76)');
      }
      ctx.fillStyle = glassBg;
      ctx.fill();

      // Clip interior for floating fireflies & vintage glass etching
      ctx.save();
      traceVesselPath();
      ctx.clip();

      // Floating warm fireflies / dust motes
      for (const f of firefliesRef.current) {
        f.x += f.vx - gx * 0.15;
        f.y += f.vy;
        if (f.y < 75) f.y = 335;
        if (f.x < 45) f.x = 270;
        if (f.x > 275) f.x = 50;
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

      // Etched motif on back glass
      ctx.fillStyle = isNight
        ? 'rgba(244, 232, 214, 0.12)'
        : 'rgba(92, 66, 44, 0.11)';
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      if (vessel === 'cat-jar') {
        ctx.fillText('🐾 MOCHI REMEDY JAR 🐾', JAR_CENTER_X, 142);
      } else if (vessel === 'star-bottle') {
        ctx.fillText('✦ STARLIGHT WISHES ✦', JAR_CENTER_X, 148);
      } else {
        ctx.fillText('APOTHECARY • SOUL PILLS', JAR_CENTER_X, 142);
      }

      // Draw each 2-tone capsule (including translucent jelly shells with inner rolled scroll!)
      for (const b of bodies) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        const r = b.radius;
        const hl = b.halfLen;

        // Soft drop shadow
        ctx.beginPath();
        ctx.roundRect(-hl - r, -r + 2, (hl + r) * 2, r * 2, r);
        ctx.fillStyle = 'rgba(38, 24, 14, 0.16)';
        ctx.fill();

        // If translucent jelly shell, draw the tiny rolled kraft paper scroll tucked inside FIRST!
        if (b.palette.translucent) {
          ctx.beginPath();
          ctx.roundRect(-1.5, -r * 0.56, hl + r * 0.55, r * 1.12, 2.2);
          ctx.fillStyle = '#f5e4c3';
          ctx.fill();
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = '#c49b66';
          ctx.stroke();

          // Tiny red ribbon tied around the miniature scroll!
          ctx.beginPath();
          ctx.moveTo(hl * 0.42, -r * 0.56);
          ctx.lineTo(hl * 0.42, r * 0.56);
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = '#d95b6a';
          ctx.stroke();
        }

        // Right half (halfB body)
        ctx.beginPath();
        ctx.moveTo(-1, -r);
        ctx.lineTo(hl, -r);
        ctx.arc(hl, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-1, r);
        ctx.closePath();
        ctx.fillStyle = b.palette.halfB;
        ctx.fill();

        // Left half (halfA opaque cap sleeve)
        const capR = r + 0.45;
        ctx.beginPath();
        ctx.moveTo(1.2, -capR);
        ctx.lineTo(-hl, -capR);
        ctx.arc(-hl, 0, capR, -Math.PI / 2, Math.PI / 2, true);
        ctx.lineTo(1.2, capR);
        ctx.closePath();
        ctx.fillStyle = b.palette.halfA;
        ctx.fill();

        // Outer capsule stroke (golden ring if today, rose ring if from partner!)
        ctx.beginPath();
        ctx.roundRect(-hl - r, -r, (hl + r) * 2, r * 2, r);
        ctx.lineWidth = b.isToday || b.isFromPartner ? 2 : 1.35;
        ctx.strokeStyle = b.isFromPartner
          ? '#e05a7a'
          : b.isToday
            ? '#d4942a'
            : b.palette.stroke;
        ctx.stroke();

        // Seam line
        ctx.beginPath();
        ctx.moveTo(1, -r);
        ctx.lineTo(1, r);
        ctx.lineWidth = 1.05;
        ctx.strokeStyle = 'rgba(58, 38, 24, 0.25)';
        ctx.stroke();

        // Glossy specular shine
        ctx.beginPath();
        ctx.roundRect(-hl - r * 0.45, -r * 0.68, (hl + r) * 1.35, r * 0.42, 3);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.66)';
        ctx.fill();

        if (b.isLocked) {
          ctx.fillStyle = '#fff6d6';
          ctx.beginPath();
          ctx.arc(-hl * 0.45, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore(); // End interior clip

      // Outer glass rim & dynamic tilt refraction glare
      traceVesselPath();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = isNight
        ? 'rgba(218, 236, 250, 0.52)'
        : 'rgba(124, 164, 192, 0.72)';
      ctx.stroke();

      // Lip rim + neck charm for Star Bottle
      const rimW = vessel === 'star-bottle' ? 88 : vessel === 'cat-jar' ? 140 : 112;
      const rimY = vessel === 'cat-jar' ? 32 : 25;
      ctx.beginPath();
      ctx.roundRect(JAR_CENTER_X - rimW / 2, rimY, rimW, 8, 4);
      ctx.fillStyle = isNight
        ? 'rgba(220, 238, 252, 0.34)'
        : 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isNight
        ? 'rgba(218, 236, 250, 0.5)'
        : 'rgba(124, 164, 192, 0.72)';
      ctx.stroke();

      if (vessel === 'star-bottle') {
        // Golden neck ribbon & star charm
        ctx.fillStyle = '#e0a938';
        ctx.fillRect(121, 66, 78, 5);
        ctx.font = '14px sans-serif';
        ctx.fillText('⭐', 194, 80);
      }

      // Dynamic curved glass glare shifting subtly with tilt
      const glareOffset = Math.max(-8, Math.min(8, -gx * 10));
      ctx.beginPath();
      if (vessel === 'star-bottle') {
        ctx.arc(JAR_CENTER_X, 230, 114, Math.PI * 0.72, Math.PI * 1.24);
      } else {
        ctx.moveTo(48 + glareOffset, 122);
        ctx.lineTo(48 + glareOffset, 322);
      }
      ctx.lineWidth = 5;
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

  // Canvas pointer handlers: tap cork to uncork, drag jar to tilt/pour, or tap pill to inspect!
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

    const gx = Math.max(-0.95, Math.min(0.95, dx / 85));
    // Dragging upward or strongly sideways when cork is open lets user invert gravity to pour!
    const gy = corkOpenRef.current
      ? Math.max(-0.72, Math.min(0.85, 0.45 - Math.abs(dx) / 130 + dy / 120))
      : Math.max(-0.45, Math.min(0.85, 0.52 + dy / 160));
    gravityRef.current = { gx, gy };
    const maxDeg = corkOpenRef.current ? 105 : 22;
    setVisualTiltDeg(Math.max(-maxDeg, Math.min(maxDeg, dx * 0.35)));

    if (Math.abs(stepX) > 22) {
      for (const b of bodiesRef.current) {
        b.vx += stepX * 0.12;
        b.vy -= Math.min(3.5, Math.abs(stepX) * 0.06);
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
    if (!pourModeRef.current) {
      gravityRef.current = { gx: 0, gy: 0.52 };
      setVisualTiltDeg(0);
    }

    if (!moved && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) * CANVAS_W) / rect.width;
      const cy = ((e.clientY - rect.top) * CANVAS_H) / rect.height;

      // Tap on Cork / Lid at top of jar -> toggle cork open/closed!
      if (cy < 58 && Math.abs(cx - JAR_CENTER_X) < 72) {
        ambientEngine.playCorkPop();
        setCorkOpen((prev) => !prev);
        return;
      }

      // Tap on a specific capsule inside the jar -> pick it up!
      let closest: PillBody | null = null;
      let bestDist = 22;
      for (const b of bodiesRef.current) {
        const d = Math.hypot(b.x - cx, b.y - cy);
        if (d < bestDist) {
          bestDist = d;
          closest = b;
        }
      }
      if (closest) {
        const found = capsules.find((n) => n.id === closest!.id);
        if (found) {
          inspectCapsule(found);
        }
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
      meta.scrollSkinId
    );
    onUpdateNote(capsule.id, { paperStyle: nextStyle });

    setTimeout(() => {
      ambientEngine.playPaperUnfurl();
      setUnwrapStage('unfurled');
    }, 460);
  };

  // Interactive finger-swipe on the giant 3D capsule to physically pull its two halves apart!
  const onCapsulePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (unwrapStage !== 'sealed' || isSelectedTimeLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    capsuleSwipeRef.current = { active: true, startX: e.clientX };
  };

  const onCapsulePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!capsuleSwipeRef.current.active || !selectedCapsule) return;
    const dist = Math.abs(e.clientX - capsuleSwipeRef.current.startX);
    const prog = Math.min(1, dist / 72);
    setPullProgress(prog);
    if (prog >= 0.65) {
      capsuleSwipeRef.current.active = false;
      triggerPopAndUnfurl(selectedCapsule, decryptedText);
    }
  };

  const onCapsulePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!capsuleSwipeRef.current.active || !selectedCapsule) return;
    const dist = Math.abs(e.clientX - capsuleSwipeRef.current.startX);
    capsuleSwipeRef.current.active = false;
    // If user simply tapped the capsule (< 8px drag), pop it open right away!
    if (dist < 8) {
      triggerPopAndUnfurl(selectedCapsule, decryptedText);
    } else if (pullProgress < 0.65) {
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
    const matchesFilter = (c: NoteItem) => {
      if (filterPresc === 'all') return true;
      if (filterPresc === 'partner') {
        return Boolean(c.authorRole && c.authorRole !== sharing.activeRole);
      }
      return parseCapsuleStyle(c.paperStyle).prescriptionId === filterPresc;
    };

    const candidates = capsules.filter(
      (c) => (!c.unlockDate || c.unlockDate <= todayKey) && matchesFilter(c)
    );

    shakeJar(0.95);
    if (candidates.length === 0) {
      const fallbackLocked = capsules.filter(matchesFilter);
      if (fallbackLocked.length > 0) {
        inspectCapsule(
          fallbackLocked[Math.floor(Math.random() * fallbackLocked.length)]
        );
      }
      return;
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setTimeout(() => {
      inspectCapsule(picked);
    }, 280);
  };

  const handleDropNewCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError('');
    const cleanText = sanitizeText(contentDraft, 8000);
    if (!cleanText) {
      setComposeError('Hãy viết vài dòng nhắn gửi để cuộn vào viên thuốc nhé!');
      return;
    }

    if (selectedPresc === 'time_locked' && !unlockDateDraft) {
      setComposeError('Hãy chọn ngày mở khóa cho viên thuốc hẹn ngày nhé!');
      return;
    }

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
    const newId = createUuid();
    const nowIso = new Date().toISOString();

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
        selectedScrollSkin
      ),
      isPrivate: isPrivateDraft,
      unlockDate:
        selectedPresc === 'time_locked' && unlockDateDraft
          ? unlockDateDraft
          : undefined,
      pinned: false,
      authorRole: sharing.activeRole,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    pendingDropIdRef.current = newId;
    setCorkOpen(true);
    setMode('jar');
    ambientEngine.playCorkPop();
    onAddNote(newCapsule);

    setTitleDraft('');
    setContentDraft('');
    setComposePinDraft('');
    setIsPrivateDraft(false);
    setUnlockDateDraft('');

    setTimeout(() => {
      setCorkOpen(false);
    }, 980);
  };

  if (!isOpen) return null;

  const selectedMeta = selectedCapsule
    ? parseCapsuleStyle(selectedCapsule.paperStyle)
    : null;
  const isSelectedTimeLocked = Boolean(
    selectedCapsule?.unlockDate && selectedCapsule.unlockDate > todayKey
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className={`my-auto w-full max-w-3xl rounded-[30px] border-2 p-4 shadow-2xl sm:p-6 ${
          isNight
            ? 'border-[#6f523b] bg-[#261c15] text-[#f4e8d6]'
            : 'border-[#c89d6d] bg-[#faf3e3] text-[#382619]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header + Milestone Rank */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold">
                💊 Lọ Thuốc Tâm Hồn
              </h2>
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCapsule(null);
                setMode(mode === 'jar' ? 'compose' : 'jar');
              }}
              className={`inline-flex items-center gap-1 rounded-2xl px-3.5 py-1.5 text-xs font-extrabold shadow-xs transition ${
                mode === 'compose'
                  ? 'bg-[#3a75a8] text-white'
                  : 'bg-[#3d7c57] text-white hover:bg-[#316647]'
              }`}
            >
              {mode === 'compose' ? (
                <>Xem lọ thủy tinh</>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Bào chế viên mới
                </>
              )}
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

        {mode === 'compose' ? (
          /* --- COMPOSE & CRAFT A NEW CAPSULE --- */
          <form onSubmit={(e) => void handleDropNewCapsule(e)} className="space-y-3.5">
            {/* Live Capsule Preview + 8 Shell Palettes (including 2 Translucent Crystal Shells!) */}
            <div
              className={`flex flex-col items-center justify-between gap-3 rounded-2xl border p-3.5 sm:flex-row ${
                isNight
                  ? 'border-[#5a4230] bg-[#32251c]'
                  : 'border-[#dfcba9] bg-white/85'
              }`}
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const pal =
                    CAPSULE_PALETTES.find((c) => c.id === selectedColor) ??
                    CAPSULE_PALETTES[0];
                  const ch =
                    CAPSULE_CHARMS.find((c) => c.id === selectedCharm) ??
                    CAPSULE_CHARMS[0];
                  return (
                    <div
                      className="relative flex h-10 w-24 items-center overflow-hidden rounded-full shadow-md"
                      style={{ border: `2px solid ${pal.stroke}` }}
                    >
                      <div
                        className="h-full w-1/2"
                        style={{ backgroundColor: pal.halfA }}
                      />
                      <div
                        className="relative flex h-full w-1/2 items-center justify-center"
                        style={{
                          backgroundColor: pal.translucent
                            ? 'rgba(255,248,230,0.45)'
                            : pal.halfB,
                        }}
                      >
                        {pal.translucent && (
                          <span className="h-4 w-8 rounded-xs border border-[#c49b66] bg-[#f5e4c3] text-[9px] leading-4 text-center">
                            {ch.emoji}
                          </span>
                        )}
                      </div>
                      <div className="pointer-events-none absolute top-1 left-3 right-3 h-1.5 rounded-full bg-white/65" />
                    </div>
                  );
                })()}
                <div>
                  <div className="text-xs font-extrabold">
                    Vỏ viên nhộng:{' '}
                    {CAPSULE_PALETTES.find((c) => c.id === selectedColor)?.label}
                  </div>
                  <div className="text-[11px] opacity-75">
                    {CAPSULE_PALETTES.find((c) => c.id === selectedColor)?.translucent
                      ? 'Vỏ pha lê nhìn xuyên thấy cuộn thư bên trong ✨'
                      : 'Vỏ nhộng 2 màu cổ điển'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {CAPSULE_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setSelectedColor(pal.id)}
                    title={pal.label}
                    className={`flex h-7 w-10 overflow-hidden rounded-full border-2 transition ${
                      selectedColor === pal.id
                        ? 'scale-110 ring-2 ring-[#b57a29]'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ borderColor: pal.stroke }}
                  >
                    <span
                      className="h-full w-1/2"
                      style={{ backgroundColor: pal.halfA }}
                    />
                    <span
                      className="h-full w-1/2"
                      style={{
                        backgroundColor: pal.translucent ? '#fdf6e4' : pal.halfB,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Keepsake Charm + Scroll Paper Skin Row */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div
                className={`rounded-2xl border p-2.5 text-xs ${
                  isNight
                    ? 'border-[#5a4230] bg-[#32251c]'
                    : 'border-[#dfcba9] bg-white/80'
                }`}
              >
                <div className="mb-1.5 font-extrabold">
                  Kỷ vật nhỏ bỏ kèm trong viên thuốc:
                </div>
                <div className="flex flex-wrap gap-1">
                  {CAPSULE_CHARMS.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedCharm(ch.id)}
                      title={ch.label}
                      className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                        selectedCharm === ch.id
                          ? 'border-[#b57a29] bg-[#fff3d6] text-[#4a3425]'
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
                    : 'border-[#dfcba9] bg-white/80'
                }`}
              >
                <div className="mb-1.5 font-extrabold">Chất liệu cuộn giấy thư:</div>
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

            {/* Emotional Prescription Selector */}
            <div>
              <div className="mb-1.5 text-xs font-extrabold">
                Đơn thuốc cảm xúc (dành cho lúc bóc lại):
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
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-xs ${
                  isNight
                    ? 'border-[#5a4230] bg-[#32251c]'
                    : 'border-[#dfcba9] bg-[#fff9ec]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <Clock className="h-4 w-4 text-[#b57a29]" />
                  Niêm phong viên thuốc cho tới ngày:
                </span>
                <input
                  type="date"
                  min={todayKey}
                  value={unlockDateDraft}
                  onChange={(e) => setUnlockDateDraft(e.target.value)}
                  className="rounded-xl border border-[#c8a982] bg-white px-3 py-1 text-xs font-bold text-[#382619]"
                />
              </div>
            )}

            {/* Quick Starters */}
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
                onClick={() => setMode('jar')}
                className={`rounded-2xl px-4 py-2 text-xs font-bold ${
                  isNight
                    ? 'bg-[#3a2b20] text-[#eadbc6]'
                    : 'bg-[#ede0cc] text-[#382619]'
                }`}
              >
                Quay lại lọ
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3d7c57] px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#316647]"
              >
                <Check className="h-4 w-4" /> Đóng viên nhộng & Thả vào lọ
              </button>
            </div>
          </form>
        ) : (
          /* --- INTERACTIVE 2D PHYSICS JAR, VESSEL SWITCHER & SWIPE-TO-POP STAGE --- */
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
            {/* Left: Vessel Selector + 60fps Glass Jar Canvas */}
            <div className="flex flex-col items-center md:col-span-6">
              {/* 3 Glass Vessel Switcher Pills */}
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
                className="relative transition-transform duration-300 select-none"
                style={{ transform: `rotate(${visualTiltDeg}deg)` }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  style={{ width: CANVAS_W, height: CANVAS_H, touchAction: 'none' }}
                  className="cursor-grab active:cursor-grabbing"
                />
                {capsules.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 pt-14 text-center">
                    <span className="text-2xl">🫙</span>
                    <p className="mt-1 text-xs font-extrabold">
                      Lọ thủy tinh đang chờ viên đầu tiên
                    </p>
                    <p className="mt-0.5 text-[11px] opacity-75">
                      Bấm “Bào chế viên mới” để thả ký ức hôm nay vào lọ nhé!
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
                    <Smartphone className="h-3.5 w-3.5" /> Bật nghiêng theo điện thoại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    ambientEngine.playCorkPop();
                    setCorkOpen((prev) => !prev);
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
                    ? '🔓 Đang mở nắp (dốc ngược máy để đổ thuốc!)'
                    : '🔒 Chạm nắp bần để mở'}
                </button>
              </div>
            </div>

            {/* Right: Interactive Swipe-to-Pop Unwrap OR Prescription & 7-Day Rhythm */}
            <div className="space-y-3 md:col-span-6">
              {selectedCapsule && selectedMeta ? (
                /* --- INTERACTIVE FINGER-SWIPE / TWIST & POP UNWRAP STAGE --- */
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
                      onClick={() => setSelectedCapsule(null)}
                      className="text-[11px] font-bold opacity-70 hover:opacity-100"
                    >
                      Đóng lại ✕
                    </button>
                  </div>

                  {/* Tactile Draggable / Popping Two-Tone Capsule */}
                  <div
                    onPointerDown={onCapsulePointerDown}
                    onPointerMove={onCapsulePointerMove}
                    onPointerUp={onCapsulePointerUp}
                    onPointerCancel={onCapsulePointerUp}
                    style={{ touchAction: 'none' }}
                    className="relative my-4 flex h-20 cursor-pointer items-center justify-center overflow-hidden select-none"
                  >
                    {unwrapStage === 'popping' || unwrapStage === 'unfurled' ? (
                      <>
                        <div className="absolute -top-0.5 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 animate-ping text-[#e0a938]" />
                          <span
                            title={selectedMeta.charm.label}
                            className="animate-bounce text-xl drop-shadow-sm"
                          >
                            {selectedMeta.charm.emoji}
                          </span>
                          <Sparkles className="h-4 w-4 animate-ping text-[#e0a938]" />
                        </div>
                        <div
                          className="h-11 w-14 rounded-l-full shadow-md transition-all duration-500"
                          style={{
                            backgroundColor: selectedMeta.palette.halfA,
                            border: `2px solid ${selectedMeta.palette.stroke}`,
                            transform: 'translateX(-64px) rotate(-24deg)',
                          }}
                        />
                        <div
                          className="h-11 w-14 rounded-r-full shadow-md transition-all duration-500"
                          style={{
                            backgroundColor: selectedMeta.palette.translucent
                              ? 'rgba(255,248,232,0.55)'
                              : selectedMeta.palette.halfB,
                            border: `2px solid ${selectedMeta.palette.stroke}`,
                            transform: 'translateX(64px) rotate(24deg)',
                          }}
                        />
                      </>
                    ) : (
                      /* Interactive Pull-Apart Capsule Halves */
                      <div className="relative flex items-center justify-center">
                        {pullProgress > 0.08 && (
                          <span className="absolute text-base">
                            {selectedMeta.charm.emoji}
                          </span>
                        )}
                        <div
                          className="relative h-12 w-14 rounded-l-full shadow-lg transition-transform duration-75"
                          style={{
                            backgroundColor: selectedMeta.palette.halfA,
                            border: `2.5px solid ${selectedMeta.palette.stroke}`,
                            borderRightWidth: '1px',
                            transform: `translateX(${-pullProgress * 36}px) rotate(${-pullProgress * 14}deg)`,
                          }}
                        >
                          <div className="pointer-events-none absolute top-1.5 left-3 right-1 h-2 rounded-l-full bg-white/60" />
                        </div>
                        <div
                          className="relative flex h-12 w-14 items-center justify-center rounded-r-full shadow-lg transition-transform duration-75"
                          style={{
                            backgroundColor: selectedMeta.palette.translucent
                              ? 'rgba(255,248,232,0.55)'
                              : selectedMeta.palette.halfB,
                            border: `2.5px solid ${selectedMeta.palette.stroke}`,
                            borderLeftWidth: '1px',
                            transform: `translateX(${pullProgress * 36}px) rotate(${pullProgress * 14}deg)`,
                          }}
                        >
                          {selectedMeta.palette.translucent && (
                            <span className="h-5 w-9 rounded-xs border border-[#c49b66] bg-[#f5e4c3] text-center text-[10px] leading-5">
                              {selectedMeta.charm.emoji}
                            </span>
                          )}
                          <div className="pointer-events-none absolute top-1.5 left-1 right-3 h-2 rounded-r-full bg-white/60" />
                        </div>
                      </div>
                    )}
                  </div>

                  {isSelectedTimeLocked ? (
                    <div className="rounded-2xl border border-dashed border-[#c8a982] bg-[#fffaf0] p-3.5 text-center text-xs text-[#4a3425]">
                      <Clock className="mx-auto mb-1 h-5 w-5 text-[#b57a29]" />
                      <div className="font-extrabold">{selectedCapsule.title}</div>
                      <p className="mt-1 opacity-85">
                        Viên thuốc này đang được niêm phong kín cho tới ngày{' '}
                        <strong>{formatShortDate(selectedCapsule.unlockDate!)}</strong>.
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
                        <p className="font-bold text-[#c54650]">{pinUnlockError}</p>
                      )}
                    </form>
                  ) : unwrapStage === 'sealed' ? (
                    <div className="space-y-2.5 text-center">
                      <div className="text-xs font-bold opacity-85">
                        Bỏ lọ ngày {formatDisplayDateVi(selectedCapsule.entryDate)} •
                        Vuốt tách viên thuốc hoặc bấm bên dưới
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          triggerPopAndUnfurl(selectedCapsule, decryptedText)
                        }
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#b57a29] py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#99651f]"
                      >
                        <Sparkles className="h-4 w-4" /> Xoay & Bóc viên nhộng
                      </button>
                    </div>
                  ) : (
                    /* Unfurled Custom-Skin Scroll + Keepsake Charm */
                    <div
                      className={`animate-scroll-unfurl rounded-2xl border p-4 shadow-inner ${selectedMeta.scrollSkin.bgClass} ${selectedMeta.scrollSkin.textClass} ${selectedMeta.scrollSkin.borderClass}`}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 border-b border-current/15 pb-2 text-[11px]">
                        <span className="font-bold opacity-80">
                          📅 {formatDisplayDateVi(selectedCapsule.entryDate)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            title={selectedMeta.charm.label}
                            className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold"
                          >
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

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-current/15 pt-2.5">
                        {confirmDeleteId === selectedCapsule.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteNote(selectedCapsule.id);
                              setSelectedCapsule(null);
                              setConfirmDeleteId(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#c54650] px-3 py-1.5 text-[11px] font-extrabold text-white"
                          >
                            <Trash2 className="h-3 w-3" /> Xác nhận xóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(selectedCapsule.id)}
                            className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold text-[#c54650] hover:bg-black/5"
                          >
                            <Trash2 className="h-3 w-3" /> Xóa
                          </button>
                        )}

                        <span className="text-[10px] font-bold opacity-70">
                          Mở lần thứ {selectedMeta.openedCount + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedCapsule(null)}
                          className="rounded-xl bg-[#3d7c57] px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-2xs hover:bg-[#316647]"
                        >
                          🫶 Cuộn lại cất vào lọ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* --- 7-DAY DOSE RHYTHM + TILT-TO-POUR & PRESCRIPTION DRAW --- */
                <div className="space-y-3">
                  {/* 7-Day Daily Capsule Rhythm Strip */}
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

                  {/* Prescription Filter & Pour / Shake Buttons */}
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
                        onClick={triggerTiltPourOut}
                        disabled={capsules.length === 0 || pourMode}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-extrabold transition disabled:opacity-45 ${
                          isNight
                            ? 'border-[#6f523b] bg-[#261c15] text-[#f4e8d6] hover:bg-[#3a2b20]'
                            : 'border-[#cbb08c] bg-[#fbf5e9] text-[#382619] hover:bg-[#f0e3cd]'
                        }`}
                      >
                        🫗 Dốc lọ đổ 1 viên
                      </button>
                      <button
                        type="button"
                        onClick={handleDrawRandomCapsule}
                        disabled={capsules.length === 0}
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
