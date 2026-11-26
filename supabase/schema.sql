-- CatyBoard Shared 1-or-2-Person Supabase Schema
-- Supports starting as a 1-person personal board and inviting 1 partner by email
-- to share Polaroid photos, notes, reminders, finance, and music in realtime.

create extension if not exists "pgcrypto";

-- 1. Shared Boards (starts with 1 owner; becomes a 2-person board once a partner joins)
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  board_title text not null default 'Name' check (char_length(board_title) <= 60),
  cat_name text not null default 'Mochi' check (char_length(cat_name) <= 40),
  partner_cat_name text not null default 'Latte' check (char_length(partner_cat_name) <= 40),
  cat_style text not null default 'hybrid' check (cat_style in ('doodle', 'pixel', 'chibi', 'hybrid')),
  default_theme text not null default 'sunlit' check (default_theme in ('sunlit', 'cozy-night')),
  board_texture text not null default 'cork' check (board_texture in ('cork', 'linen', 'grid-paper', 'walnut')),
  font_style text not null default 'rounded' check (font_style in ('rounded', 'handwriting')),
  monthly_budget numeric not null default 8000000 check (monthly_budget >= 0 and monthly_budget <= 100000000000),
  saving_goal jsonb,
  active_decor jsonb,
  currency text not null default 'VND' check (char_length(currency) <= 8),
  journal_pin_hash text check (journal_pin_hash is null or char_length(journal_pin_hash) <= 140),
  active_track jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Board Members (max 2 members: owner defaults to 'Him', partner defaults to 'Her'; both can rename each other)
create table if not exists public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  email text not null default '' check (char_length(email) <= 254),
  nickname text not null default 'Him' check (char_length(nickname) between 1 and 40),
  heart_color text not null default 'sky' check (heart_color in ('sky', 'sage', 'blush', 'cream')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

-- 3. Email Invitations (owner invites 1 person by email)
create table if not exists public.board_invitations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  inviter_nickname text not null default 'Him' check (char_length(inviter_nickname) <= 40),
  invitee_email text not null check (char_length(invitee_email) <= 254 and invitee_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invitee_nickname text not null default 'Her' check (char_length(invitee_nickname) <= 40),
  invite_code text not null unique check (char_length(invite_code) between 6 and 32),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

-- 4. Daily summary metadata per board
create table if not exists public.day_entries (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  entry_date date not null,
  mood text not null default 'chill',
  partner_mood text,
  weather text not null default 'sunny',
  song_title text,
  song_artist text,
  song_source text check (song_source in ('youtube', 'spotify', 'lofi')),
  song_url text,
  daily_quote text,
  prompt_answers jsonb,
  stickers jsonb,
  updated_at timestamptz not null default now(),
  unique (board_id, entry_date)
);

-- 5. Shared Polaroid Photos
create table if not exists public.day_photos (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null default 'owner' check (author_role in ('owner', 'partner')),
  entry_date date not null,
  storage_path text not null,
  caption text not null default '',
  washi_style text not null default 'mint-gingham',
  rotation_deg numeric not null default -2,
  is_cover boolean not null default true,
  reactions jsonb,
  comments jsonb,
  created_at timestamptz not null default now()
);

-- 6. Shared Sticky Notes, Letters (Tâm thư) & Time Capsules
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null default 'owner' check (author_role in ('owner', 'partner')),
  entry_date date not null,
  kind text not null default 'sticky' check (kind in ('sticky', 'letter', 'time_capsule')),
  title text not null default '',
  content text not null default '',
  paper_style text not null default 'cream-torn',
  is_private boolean not null default false,
  unlock_date date,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Shared Reminders & Completed Achievements ("Lời nhắc đã làm")
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null default 'owner' check (author_role in ('owner', 'partner')),
  entry_date date not null,
  title text not null,
  due_time text,
  completed boolean not null default false,
  completed_at timestamptz,
  completed_by_role text check (completed_by_role in ('owner', 'partner')),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly')),
  category text not null default 'life',
  created_at timestamptz not null default now()
);

-- 8. Shared Gentle Finance Entries
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null default 'owner' check (author_role in ('owner', 'partner')),
  entry_date date not null,
  type text not null default 'expense' check (type in ('expense', 'income', 'saving')),
  amount numeric not null check (amount >= 0),
  category text not null default 'food',
  mood_tag text not null default 'essential',
  note text not null default '',
  created_at timestamptz not null default now()
);

-- 9. Shared Saved YouTube & Spotify Tracks
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null default 'owner' check (author_role in ('owner', 'partner')),
  source text not null check (source in ('youtube', 'spotify')),
  url text not null,
  embed_id text not null,
  is_playlist boolean not null default false,
  spotify_kind text,
  title text not null,
  artist_or_channel text not null default '',
  vibe_tag text not null default 'chill',
  is_favorite boolean not null default true,
  created_at timestamptz not null default now()
);

-- 10. Shared Cassette Voice Memos (up to 30s audio notes, bounded data size)
create table if not exists public.voice_memos (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null default 'owner' check (author_role in ('owner', 'partner')),
  entry_date date not null,
  title text not null default 'Băng thu âm nhỏ' check (char_length(title) <= 140),
  audio_data_url text not null check (
    char_length(audio_data_url) <= 2200000
    and audio_data_url ~* '^data:audio/(webm|mp4|mpeg|ogg|wav|x-m4a)'
  ),
  duration_sec int not null default 0 check (duration_sec between 0 and 45),
  created_at timestamptz not null default now()
);

-- Block Field Tampering Triggers (prevent role escalation, owner_id hijack, or cross-board moves)
create or replace function public.prevent_board_tampering()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id or new.owner_id <> old.owner_id then
    raise exception 'Cannot modify immutable board ownership fields';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_board_tampering on public.boards;
create trigger trg_prevent_board_tampering
  before update on public.boards
  for each row execute function public.prevent_board_tampering();

create or replace function public.prevent_member_role_tampering()
returns trigger
language plpgsql
as $$
begin
  if new.board_id <> old.board_id
     or new.user_id <> old.user_id
     or new.role <> old.role
     or new.email <> old.email
     or new.joined_at <> old.joined_at then
    raise exception 'Members may only update nickname and heart_color';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_member_role_tampering on public.board_members;
create trigger trg_prevent_member_role_tampering
  before update on public.board_members
  for each row execute function public.prevent_member_role_tampering();

create or replace function public.prevent_record_ownership_tampering()
returns trigger
language plpgsql
as $$
begin
  if new.board_id <> old.board_id or new.author_id <> old.author_id then
    raise exception 'Cannot transfer record ownership or board_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_day_photos_ownership on public.day_photos;
create trigger trg_day_photos_ownership
  before update on public.day_photos
  for each row execute function public.prevent_record_ownership_tampering();

drop trigger if exists trg_notes_ownership on public.notes;
create trigger trg_notes_ownership
  before update on public.notes
  for each row execute function public.prevent_record_ownership_tampering();

drop trigger if exists trg_reminders_ownership on public.reminders;
create trigger trg_reminders_ownership
  before update on public.reminders
  for each row execute function public.prevent_record_ownership_tampering();

drop trigger if exists trg_finance_ownership on public.finance_entries;
create trigger trg_finance_ownership
  before update on public.finance_entries
  for each row execute function public.prevent_record_ownership_tampering();

drop trigger if exists trg_voice_ownership on public.voice_memos;
create trigger trg_voice_ownership
  before update on public.voice_memos
  for each row execute function public.prevent_record_ownership_tampering();

-- Indexes
create index if not exists idx_board_members_user on public.board_members (user_id);
create index if not exists idx_board_invites_email on public.board_invitations (lower(invitee_email), status);
create index if not exists idx_day_entries_board_date on public.day_entries (board_id, entry_date desc);
create index if not exists idx_day_photos_board_date on public.day_photos (board_id, entry_date desc);
create index if not exists idx_notes_board_date on public.notes (board_id, entry_date desc);
create index if not exists idx_reminders_board_date on public.reminders (board_id, entry_date desc);
create index if not exists idx_finance_board_date on public.finance_entries (board_id, entry_date desc);
create index if not exists idx_voice_memos_board_date on public.voice_memos (board_id, entry_date desc);

-- Security-definer helper functions to avoid RLS recursion
create or replace function public.is_board_member(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = target_board_id
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_board_owner(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = target_board_id
      and b.owner_id = auth.uid()
  );
$$;

create or replace function public.is_dev_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'huynhphuclam147@gmail.com';
$$;

-- RPC: Ensure signed-in user has a board (returns existing joined/owned board or creates a solo board)
create or replace function public.ensure_personal_board(
  p_default_nickname text default 'Him',
  p_board_title text default 'Name'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_board_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Prefer any board the user already joined (partner or owner)
  select bm.board_id into v_board_id
  from public.board_members bm
  where bm.user_id = v_uid
  order by case when bm.role = 'partner' then 0 else 1 end, bm.joined_at asc
  limit 1;

  if v_board_id is not null then
    return v_board_id;
  end if;

  insert into public.boards (owner_id, board_title)
  values (v_uid, p_board_title)
  returning id into v_board_id;

  insert into public.board_members (board_id, user_id, role, email, nickname, heart_color)
  values (v_board_id, v_uid, 'owner', lower(v_email), coalesce(nullif(p_default_nickname, ''), 'Him'), 'sky');

  return v_board_id;
end;
$$;

-- RPC: List pending invitations addressed to the currently signed-in user's email
create or replace function public.get_my_pending_invitations()
returns table (
  id uuid,
  board_id uuid,
  board_title text,
  inviter_nickname text,
  invitee_email text,
  invitee_nickname text,
  invite_code text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    bi.id,
    bi.board_id,
    b.board_title,
    bi.inviter_nickname,
    bi.invitee_email,
    bi.invitee_nickname,
    bi.invite_code,
    bi.created_at
  from public.board_invitations bi
  join public.boards b on b.id = bi.board_id
  where bi.status = 'pending'
    and lower(bi.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by bi.created_at desc;
$$;

-- RPC: Accept an email invitation (joins the shared 2-person board)
create or replace function public.accept_board_invitation(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv public.board_invitations%rowtype;
  v_member_count int;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập trước khi chấp nhận lời mời.';
  end if;

  select * into v_inv
  from public.board_invitations
  where invite_code = p_invite_code
    and status = 'pending'
  limit 1;

  if not found then
    raise exception 'Lời mời không tồn tại hoặc đã hết hạn.';
  end if;

  if lower(v_inv.invitee_email) <> v_email then
    raise exception 'Lời mời này được gửi cho email %, hãy đăng nhập đúng email đó nhé.', v_inv.invitee_email;
  end if;

  select count(*) into v_member_count
  from public.board_members
  where board_id = v_inv.board_id;

  if v_member_count >= 2 and not exists (
    select 1 from public.board_members where board_id = v_inv.board_id and user_id = v_uid
  ) then
    raise exception 'Bảng này đã đủ 2 người rồi.';
  end if;

  insert into public.board_members (board_id, user_id, role, email, nickname, heart_color)
  values (
    v_inv.board_id,
    v_uid,
    'partner',
    v_email,
    coalesce(nullif(v_inv.invitee_nickname, ''), 'Her'),
    'sage'
  )
  on conflict (board_id, user_id) do nothing;

  update public.board_invitations
  set status = 'accepted'
  where id = v_inv.id;

  return v_inv.board_id;
end;
$$;

-- Enable Row Level Security
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.board_invitations enable row level security;
alter table public.day_entries enable row level security;
alter table public.day_photos enable row level security;
alter table public.notes enable row level security;
alter table public.reminders enable row level security;
alter table public.finance_entries enable row level security;
alter table public.voice_memos enable row level security;
alter table public.music_tracks enable row level security;

-- Lock anonymous table access & explicitly grant authenticated role privileges (RLS still enforces row ownership)
revoke all on public.boards from anon;
revoke all on public.board_members from anon;
revoke all on public.board_invitations from anon;
revoke all on public.day_entries from anon;
revoke all on public.day_photos from anon;
revoke all on public.notes from anon;
revoke all on public.reminders from anon;
revoke all on public.finance_entries from anon;
revoke all on public.voice_memos from anon;
revoke all on public.music_tracks from anon;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.boards to authenticated;
grant select, insert, update, delete on public.board_members to authenticated;
grant select, insert, update, delete on public.board_invitations to authenticated;
grant select, insert, update, delete on public.day_entries to authenticated;
grant select, insert, update, delete on public.day_photos to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.finance_entries to authenticated;
grant select, insert, update, delete on public.voice_memos to authenticated;
grant select, insert, update, delete on public.music_tracks to authenticated;

grant execute on function public.is_board_member(uuid) to authenticated;
grant execute on function public.is_board_owner(uuid) to authenticated;
grant execute on function public.is_dev_admin() to authenticated;
grant execute on function public.ensure_personal_board(text, text) to authenticated;
grant execute on function public.get_my_pending_invitations() to authenticated;
grant execute on function public.accept_board_invitation(text) to authenticated;

-- Boards policies
drop policy if exists "Members view and update shared board" on public.boards;
create policy "Members view and update shared board" on public.boards
  for select using (public.is_board_member(id));

drop policy if exists "Members update shared board" on public.boards;
create policy "Members update shared board" on public.boards
  for update using (public.is_board_member(id))
  with check (public.is_board_member(id));

drop policy if exists "Authenticated users create own board" on public.boards;
create policy "Authenticated users create own board" on public.boards
  for insert with check (auth.uid() = owner_id);

-- Board members policies (both members can view & rename each other's nickname!)
drop policy if exists "Members view board members" on public.board_members;
create policy "Members view board members" on public.board_members
  for select using (public.is_board_member(board_id));

drop policy if exists "Members update nicknames on shared board" on public.board_members;
create policy "Members update nicknames on shared board" on public.board_members
  for update using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "Owner removes partner or self leaves" on public.board_members;
create policy "Owner removes partner or self leaves" on public.board_members
  for delete using (
    user_id = auth.uid() or public.is_board_owner(board_id)
  );

-- Board invitations policies
drop policy if exists "Members manage board invitations" on public.board_invitations;
create policy "Members manage board invitations" on public.board_invitations
  for all using (
    public.is_board_member(board_id)
    or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (public.is_board_owner(board_id));

-- Shared module policies
drop policy if exists "Members manage shared day_entries" on public.day_entries;
create policy "Members manage shared day_entries" on public.day_entries
  for all using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "Members manage shared day_photos" on public.day_photos;
create policy "Members manage shared day_photos" on public.day_photos
  for all using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

-- Notes preserve privacy: private notes are visible/editable ONLY by their own author
drop policy if exists "Members read shared notes and own private notes" on public.notes;
create policy "Members read shared notes and own private notes" on public.notes
  for select using (
    public.is_board_member(board_id)
    and (not is_private or author_id = auth.uid())
  );

drop policy if exists "Members insert notes on shared board" on public.notes;
create policy "Members insert notes on shared board" on public.notes
  for insert with check (
    public.is_board_member(board_id) and author_id = auth.uid()
  );

drop policy if exists "Members update shared notes or own private notes" on public.notes;
create policy "Members update shared notes or own private notes" on public.notes
  for update using (
    public.is_board_member(board_id)
    and (not is_private or author_id = auth.uid())
  )
  with check (
    public.is_board_member(board_id)
    and (not is_private or author_id = auth.uid())
  );

drop policy if exists "Members delete shared notes or own private notes" on public.notes;
create policy "Members delete shared notes or own private notes" on public.notes
  for delete using (
    public.is_board_member(board_id)
    and (not is_private or author_id = auth.uid())
  );

drop policy if exists "Members manage shared reminders" on public.reminders;
create policy "Members manage shared reminders" on public.reminders
  for all using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "Members manage shared finance_entries" on public.finance_entries;
create policy "Members manage shared finance_entries" on public.finance_entries
  for all using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "Members manage shared voice_memos" on public.voice_memos;
create policy "Members manage shared voice_memos" on public.voice_memos
  for all using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

drop policy if exists "Members manage shared music_tracks" on public.music_tracks;
create policy "Members manage shared music_tracks" on public.music_tracks
  for all using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

-- Private Storage bucket shared strictly among board members (path: <board_id>/<date>/<file>)
-- Server-side restrictions: 5MB max, strictly JPEG / PNG / WebP (no SVG or executable uploads)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'daily-photos',
  'daily-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users upload own daily photos" on storage.objects;
drop policy if exists "Users view own daily photos" on storage.objects;
drop policy if exists "Users delete own daily photos" on storage.objects;
drop policy if exists "Board members upload shared photos" on storage.objects;
drop policy if exists "Board members view shared photos" on storage.objects;
drop policy if exists "Board members delete shared photos" on storage.objects;

create policy "Board members upload shared photos" on storage.objects
  for insert with check (
    bucket_id = 'daily-photos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_board_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Board members view shared photos" on storage.objects
  for select using (
    bucket_id = 'daily-photos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_board_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Board members delete shared photos" on storage.objects
  for delete using (
    bucket_id = 'daily-photos'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_board_member(((storage.foldername(name))[1])::uuid)
  );

-- Enable Realtime on all shared tables (idempotent)
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'boards',
    'board_members',
    'board_invitations',
    'day_entries',
    'day_photos',
    'notes',
    'reminders',
    'finance_entries',
    'voice_memos',
    'music_tracks'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then
        null;
    end;
  end loop;
end $$;
