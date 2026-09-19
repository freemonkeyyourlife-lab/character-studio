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
drop policy if exists "generations_owner_delete" on public.generations;

create policy "characters_owner_select" on public.characters for select using (auth.uid() = user_id);
create policy "characters_owner_insert" on public.characters for insert with check (auth.uid() = user_id);
create policy "characters_owner_update" on public.characters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "characters_owner_delete" on public.characters for delete using (auth.uid() = user_id);

create policy "generations_owner_select" on public.generations for select using (auth.uid() = user_id);
create policy "generations_owner_insert" on public.generations for insert with check (auth.uid() = user_id);
create policy "generations_owner_delete" on public.generations for delete using (auth.uid() = user_id);

create index if not exists characters_user_id_idx on public.characters(user_id);
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
