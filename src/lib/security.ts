import { DEFAULT_BOARD_TITLE, normalizeStoreData } from './sharing.ts';
import type { CatyStoreData, MemberRole, NoteItem } from '@/types/catyboard';

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const DEV_ADMIN_EMAIL = 'huynhphuclam147@gmail.com';
// Salted SHA-256 hash of the developer account password (no plaintext stored in code)
export const DEV_ADMIN_PASSWORD_HASH =
  'sha256$a7f3c9d1e4b80256194c7e2a8d3f6b10$e97bf59d20e3557634b45ad82ea3ff346db591277476ca0db4135ed4f5ca07ce';

export function isDevAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === DEV_ADMIN_EMAIL);
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
] as const;

export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB raw before compression
export const MAX_COMPRESSED_DATAURL_CHARS = 3_500_000; // ~2.5 MB base64
export const MAX_VOICE_DATAURL_CHARS = 2_000_000; // ~1.5 MB base64
export const MAX_BACKUP_FILE_BYTES = 15 * 1024 * 1024; // 15 MB JSON backup

export function sanitizeText(value: string, maxLength = 500): string {
  return value.replace(CONTROL_CHARS_RE, '').trim().slice(0, maxLength);
}

export function validateEmail(email: string): boolean {
  const cleaned = email.trim();
  return cleaned.length <= 254 && EMAIL_RE.test(cleaned);
}

export function validateSafeHttpUrl(
  rawUrl: string,
  options?: { allowLocalhostHttp?: boolean }
): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol === 'https:') {
    return parsed.toString();
  }

  if (
    options?.allowLocalhostHttp &&
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  ) {
    return parsed.toString();
  }

  return null;
}

/**
 * Prevents accidentally pasting a Supabase secret `service_role` JWT key into client code.
 */
export function isLikelyServiceRoleKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('sb_secret_')) return true;

  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const jsonStr =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(jsonStr) as { role?: string };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

export function validateImageFile(file: {
  type: string;
  size: number;
  name?: string;
}): { ok: true } | { ok: false; reason: string } {
  const mime = (file.type || '').toLowerCase().trim();
  const lowerName = (file.name || '').toLowerCase().trim();

  if (mime.includes('svg') || lowerName.endsWith('.svg') || lowerName.endsWith('.svgz')) {
    return {
      ok: false,
      reason: 'Không hỗ trợ file SVG vì lý do bảo mật. Hãy chọn ảnh JPG, PNG, WebP hoặc HEIC.',
    };
  }

  const isKnownMime =
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime) ||
    (mime.startsWith('image/') && !mime.includes('svg'));
  const hasAllowedExtension = /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(
    lowerName
  );
  // Mobile browsers (iOS/Android) sometimes pass empty file.type for camera roll / HEIC files
  const isMobileCameraRollFallback =
    (!mime || mime === 'application/octet-stream') &&
    (hasAllowedExtension || !lowerName);

  if (!isKnownMime && !hasAllowedExtension && !isMobileCameraRollFallback) {
    return {
      ok: false,
      reason: 'Chỉ hỗ trợ file ảnh (JPG, PNG, WebP, HEIC).',
    };
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_FILE_BYTES) {
    return {
      ok: false,
      reason: 'Ảnh vượt quá giới hạn 25MB. Hãy chọn ảnh nhẹ hơn nhé!',
    };
  }
  return { ok: true };
}

export function isAllowedPhotoDataUrl(dataUrl: string): boolean {
  if (!dataUrl || dataUrl.length > MAX_COMPRESSED_DATAURL_CHARS) return false;
  if (dataUrl.startsWith('https://')) return true;
  return /^data:image\/(jpeg|png|webp);base64,/i.test(dataUrl);
}

export function isAllowedAudioDataUrl(dataUrl: string): boolean {
  if (!dataUrl || dataUrl.length > MAX_VOICE_DATAURL_CHARS) return false;
  return /^data:audio\/(webm|mp4|mpeg|ogg|wav|x-m4a)(;codecs=[^;,]+)?;base64,/i.test(
    dataUrl
  );
}

// --- Salted SHA-256 PIN Hashing (Web Crypto API) ---

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isHashedPin(value?: string): boolean {
  return Boolean(value && /^sha256\$[0-9a-f]{32}\$[0-9a-f]{64}$/i.test(value));
}

export async function hashJournalPin(plainPin: string): Promise<string> {
  const cleaned = sanitizeText(plainPin, 32);
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = bytesToHex(saltBytes);
  const digestHex = await sha256Hex(`catyboard-pin-v1:${saltHex}:${cleaned}`);
  return `sha256$${saltHex}$${digestHex}`;
}

export async function verifyJournalPin(
  candidatePin: string,
  storedValue?: string
): Promise<boolean> {
  if (!storedValue) return true;
  const cleaned = sanitizeText(candidatePin, 32);

  if (isHashedPin(storedValue)) {
    const [, saltHex, expectedHex] = storedValue.split('$');
    const actualHex = await sha256Hex(`catyboard-pin-v1:${saltHex}:${cleaned}`);
    return constantTimeEqual(actualHex, expectedHex);
  }

  // Backward compatibility for legacy unhashed local PIN
  return constantTimeEqual(cleaned, storedValue);
}

// --- Client-Side End-to-End AES-GCM 256-bit Encryption for Private Notes & Capsules ---

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveAesKeyFromPin(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(`nhatki-e2ee-v1:${pin.trim()}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isEncryptedContent(value?: string | null): boolean {
  return Boolean(value && value.startsWith('enc:v1:'));
}

export async function encryptPrivateContent(
  plainText: string,
  pin: string
): Promise<string> {
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);
  const key = await deriveAesKeyFromPin(pin, salt);
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoded
  );
  const cipherHex = bytesToHex(new Uint8Array(cipherBuf));
  return `enc:v1:${bytesToHex(salt)}:${bytesToHex(iv)}:${cipherHex}`;
}

export async function decryptPrivateContent(
  payload: string,
  pin: string
): Promise<string | null> {
  if (!isEncryptedContent(payload)) return payload;
  const parts = payload.split(':');
  if (parts.length !== 5) return null;
  const [, , saltHex, ivHex, cipherHex] = parts;
  try {
    const salt = hexToBytes(saltHex);
    const iv = hexToBytes(ivHex);
    const cipherBytes = hexToBytes(cipherHex);
    const key = await deriveAesKeyFromPin(pin, salt);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

/**
 * Safely verifies the current PIN (when one already exists) and atomically
 * re-encrypts or decrypts all private notes/capsules so changing or removing a PIN
 * never strands previously encrypted memories.
 */
export async function rotateNotesPinEncryption(options: {
  notes: NoteItem[];
  storedPinHash?: string;
  currentPin?: string;
  newPin?: string;
  clearPin?: boolean;
  activeRole?: MemberRole;
}): Promise<
  | {
      ok: true;
      nextPinHash: string | undefined;
      updatedNotes: NoteItem[];
      changedNotes: NoteItem[];
    }
  | { ok: false; reason: string }
> {
  const hasExistingPin = Boolean(options.storedPinHash);
  const cleanedCurrent = sanitizeText(options.currentPin || '', 32);
  const cleanedNew = sanitizeText(options.newPin || '', 32);

  if (!options.clearPin && !cleanedNew) {
    let nextHash = options.storedPinHash;
    if (nextHash && !isHashedPin(nextHash)) {
      nextHash = await hashJournalPin(nextHash);
    }
    return {
      ok: true,
      nextPinHash: nextHash,
      updatedNotes: options.notes,
      changedNotes: [],
    };
  }

  if (hasExistingPin) {
    const rate = checkRateLimit('journal_pin');
    if (!rate.allowed) {
      return {
        ok: false,
        reason: `Thử sai nhiều lần — vui lòng chờ ${rate.retryAfterSec}s.`,
      };
    }
    if (!cleanedCurrent) {
      return {
        ok: false,
        reason: options.clearPin
          ? 'Nhập mã PIN hiện tại để xác nhận gỡ khóa.'
          : 'Nhập mã PIN hiện tại trước khi đổi sang PIN mới.',
      };
    }
    const valid = await verifyJournalPin(cleanedCurrent, options.storedPinHash);
    if (!valid) {
      const lim = recordRateLimitFailure('journal_pin');
      return {
        ok: false,
        reason: lim.locked
          ? `Mã PIN hiện tại chưa đúng — tạm khóa ${lim.retryAfterSec}s.`
          : 'Mã PIN hiện tại chưa chính xác.',
      };
    }
    resetRateLimit('journal_pin');
  }

  const isOwnedByActor = (note: NoteItem) =>
    !options.activeRole ||
    !note.authorRole ||
    note.authorRole === options.activeRole;

  // Phase 1: Decrypt all existing AES-256 notes first to guarantee zero data loss before mutating
  const decryptedByNoteId = new Map<string, string>();
  for (const note of options.notes) {
    if (!isEncryptedContent(note.content)) continue;
    if (!cleanedCurrent) {
      if (isOwnedByActor(note)) {
        return {
          ok: false,
          reason: 'Cần nhập mã PIN cũ để giải mã các ghi chú riêng tư hiện có.',
        };
      }
      continue;
    }
    const plain = await decryptPrivateContent(note.content, cleanedCurrent);
    if (plain === null) {
      if (isOwnedByActor(note)) {
        return {
          ok: false,
          reason:
            'Không thể giải mã một số ghi chú riêng tư cũ bằng mã PIN này. Dữ liệu vẫn được giữ nguyên an toàn.',
        };
      }
      continue;
    }
    decryptedByNoteId.set(note.id, plain);
  }

  // Phase 2: Re-encrypt with new PIN or restore plaintext when clearing PIN
  const nowIso = new Date().toISOString();
  const updatedNotes: NoteItem[] = [];
  const changedNotes: NoteItem[] = [];

  if (options.clearPin) {
    for (const note of options.notes) {
      if (decryptedByNoteId.has(note.id)) {
        const nextNote: NoteItem = {
          ...note,
          content: decryptedByNoteId.get(note.id)!,
          updatedAt: nowIso,
        };
        updatedNotes.push(nextNote);
        changedNotes.push(nextNote);
      } else {
        updatedNotes.push(note);
      }
    }
    return {
      ok: true,
      nextPinHash: undefined,
      updatedNotes,
      changedNotes,
    };
  }

  const nextPinHash = await hashJournalPin(cleanedNew);
  for (const note of options.notes) {
    if (decryptedByNoteId.has(note.id)) {
      const cipher = await encryptPrivateContent(
        decryptedByNoteId.get(note.id)!,
        cleanedNew
      );
      const nextNote: NoteItem = {
        ...note,
        content: cipher,
        updatedAt: nowIso,
      };
      updatedNotes.push(nextNote);
      changedNotes.push(nextNote);
    } else if (
      note.isPrivate &&
      !isEncryptedContent(note.content) &&
      note.content.trim().length > 0 &&
      isOwnedByActor(note)
    ) {
      const cipher = await encryptPrivateContent(note.content, cleanedNew);
      const nextNote: NoteItem = {
        ...note,
        content: cipher,
        updatedAt: nowIso,
      };
      updatedNotes.push(nextNote);
      changedNotes.push(nextNote);
    } else {
      updatedNotes.push(note);
    }
  }

  return {
    ok: true,
    nextPinHash,
    updatedNotes,
    changedNotes,
  };
}

// --- Client-side Rate Limiter for Login & PIN Unlock ---

interface RateBucket {
  failures: number;
  lockedUntil: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(
  bucketKey: string,
  now = Date.now()
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.lockedUntil <= now) {
    return { allowed: true };
  }
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil((bucket.lockedUntil - now) / 1000)),
  };
}

export function recordRateLimitFailure(
  bucketKey: string,
  maxAttempts = 5,
  baseCooldownMs = 30_000,
  now = Date.now()
): { locked: boolean; retryAfterSec: number } {
  const prev = rateBuckets.get(bucketKey) ?? { failures: 0, lockedUntil: 0 };
  const failures = prev.failures + 1;
  if (failures >= maxAttempts) {
    const multiplier = Math.min(4, failures - maxAttempts + 1);
    const lockedUntil = now + baseCooldownMs * multiplier;
    rateBuckets.set(bucketKey, { failures, lockedUntil });
    return { locked: true, retryAfterSec: Math.ceil((lockedUntil - now) / 1000) };
  }
  rateBuckets.set(bucketKey, { failures, lockedUntil: 0 });
  return { locked: false, retryAfterSec: 0 };
}

export function resetRateLimit(bucketKey: string): void {
  rateBuckets.delete(bucketKey);
}

// --- Safe JSON Backup Validator ---

export function validateBackupPayload(
  rawJsonText: string
): { ok: true; data: CatyStoreData } | { ok: false; reason: string } {
  if (rawJsonText.length > MAX_BACKUP_FILE_BYTES) {
    return { ok: false, reason: 'File backup quá lớn (tối đa 15MB).' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch {
    return { ok: false, reason: 'File JSON không hợp lệ hoặc bị hỏng.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'Cấu trúc file backup không đúng định dạng Nhật Kí (Diary).' };
  }

  const candidate = parsed as Partial<CatyStoreData>;
  if (typeof candidate.version !== 'number') {
    return { ok: false, reason: 'File không phải bản sao lưu của Nhật Kí (Diary).' };
  }

  const normalized = normalizeStoreData(candidate);

  // Sanitize imported strings & filter out unsafe data URLs / script links
  normalized.profile.boardTitle =
    sanitizeText(normalized.profile.boardTitle, 40) || DEFAULT_BOARD_TITLE;
  normalized.profile.catName = sanitizeText(normalized.profile.catName, 30) || 'Mochi';
  normalized.profile.partnerCatName =
    sanitizeText(normalized.profile.partnerCatName, 30) || 'Latte';

  normalized.photos = normalized.photos
    .slice(0, 500)
    .filter(
      (p) =>
        isAllowedPhotoDataUrl(p.dataUrl) ||
        p.dataUrl.startsWith('data:image/svg+xml;utf8,')
    )
    .map((p) => ({
      ...p,
      caption: sanitizeText(p.caption || '', 160),
      comments: (p.comments ?? []).slice(0, 50).map((c) => ({
        ...c,
        text:
          c.id === '__polaroid_back_voice__' && isAllowedAudioDataUrl(c.text || '')
            ? c.text
            : sanitizeText(c.text || '', 400),
      })),
    }));

  normalized.notes = normalized.notes.slice(0, 1000).map((n) => ({
    ...n,
    title: sanitizeText(n.title || '', 120),
    content: sanitizeText(
      n.content || '',
      isEncryptedContent(n.content) ? 65000 : 12000
    ),
  }));

  normalized.reminders = normalized.reminders.slice(0, 1000).map((r) => ({
    ...r,
    title: sanitizeText(r.title || '', 200),
  }));

  normalized.finance = normalized.finance
    .slice(0, 2000)
    .filter((f) => Number.isFinite(f.amount) && f.amount >= 0)
    .map((f) => ({
      ...f,
      note: sanitizeText(f.note || '', 160),
    }));

  normalized.voiceMemos = (normalized.voiceMemos ?? [])
    .slice(0, 200)
    .filter((v) => isAllowedAudioDataUrl(v.dataUrl))
    .map((v) => ({
      ...v,
      title: sanitizeText(v.title || '', 120),
    }));

  normalized.tracks = normalized.tracks
    .slice(0, 200)
    .filter((t) => Boolean(validateSafeHttpUrl(t.url)))
    .map((t) => ({
      ...t,
      title: sanitizeText(t.title || '', 160),
    }));

  return { ok: true, data: normalized };
}
