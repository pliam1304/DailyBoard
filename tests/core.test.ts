import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMusicUrl } from '../src/lib/media.ts';
import {
  formatVnd,
  formatVndInput,
  getMonthMatrix,
  parseDateKey,
  parseVndInput,
  shiftDateKey,
  toLocalDateKey,
} from '../src/lib/date.ts';
import {
  buildInviteUrl,
  createDefaultSharing,
  createUuid,
  DEFAULT_BOARD_TITLE,
  extractInviteCodeFromInput,
  getMemberNickname,
  inviteSecondPerson,
  isOpenInviteEmail,
  isSharedDuo,
  isUuid,
  normalizeStoreData,
  OPEN_INVITE_EMAIL,
  renameMember,
  revertToSoloBoard,
} from '../src/lib/sharing.ts';
import {
  calculateStreak,
  calculateStreakDetails,
  computeMonthlyWrapped,
  formatFilmDateStamp,
  getDailyCatFortune,
  getDailyPrompt,
} from '../src/lib/prompts.ts';
import {
  computeFishPoints,
  getRemindersForDateWithRecurrence,
  pickThrowbackPhoto,
  searchAcrossBoard,
} from '../src/lib/search.ts';
import {
  checkRateLimit,
  decryptPrivateContent,
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD_HASH,
  encryptPrivateContent,
  hashJournalPin,
  isDevAdminEmail,
  isEncryptedContent,
  isHashedPin,
  isLikelyServiceRoleKey,
  recordRateLimitFailure,
  resetRateLimit,
  rotateNotesPinEncryption,
  validateBackupPayload,
  validateImageFile,
  validateSafeHttpUrl,
  verifyJournalPin,
} from '../src/lib/security.ts';
import {
  mergeStoresPreservingMedia,
  stripHeavyMediaForLocalStorage,
} from '../src/lib/storage.ts';
import {
  encodeCapsuleStyle,
  extractCapsulesFromNotes,
  isCapsuleNote,
  isPureCapsuleNote,
  parseCapsuleStyle,
} from '../src/lib/capsules.ts';

test('parseMusicUrl parses YouTube watch, short, live, and playlist links', () => {
  const watch = parseMusicUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
  assert.equal(watch?.source, 'youtube');
  assert.equal(watch?.embedId, 'jfKfPfyJRdk');
  assert.match(watch?.embedUrl ?? '', /autoplay=1/);

  const shortLink = parseMusicUrl('https://youtu.be/5qap5aO4i9A?si=abc');
  assert.equal(shortLink?.source, 'youtube');
  assert.equal(shortLink?.embedId, '5qap5aO4i9A');

  const playlist = parseMusicUrl(
    'https://www.youtube.com/playlist?list=PL1234567890'
  );
  assert.equal(playlist?.source, 'youtube');
  assert.equal(playlist?.isPlaylist, true);
  assert.equal(playlist?.embedId, 'PL1234567890');
});

test('parseMusicUrl parses Spotify track and localized playlist links', () => {
  const sp = parseMusicUrl(
    'https://open.spotify.com/intl-vi/playlist/37i9dQZF1DWWQRwui0ExPn?si=xyz'
  );
  assert.equal(sp?.source, 'spotify');
  assert.equal(sp?.spotifyKind, 'playlist');
  assert.equal(sp?.isPlaylist, true);
  assert.equal(sp?.embedId, '37i9dQZF1DWWQRwui0ExPn');

  assert.equal(parseMusicUrl('not a valid link at all'), null);
});

test('date helpers handle local date shifts and month grid cleanly', () => {
  assert.equal(shiftDateKey('2026-11-20', -1), '2026-11-19');
  assert.equal(shiftDateKey('2026-11-30', 1), '2026-12-01');
  const parsed = parseDateKey('2026-11-20');
  assert.equal(toLocalDateKey(parsed), '2026-11-20');

  const nov2026 = getMonthMatrix(2026, 10); // November 2026
  assert.equal(nov2026.length % 7, 0);
  assert.ok(nov2026.includes('2026-11-01'));
  assert.ok(nov2026.includes('2026-11-30'));
  assert.equal(formatVnd(45000), '45.000đ');
});

test('sharing starts solo, upgrades to Him/Her duo on email invite, supports mutual rename and solo revert', () => {
  const solo = createDefaultSharing('him@example.com');
  assert.equal(isSharedDuo(solo), false);
  assert.equal(getMemberNickname(solo, 'owner'), 'Him');

  const duo = inviteSecondPerson(solo, 'Her@Example.COM');
  assert.equal(isSharedDuo(duo), true);
  assert.equal(getMemberNickname(duo, 'owner'), 'Him');
  assert.equal(getMemberNickname(duo, 'partner'), 'Her');
  assert.equal(duo.pendingInvite?.inviteeEmail, 'her@example.com');
  assert.match(
    buildInviteUrl('https://diary.app', duo.pendingInvite?.inviteCode || ''),
    /^https:\/\/diary\.app\/\?invite=DIARY-/
  );

  const renamedOwner = renameMember(duo, 'owner', 'Anh Mèo', 'blush');
  const renamedBoth = renameMember(renamedOwner, 'partner', 'Bé Cá', 'sky');
  assert.equal(getMemberNickname(renamedBoth, 'owner'), 'Anh Mèo');
  assert.equal(getMemberNickname(renamedBoth, 'partner'), 'Bé Cá');

  const backToSolo = revertToSoloBoard(renamedBoth);
  assert.equal(isSharedDuo(backToSolo), false);
  assert.equal(backToSolo.pendingInvite, null);
});

test('normalizeStoreData defaults boardTitle to Name, upgrades v1 data safely, and createUuid produces valid UUIDs', () => {
  const upgraded = normalizeStoreData({
    version: 1,
    hasSampleData: false,
  });
  assert.equal(upgraded.version, 3);
  assert.equal(DEFAULT_BOARD_TITLE, 'Name');
  assert.equal(upgraded.profile.boardTitle, 'Name');
  assert.equal(upgraded.profile.partnerCatName, 'Latte');
  assert.equal(upgraded.profile.boardTexture, 'cork');
  assert.equal(isSharedDuo(upgraded.sharing), false);
  assert.equal(upgraded.photos.length, 0);
  assert.equal(upgraded.notes.length, 0);
  assert.equal(upgraded.reminders.length, 0);
  assert.equal(upgraded.finance.length, 0);

  const generated = createUuid();
  assert.equal(isUuid(generated), true);
  assert.equal(isUuid('sample-photo-1'), false);
});

test('daily prompts, retro film date stamp, streak calculation, and monthly wrapped work accurately', () => {
  const promptA = getDailyPrompt('2026-11-20');
  const promptB = getDailyPrompt('2026-11-20');
  assert.equal(promptA, promptB);
  assert.ok(promptA.length > 10);

  assert.equal(formatFilmDateStamp('2026-11-20'), "'26 11 20");

  const mockStore = normalizeStoreData({
    version: 2,
    dayEntries: {
      '2026-11-20': { entryDate: '2026-11-20', mood: 'happy', weather: 'sunny', updatedAt: '' },
      '2026-11-19': { entryDate: '2026-11-19', mood: 'happy', weather: 'rainy', updatedAt: '' },
    },
    photos: [
      {
        id: createUuid(),
        entryDate: '2026-11-20',
        dataUrl: 'data:image/jpeg;base64,abc',
        caption: 'Hôm nay',
        washiStyle: 'sky-gingham',
        rotationDeg: -2,
        isCover: true,
        createdAt: '',
      },
      {
        id: createUuid(),
        entryDate: '2026-11-19',
        dataUrl: 'data:image/jpeg;base64,def',
        caption: 'Hôm qua',
        washiStyle: 'mint-gingham',
        rotationDeg: 2,
        isCover: true,
        createdAt: '',
      },
    ],
    reminders: [
      {
        id: createUuid(),
        entryDate: '2026-11-20',
        title: 'Uống nước',
        completed: true,
        category: 'self-care',
        createdAt: '',
      },
    ],
    finance: [
      {
        id: createUuid(),
        entryDate: '2026-11-20',
        type: 'expense',
        amount: 55000,
        category: 'coffee',
        moodTag: 'treat',
        note: 'Matcha',
        createdAt: '',
      },
      {
        id: createUuid(),
        entryDate: '2026-11-19',
        type: 'saving',
        amount: 200000,
        category: 'saving',
        moodTag: 'proud',
        note: 'Ống heo',
        createdAt: '',
      },
    ],
  });

  const fortune = getDailyCatFortune('2026-11-26');
  assert.ok(fortune.quote.length > 10);
  assert.equal(fortune.quote, getDailyCatFortune('2026-11-26').quote);

  const quickCheckinOnly = normalizeStoreData({
    version: 3,
    dayEntries: {
      '2026-11-26': {
        entryDate: '2026-11-26',
        mood: 'happy',
        weather: 'sunny',
        checkedIn: true,
        updatedAt: '',
      },
    },
  });
  assert.equal(calculateStreak(quickCheckinOnly, '2026-11-26'), 1);

  assert.equal(calculateStreak(mockStore, '2026-11-20'), 2);
  const wrapped = computeMonthlyWrapped(mockStore, '2026-11');
  assert.equal(wrapped.photos.length, 2);
  assert.equal(wrapped.activeDays, 2);
  assert.equal(wrapped.totalDoneReminders, 1);
  assert.equal(wrapped.totalExpense, 55000);
  assert.equal(wrapped.totalSaving, 200000);
  assert.equal(wrapped.topExpenseCategory?.category, 'coffee');
  assert.equal(wrapped.topMoodTag?.tag, 'treat');
  assert.equal(wrapped.topMoodTag?.percent, 100);
  assert.equal(wrapped.topMood?.mood, 'happy');
});

test('searchAcrossBoard, throwback picker, fish points, and recurring reminders work cleanly', () => {
  const store = normalizeStoreData({
    version: 3,
    photos: [
      {
        id: createUuid(),
        entryDate: '2026-11-10',
        dataUrl: 'data:image/jpeg;base64,old',
        caption: 'Chiều Đà Lạt sương mù',
        washiStyle: 'sky-gingham',
        rotationDeg: -2,
        isCover: true,
        comments: [
          { id: createUuid(), text: 'Đẹp quá luôn!', authorRole: 'partner', createdAt: '' },
        ],
        createdAt: '',
      },
    ],
    notes: [
      {
        id: createUuid(),
        entryDate: '2026-11-15',
        kind: 'letter',
        title: 'Bí mật nhỏ',
        content: 'Nội dung ẩn riêng tư',
        paperStyle: 'blue-lined',
        isPrivate: true,
        pinned: false,
        createdAt: '',
        updatedAt: '',
      },
    ],
    reminders: [
      {
        id: 'rem-daily-1',
        entryDate: '2026-11-18',
        title: 'Uống vitamin buổi tối',
        dueTime: '20:00',
        completed: true,
        recurrence: 'daily',
        category: 'self-care',
        createdAt: '',
      },
      {
        id: 'rem-weekly-1',
        entryDate: '2026-11-13', // Friday
        title: 'Dọn bàn học cuối tuần',
        completed: false,
        recurrence: 'weekly',
        category: 'life',
        createdAt: '',
      },
    ],
    voiceMemos: [
      {
        id: createUuid(),
        entryDate: '2026-11-20',
        title: 'Chúc ngủ ngon Mochi',
        dataUrl: 'data:audio/webm;base64,aaa',
        durationSec: 12,
        createdAt: '',
      },
    ],
  });

  // Search finds photo comment, voice memo, and respects private note content
  const commentHits = searchAcrossBoard(store, 'đẹp quá');
  assert.equal(commentHits.length, 1);
  assert.equal(commentHits[0].kind, 'photo');

  const voiceHits = searchAcrossBoard(store, 'ngủ ngon');
  assert.equal(voiceHits.length, 1);
  assert.equal(voiceHits[0].kind, 'voice');

  assert.equal(searchAcrossBoard(store, 'ẩn riêng tư').length, 0);
  assert.equal(searchAcrossBoard(store, 'bí mật').length, 1);

  // Throwback picks earlier photo
  const throwback = pickThrowbackPhoto(store, '2026-11-20');
  assert.equal(throwback?.entryDate, '2026-11-10');

  // Fish currency earns points from photos, done reminders, notes, voice memos
  assert.ok(computeFishPoints(store, '2026-11-20') >= 8);

  // Recurring daily + weekly (2026-11-20 is also Friday!) expand cleanly
  const expanded = getRemindersForDateWithRecurrence(store.reminders, '2026-11-20');
  assert.equal(expanded.length, 2);
  assert.ok(expanded.some((r) => r.title === 'Uống vitamin buổi tối' && !r.completed));
  assert.ok(expanded.some((r) => r.title === 'Dọn bàn học cuối tuần'));
});

test('security helpers hash PINs, block service_role keys, restrict uploads, rate-limit, and sanitize backups', async () => {
  // 1. Salted SHA-256 PIN hashing & verification
  const hashed = await hashJournalPin('2580');
  assert.equal(isHashedPin(hashed), true);
  assert.notEqual(hashed, '2580');
  assert.equal(await verifyJournalPin('2580', hashed), true);
  assert.equal(await verifyJournalPin('9999', hashed), false);
  // Legacy plaintext compatibility
  assert.equal(await verifyJournalPin('1234', '1234'), true);

  // 2. Service role key detector
  const fakeServiceJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
    JSON.stringify({ role: 'service_role' })
  ).toString('base64url')}.sig`;
  const fakeAnonJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
    JSON.stringify({ role: 'anon' })
  ).toString('base64url')}.sig`;
  assert.equal(isLikelyServiceRoleKey(fakeServiceJwt), true);
  assert.equal(isLikelyServiceRoleKey('sb_secret_abc123'), true);
  assert.equal(isLikelyServiceRoleKey(fakeAnonJwt), false);

  // 3. Safe URL validation (blocks javascript: and non-localhost http:)
  assert.equal(validateSafeHttpUrl('javascript:alert(1)'), null);
  assert.equal(validateSafeHttpUrl('http://evil.example.com'), null);
  assert.ok(validateSafeHttpUrl('https://open.spotify.com/track/123'));
  assert.ok(
    validateSafeHttpUrl('http://localhost:54321', { allowLocalhostHttp: true })
  );

  // 4. Upload restriction (supports mobile HEIC/empty-MIME camera roll while blocking SVG XSS & >25MB files)
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 500_000 }).ok, true);
  assert.equal(
    validateImageFile({ type: '', name: 'IMG_1234.HEIC', size: 14 * 1024 * 1024 }).ok,
    true
  );
  assert.equal(validateImageFile({ type: 'image/svg+xml', size: 1000 }).ok, false);
  assert.equal(
    validateImageFile({ type: '', name: 'payload.svg', size: 1000 }).ok,
    false
  );
  assert.equal(
    validateImageFile({ type: 'image/png', size: 30 * 1024 * 1024 }).ok,
    false
  );

  // 5. Rate limiter locks after 5 consecutive failures
  resetRateLimit('test_bucket');
  for (let i = 0; i < 4; i += 1) {
    assert.equal(recordRateLimitFailure('test_bucket', 5, 30_000, 1000).locked, false);
  }
  assert.equal(recordRateLimitFailure('test_bucket', 5, 30_000, 1000).locked, true);
  assert.equal(checkRateLimit('test_bucket', 2000).allowed, false);
  resetRateLimit('test_bucket');

  // 6. Backup payload sanitizer strips javascript: track URLs
  const sanitized = validateBackupPayload(
    JSON.stringify({
      version: 3,
      tracks: [
        {
          id: createUuid(),
          source: 'youtube',
          url: 'javascript:alert(1)',
          embedId: 'x',
          isPlaylist: false,
          title: 'Bad',
          artistOrChannel: '',
          vibeTag: '',
          isFavorite: false,
          createdAt: '',
        },
        {
          id: createUuid(),
          source: 'youtube',
          url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
          embedId: 'jfKfPfyJRdk',
          isPlaylist: false,
          title: 'Good Lofi',
          artistOrChannel: 'Lofi Girl',
          vibeTag: 'focus',
          isFavorite: true,
          createdAt: '',
        },
      ],
    })
  );
  assert.equal(sanitized.ok, true);
  if (sanitized.ok) {
    assert.equal(sanitized.data.tracks.length, 1);
    assert.equal(sanitized.data.tracks[0].title, 'Good Lofi');
  }

  // 7. Dev Admin role & salted SHA-256 hash verification (no plaintext stored)
  assert.equal(DEV_ADMIN_EMAIL, 'huynhphuclam147@gmail.com');
  assert.equal(isDevAdminEmail('HuynhPhucLam147@gmail.com'), true);
  assert.equal(isDevAdminEmail('normal.user@gmail.com'), false);
  assert.equal(isHashedPin(DEV_ADMIN_PASSWORD_HASH), true);
  assert.equal(
    await verifyJournalPin('WrongPassword999', DEV_ADMIN_PASSWORD_HASH),
    false
  );

  // 8. End-to-End AES-GCM 256-bit Encryption for Private Notes & Capsules
  const secretMessage =
    'Hôm nay hơi mệt một chút nhưng cảm ơn bản thân vì đã cố gắng 💊✨';
  const encryptedA = await encryptPrivateContent(secretMessage, '2468');
  const encryptedB = await encryptPrivateContent(secretMessage, '2468');
  assert.equal(isEncryptedContent(encryptedA), true);
  assert.notEqual(encryptedA, encryptedB); // Random salt + IV on every encryption
  assert.equal(encryptedA.includes('cố gắng'), false);
  assert.equal(await decryptPrivateContent(encryptedA, '9999'), null);
  assert.equal(await decryptPrivateContent(encryptedA, '2468'), secretMessage);
});

test('capsule metadata encoding, parsing, finishes, and streak shields work cleanly', () => {
  const style = encodeCapsuleStyle(
    'clear-firefly',
    'sad',
    3,
    'origami-star',
    'sakura-pink',
    'candy-stripe'
  );
  assert.equal(
    style,
    'capsule:clear-firefly:sad:3:origami-star:sakura-pink:candy-stripe'
  );

  const parsed = parseCapsuleStyle(style);
  assert.equal(parsed.isCapsule, true);
  assert.equal(parsed.colorId, 'clear-firefly');
  assert.equal(parsed.prescriptionId, 'sad');
  assert.equal(parsed.openedCount, 3);
  assert.equal(parsed.palette.translucent, true);
  assert.equal(parsed.charmId, 'origami-star');
  assert.equal(parsed.scrollSkinId, 'sakura-pink');
  assert.equal(parsed.finishId, 'candy-stripe');

  // Backward compatibility for 4-segment and 6-segment capsule strings
  const legacyParsed = parseCapsuleStyle('capsule:starlight-gold:miss:2');
  assert.equal(legacyParsed.isCapsule, true);
  assert.equal(legacyParsed.colorId, 'starlight-gold');
  assert.equal(legacyParsed.charmId, 'clover');
  assert.equal(legacyParsed.scrollSkinId, 'parchment');
  assert.equal(legacyParsed.finishId, 'star-dust');

  const plainParsed = parseCapsuleStyle('cream-torn');
  assert.equal(plainParsed.isCapsule, false);

  const store = normalizeStoreData({
    version: 3,
    notes: [
      {
        id: createUuid(),
        entryDate: '2026-11-26',
        kind: 'time_capsule',
        title: 'Viên thuốc tương lai',
        content: 'Bí mật chỉ mở vào năm 2099',
        paperStyle: encodeCapsuleStyle('lavender-mist', 'time_locked', 0),
        isPrivate: false,
        unlockDate: '2099-12-31',
        pinned: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: createUuid(),
        entryDate: '2026-11-26',
        kind: 'sticky',
        title: 'Ghi chú thường',
        content: 'Mua sữa hạt',
        paperStyle: 'cream-torn',
        isPrivate: false,
        pinned: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
  });

  const capsules = extractCapsulesFromNotes(store.notes);
  assert.equal(capsules.length, 1);
  assert.equal(isCapsuleNote(store.notes[0]), true);
  assert.equal(isPureCapsuleNote(store.notes[0]), true);
  assert.equal(isCapsuleNote(store.notes[1]), false);
  assert.equal(isPureCapsuleNote(store.notes[1]), false);

  // Time-locked capsule content must NOT leak through global search before unlockDate
  assert.equal(searchAcrossBoard(store, 'năm 2099').length, 0);
  const titleHits = searchAcrossBoard(store, 'tương lai');
  assert.equal(titleHits.length, 1);
  assert.match(titleHits[0].snippet, /Niêm phong/);

  // Cat Nap Shield (Thẻ Ngủ Đông): 7 total active days earns 1 shield that bridges a 1-day rest gap
  const sevenActiveDays: Record<string, { entryDate: string; mood: 'happy'; weather: 'sunny'; checkedIn: boolean; updatedAt: string }> = {};
  // Active on Nov 18, 19, 20, 21, 22, 23, SKIP Nov 24 (rest day!), active on Nov 25 & Nov 26 (8 active days total -> 1 shield earned!)
  for (const dk of [
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
    '2026-11-23',
    '2026-11-25',
    '2026-11-26',
  ]) {
    sevenActiveDays[dk] = {
      entryDate: dk,
      mood: 'happy',
      weather: 'sunny',
      checkedIn: true,
      updatedAt: '',
    };
  }
  const shieldStore = normalizeStoreData({
    version: 3,
    dayEntries: sevenActiveDays,
  });
  const details = calculateStreakDetails(shieldStore, '2026-11-26');
  assert.equal(details.usedShield, true);
  assert.equal(details.streak, 8);
});

test('Group 1 upgrades: VND live formatting, safe PIN rotation/removal, and slim storage media merge work cleanly', async () => {
  // 1. Live VND dot separator input & parser
  assert.equal(formatVndInput('45000'), '45.000');
  assert.equal(formatVndInput('001250000đ'), '1.250.000');
  assert.equal(formatVndInput(''), '');
  assert.equal(parseVndInput('45.000'), 45000);
  assert.equal(parseVndInput('1.250.000'), 1250000);

  // 2. Safe PIN setup, rotation, and removal without stranding AES-256 notes/capsules
  resetRateLimit('journal_pin');
  const initialNotes = [
    {
      id: createUuid(),
      entryDate: '2026-11-27',
      kind: 'letter' as const,
      title: 'Tâm thư riêng',
      content: 'Bí mật đầu tiên trước khi đặt PIN',
      paperStyle: 'blue-lined' as const,
      isPrivate: true,
      pinned: false,
      authorRole: 'owner' as const,
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    },
    {
      id: createUuid(),
      entryDate: '2026-11-27',
      kind: 'sticky' as const,
      title: 'Ghi chú công khai',
      content: 'Mua cà phê sáng',
      paperStyle: 'cream-torn' as const,
      isPrivate: false,
      pinned: true,
      authorRole: 'owner' as const,
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    },
  ];

  // Setting PIN for the first time encrypts existing private notes automatically
  const firstSetup = await rotateNotesPinEncryption({
    notes: initialNotes,
    newPin: '1357',
    activeRole: 'owner',
  });
  assert.equal(firstSetup.ok, true);
  if (!firstSetup.ok) return;
  assert.ok(firstSetup.nextPinHash);
  assert.equal(firstSetup.changedNotes.length, 1);
  assert.equal(isEncryptedContent(firstSetup.updatedNotes[0].content), true);
  assert.equal(firstSetup.updatedNotes[1].content, 'Mua cà phê sáng');

  // Changing PIN without current PIN or with wrong current PIN is blocked safely
  const blockedMissing = await rotateNotesPinEncryption({
    notes: firstSetup.updatedNotes,
    storedPinHash: firstSetup.nextPinHash,
    currentPin: '',
    newPin: '2468',
    activeRole: 'owner',
  });
  assert.equal(blockedMissing.ok, false);

  const blockedWrong = await rotateNotesPinEncryption({
    notes: firstSetup.updatedNotes,
    storedPinHash: firstSetup.nextPinHash,
    currentPin: '9999',
    newPin: '2468',
    activeRole: 'owner',
  });
  assert.equal(blockedWrong.ok, false);
  resetRateLimit('journal_pin');

  // Changing PIN with valid current PIN re-encrypts all private notes to new PIN
  const rotated = await rotateNotesPinEncryption({
    notes: firstSetup.updatedNotes,
    storedPinHash: firstSetup.nextPinHash,
    currentPin: '1357',
    newPin: '2468',
    activeRole: 'owner',
  });
  assert.equal(rotated.ok, true);
  if (!rotated.ok) return;
  assert.equal(await verifyJournalPin('2468', rotated.nextPinHash), true);
  assert.equal(
    await decryptPrivateContent(rotated.updatedNotes[0].content, '1357'),
    null
  );
  assert.equal(
    await decryptPrivateContent(rotated.updatedNotes[0].content, '2468'),
    'Bí mật đầu tiên trước khi đặt PIN'
  );

  // Clearing PIN requires current PIN and restores plaintext safely
  const cleared = await rotateNotesPinEncryption({
    notes: rotated.updatedNotes,
    storedPinHash: rotated.nextPinHash,
    currentPin: '2468',
    clearPin: true,
    activeRole: 'owner',
  });
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  assert.equal(cleared.nextPinHash, undefined);
  assert.equal(isEncryptedContent(cleared.updatedNotes[0].content), false);
  assert.equal(
    cleared.updatedNotes[0].content,
    'Bí mật đầu tiên trước khi đặt PIN'
  );

  // 3. Slim localStorage stripping & IndexedDB media re-hydration
  const photoId = createUuid();
  const voiceId = createUuid();
  const fullMediaStore = normalizeStoreData({
    version: 3,
    photos: [
      {
        id: photoId,
        entryDate: '2026-11-27',
        dataUrl: 'data:image/webp;base64,FULL_IMAGE_PAYLOAD',
        caption: 'Chú thích cũ',
        washiStyle: 'mint-gingham',
        rotationDeg: -1,
        isCover: true,
        comments: [
          {
            id: '__polaroid_back_voice__',
            text: 'data:audio/webm;base64,FULL_BACK_AUDIO',
            createdAt: '',
          },
        ],
        createdAt: '',
      },
    ],
    voiceMemos: [
      {
        id: voiceId,
        entryDate: '2026-11-27',
        title: 'Ghi âm tối',
        dataUrl: 'data:audio/webm;base64,FULL_VOICE_MEMO',
        durationSec: 8,
        createdAt: '',
      },
    ],
  });

  const stripped = stripHeavyMediaForLocalStorage(fullMediaStore);
  assert.equal(stripped.photos[0].dataUrl, '');
  assert.equal(stripped.photos[0].comments?.[0].text, '__idb_audio__');
  assert.equal(stripped.voiceMemos?.[0].dataUrl, '');

  // Simulate user editing caption on the slim metadata snapshot before IDB finishes
  const editedSlim = {
    ...stripped,
    photos: stripped.photos.map((p) => ({
      ...p,
      caption: 'Chú thích mới vừa gõ',
    })),
  };

  const rehydrated = mergeStoresPreservingMedia(editedSlim, fullMediaStore);
  assert.equal(rehydrated.photos[0].caption, 'Chú thích mới vừa gõ');
  assert.equal(
    rehydrated.photos[0].dataUrl,
    'data:image/webp;base64,FULL_IMAGE_PAYLOAD'
  );
  assert.equal(
    rehydrated.photos[0].comments?.[0].text,
    'data:audio/webm;base64,FULL_BACK_AUDIO'
  );
  assert.equal(
    rehydrated.voiceMemos?.[0].dataUrl,
    'data:audio/webm;base64,FULL_VOICE_MEMO'
  );
});

test('Open invite links, URL/code extraction, and cloud pending invite state work cleanly', () => {
  // 1. Parse full HTTPS URLs, query fragments, and lowercase raw invite codes
  assert.equal(
    extractInviteCodeFromInput('https://dailyboard-ten.vercel.app/?invite=diary-ab12cd34'),
    'DIARY-AB12CD34'
  );
  assert.equal(
    extractInviteCodeFromInput('  /?invite=DIARY-XY98ZW12&utm_source=zalo  '),
    'DIARY-XY98ZW12'
  );
  assert.equal(extractInviteCodeFromInput('  diary-k7m9p2q4 '), 'DIARY-K7M9P2Q4');
  assert.equal(extractInviteCodeFromInput(''), '');

  // 2. Open link invite (blank email -> open@invite.local) with activateDuoImmediately: false
  // keeps isSharedDuo === false while preserving pendingInvite so the share link box never disappears!
  const solo = createDefaultSharing('owner@gmail.com');
  const waitingForPartner = inviteSecondPerson(solo, '', {
    ownerNickname: 'Anh',
    partnerNickname: 'Em',
    boardId: '11111111-2222-4333-8444-555555555555',
    inviteCode: 'DIARY-OPEN1234',
    activateDuoImmediately: false,
  });

  assert.equal(isSharedDuo(waitingForPartner), false);
  assert.equal(waitingForPartner.members.length, 1);
  assert.equal(getMemberNickname(waitingForPartner, 'owner'), 'Anh');
  assert.equal(waitingForPartner.pendingInvite?.inviteCode, 'DIARY-OPEN1234');
  assert.equal(waitingForPartner.pendingInvite?.inviteeEmail, OPEN_INVITE_EMAIL);
  assert.equal(isOpenInviteEmail(waitingForPartner.pendingInvite?.inviteeEmail), true);
  assert.equal(isOpenInviteEmail('her@gmail.com'), false);
});
