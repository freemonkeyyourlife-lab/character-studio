create table if not exists public.characters (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  age text not null default '',
  appearance text not null default '',
  personality text not null default '',
  reference_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null default '',
  prompt text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;
alter table public.generations enable row level security;

drop policy if exists "characters_owner_select" on public.characters;
drop policy if exists "characters_owner_insert" on public.characters;
drop policy if exists "characters_owner_update" on public.characters;
drop policy if exists "characters_owner_delete" on public.characters;
drop policy if exists "generations_owner_select" on public.generations;
drop policy if exists "generations_owner_insert" on public.generations;
drop policy if exists "generations_owner_update" on public.generations;
drop policy if exists "generations_owner_delete" on public.generations;

create policy "characters_owner_select" on public.characters for select using (auth.uid() = user_id);
create policy "characters_owner_insert" on public.characters for insert with check (auth.uid() = user_id);
create policy "characters_owner_update" on public.characters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "characters_owner_delete" on public.characters for delete using (auth.uid() = user_id);

create policy "generations_owner_select" on public.generations for select using (auth.uid() = user_id);
create policy "generations_owner_insert" on public.generations for insert with check (auth.uid() = user_id);
create policy "generations_owner_update" on public.generations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generations_owner_delete" on public.generations for delete using (auth.uid() = user_id);

create index if not exists characters_user_id_idx on public.characters(user_id);

create index if not exists generations_created_at_idx
on public.generations(created_at desc);

create index if not exists characters_updated_at_idx
on public.characters(updated_at desc);
create index if not exists generations_user_character_idx on public.generations(user_id, character_id);

-- Private bucket for reference images and generated character images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-assets',
  'character-assets',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "character_assets_insert_own_folder" on storage.objects;
drop policy if exists "character_assets_select_own" on storage.objects;
drop policy if exists "character_assets_delete_own" on storage.objects;

create policy "character_assets_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'character-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "character_assets_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'character-assets'
  and owner_id = (select auth.uid()::text)
);

create policy "character_assets_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'character-assets'
  and owner_id = (select auth.uid()::text)
);


create table if not exists public.voice_profiles (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  provider text not null default 'elevenlabs',
  provider_voice_id text not null,
  name text not null,
  consent_subject text not null,
  consent_granted_at timestamptz not null default now(),
  consent_expires_at timestamptz,
  consent_revoked_at timestamptz,
  consent_scopes text[] not null default array['voice-synthesis', 'voice-cloning'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_voice_id)
);

alter table public.voice_profiles enable row level security;

drop policy if exists "voice_profiles_owner_select" on public.voice_profiles;
drop policy if exists "voice_profiles_owner_insert" on public.voice_profiles;
drop policy if exists "voice_profiles_owner_update" on public.voice_profiles;
drop policy if exists "voice_profiles_owner_delete" on public.voice_profiles;

create policy "voice_profiles_owner_select" on public.voice_profiles
for select to authenticated using (auth.uid() = user_id);
create policy "voice_profiles_owner_insert" on public.voice_profiles
for insert to authenticated with check (auth.uid() = user_id);
create policy "voice_profiles_owner_update" on public.voice_profiles
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "voice_profiles_owner_delete" on public.voice_profiles
for delete to authenticated using (auth.uid() = user_id);

create index if not exists voice_profiles_user_id_idx on public.voice_profiles(user_id);
create index if not exists voice_profiles_character_id_idx on public.voice_profiles(character_id);

-- Multi-turn conversations; the browser never supplies trusted history to the model.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  position bigint generated always as identity,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists conversation_messages_order_idx on public.conversation_messages(conversation_id, position desc);
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

drop policy if exists "conversations_owner" on public.conversations;
create policy "conversations_owner" on public.conversations for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "conversation_messages_owner" on public.conversation_messages;
create policy "conversation_messages_owner" on public.conversation_messages for all to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())
)) with check (user_id = (select auth.uid()) and exists (
  select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid())
));

-- Commit a whole turn atomically. A stale client must not append an answer
-- generated without seeing a newer turn from another tab.
create or replace function public.append_conversation_turn(
  p_conversation_id uuid, p_character_id uuid, p_title text,
  p_user_message text, p_assistant_message text, p_expected_position bigint
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid := p_conversation_id;
  v_last_position bigint;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(p_user_message) not between 1 and 4000 or length(p_assistant_message) not between 1 and 12000 then
    raise exception 'Invalid message length' using errcode = '22023';
  end if;
  if v_conversation_id is null then
    if p_character_id is not null and not exists (
      select 1 from public.characters where id = p_character_id and user_id = v_user_id
    ) then raise exception 'Character not found' using errcode = '22023'; end if;
    insert into public.conversations(user_id, character_id, title)
    values (v_user_id, p_character_id, left(p_title, 100)) returning id into v_conversation_id;
  else
    perform 1 from public.conversations where id = v_conversation_id and user_id = v_user_id for update;
    if not found then raise exception 'Conversation not found' using errcode = '22023'; end if;
    select max(position) into v_last_position from public.conversation_messages
    where conversation_id = v_conversation_id and user_id = v_user_id;
    if v_last_position is distinct from p_expected_position then
      raise exception 'Conversation changed; reload and retry' using errcode = 'P0001';
    end if;
  end if;
  insert into public.conversation_messages(conversation_id, user_id, role, content)
  values (v_conversation_id, v_user_id, 'user', p_user_message),
         (v_conversation_id, v_user_id, 'assistant', p_assistant_message);
  update public.conversations set updated_at = now() where id = v_conversation_id and user_id = v_user_id;
  return v_conversation_id;
end;
$$;
revoke all on function public.append_conversation_turn(uuid,uuid,text,text,text,bigint) from public, anon;
grant execute on function public.append_conversation_turn(uuid,uuid,text,text,text,bigint) to authenticated;
