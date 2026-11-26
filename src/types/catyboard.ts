export type ThemeMode = 'sunlit' | 'cozy-night';
export type CatStyle = 'doodle' | 'pixel' | 'chibi' | 'hybrid';
export type CatMood = 'happy' | 'chill' | 'sleepy' | 'rainy' | 'proud' | 'love';
export type WeatherType = 'sunny' | 'breeze' | 'rainy' | 'starry';
export type WashiStyle =
  | 'mint-gingham'
  | 'sky-gingham'
  | 'cream-dots'
  | 'lavender-plaid'
  | 'daisy-tape';
export type PaperStyle = 'cream-torn' | 'blue-lined' | 'mint-card' | 'kraft-ticket';
export type NoteKind = 'sticky' | 'letter' | 'time_capsule';
export type ReminderCategory = 'life' | 'work' | 'self-care' | 'cat';
export type FinanceType = 'expense' | 'income' | 'saving';
export type FinanceCategory =
  | 'food'
  | 'coffee'
  | 'shopping'
  | 'bills'
  | 'salary'
  | 'saving'
  | 'other';
export type FinanceMoodTag = 'treat' | 'essential' | 'impulse' | 'proud' | 'gift';
export type MusicSource = 'youtube' | 'spotify' | 'lofi';
export type SnapshotLayout = 'scrapbook' | 'receipt';
export type FilmFilterId = 'natural' | 'kodak-warm' | 'fuji-pastel' | 'lofi-night';
export type BoardStickerId =
  | 'daisy'
  | 'ribbon'
  | 'paw'
  | 'sky-heart'
  | 'sage-heart'
  | 'sparkle';
export type BoardTexture = 'cork' | 'linen' | 'grid-paper' | 'walnut';
export type FontStyle = 'rounded' | 'handwriting';
export type CatDecorId =
  | 'fairy-lights'
  | 'cactus'
  | 'steaming-mug'
  | 'cozy-beanie'
  | 'books';
export type RecurrenceType = 'none' | 'daily' | 'weekly';

export interface PhotoComment {
  id: string;
  text: string;
  authorRole?: MemberRole;
  createdAt: string;
}

export interface VoiceMemo {
  id: string;
  entryDate: string;
  title: string;
  dataUrl: string;
  durationSec: number;
  authorRole?: MemberRole;
  createdAt: string;
}

export interface SavingGoal {
  title: string;
  targetAmount: number;
  emoji: string;
}

export interface DailyPromptAnswers {
  ownerAnswer?: string;
  partnerAnswer?: string;
  updatedAt?: string;
}

export type MemberRole = 'owner' | 'partner';
export type HeartColor = 'sky' | 'sage' | 'blush' | 'cream';

export interface BoardMember {
  userId?: string;
  role: MemberRole;
  email: string;
  nickname: string; // Defaults to 'Him' (owner) and 'Her' (partner)
  heartColor: HeartColor;
  joinedAt: string;
}

export interface BoardInvitation {
  id: string;
  boardId: string;
  boardTitle?: string;
  inviterNickname: string;
  inviteeEmail: string;
  inviteeNickname: string;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
}

export interface BoardSharingState {
  boardId?: string;
  members: BoardMember[]; // 1 member = solo board; 2 members = shared duo board
  pendingInvite?: BoardInvitation | null;
  activeRole: MemberRole; // Current viewer's role (also switchable locally in solo/demo preview)
}

export interface UserProfile {
  boardTitle: string;
  catName: string;
  partnerCatName: string;
  catStyle: CatStyle;
  defaultTheme: ThemeMode;
  boardTexture: BoardTexture;
  fontStyle: FontStyle;
  monthlyBudget: number;
  savingGoal: SavingGoal;
  activeDecor: CatDecorId[];
  currency: string;
  journalPin?: string;
}

export interface DayEntry {
  entryDate: string; // YYYY-MM-DD
  mood: CatMood;
  partnerMood?: CatMood;
  weather: WeatherType;
  songTitle?: string;
  songArtist?: string;
  songSource?: MusicSource;
  songUrl?: string;
  dailyQuote?: string;
  promptAnswers?: DailyPromptAnswers;
  stickers?: BoardStickerId[];
  updatedAt: string;
}

export interface DayPhoto {
  id: string;
  entryDate: string;
  dataUrl: string; // Compressed base64 or signed URL
  storagePath?: string;
  caption: string;
  washiStyle: WashiStyle;
  rotationDeg: number;
  isCover: boolean;
  authorRole?: MemberRole;
  reactions?: string[];
  comments?: PhotoComment[];
  createdAt: string;
}

export interface NoteItem {
  id: string;
  entryDate: string;
  kind: NoteKind;
  title: string;
  content: string;
  paperStyle: PaperStyle;
  isPrivate: boolean;
  unlockDate?: string; // YYYY-MM-DD for Time Capsule
  pinned: boolean;
  authorRole?: MemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  entryDate: string;
  title: string;
  dueTime?: string;
  completed: boolean;
  completedAt?: string;
  authorRole?: MemberRole;
  completedByRole?: MemberRole;
  recurrence?: RecurrenceType;
  category: ReminderCategory;
  createdAt: string;
}

export interface FinanceEntry {
  id: string;
  entryDate: string;
  type: FinanceType;
  amount: number;
  category: FinanceCategory;
  moodTag: FinanceMoodTag;
  note: string;
  authorRole?: MemberRole;
  createdAt: string;
}

export interface MusicTrack {
  id: string;
  source: 'youtube' | 'spotify';
  url: string;
  embedId: string;
  isPlaylist: boolean;
  spotifyKind?: 'track' | 'playlist' | 'album' | 'episode';
  title: string;
  artistOrChannel: string;
  vibeTag: string;
  isFavorite: boolean;
  authorRole?: MemberRole;
  createdAt: string;
}

export interface AmbientLevels {
  rain: number; // 0..1
  purr: number; // 0..1
  fire: number; // 0..1
}

export interface CatyStoreData {
  version: number;
  hasSampleData: boolean;
  profile: UserProfile;
  sharing: BoardSharingState;
  syncedTrack?: MusicTrack | null;
  dayEntries: Record<string, DayEntry>;
  photos: DayPhoto[];
  notes: NoteItem[];
  reminders: ReminderItem[];
  finance: FinanceEntry[];
  voiceMemos: VoiceMemo[];
  tracks: MusicTrack[];
}

export interface CloudConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  spotifyClientId?: string;
}
