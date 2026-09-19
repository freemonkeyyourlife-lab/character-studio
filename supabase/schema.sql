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

create policy "characters_owner_select" on public.characters for select using (auth.uid() = user_id);
create policy "characters_owner_insert" on public.characters for insert with check (auth.uid() = user_id);
create policy "characters_owner_update" on public.characters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "characters_owner_delete" on public.characters for delete using (auth.uid() = user_id);

create policy "generations_owner_select" on public.generations for select using (auth.uid() = user_id);
create policy "generations_owner_insert" on public.generations for insert with check (auth.uid() = user_id);
create policy "generations_owner_delete" on public.generations for delete using (auth.uid() = user_id);

create index if not exists characters_user_id_idx on public.characters(user_id);
create index if not exists generations_user_character_idx on public.generations(user_id, character_id);
