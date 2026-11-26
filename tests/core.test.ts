import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMusicUrl } from '../src/lib/media.ts';
import {
  formatVnd,
  getMonthMatrix,
  parseDateKey,
  shiftDateKey,
  toLocalDateKey,
} from '../src/lib/date.ts';
import {
  buildInviteUrl,
  createDefaultSharing,
  createUuid,
  DEFAULT_BOARD_TITLE,
  getMemberNickname,
  inviteSecondPerson,
  isSharedDuo,
  isUuid,
  normalizeStoreData,
  renameMember,
  revertToSoloBoard,
} from '../src/lib/sharing.ts';
import {
  calculateStreak,
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
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD_HASH,
  hashJournalPin,
  isDevAdminEmail,
  isHashedPin,
  isLikelyServiceRoleKey,
  recordRateLimitFailure,
  resetRateLimit,
  validateBackupPayload,
  validateImageFile,
  validateSafeHttpUrl,
  verifyJournalPin,
} from '../src/lib/security.ts';

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
});
