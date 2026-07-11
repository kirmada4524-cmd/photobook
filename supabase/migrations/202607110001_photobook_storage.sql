create table if not exists public.photobook_templates (
  id text primary key,
  label text not null,
  category text not null default 'General Mag',
  sort_order bigint not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photobook_templates_category_order_idx
  on public.photobook_templates (category, sort_order);

create table if not exists public.photobook_media (
  file_id text primary key,
  src text not null unique,
  kind text not null,
  name text not null,
  created_at_ms bigint not null
);

create table if not exists public.admin_sticker_folders (
  id text primary key,
  name text not null,
  sort_order bigint not null default 0,
  created_at_ms bigint not null
);

create table if not exists public.admin_stickers (
  id text primary key,
  folder_id text not null references public.admin_sticker_folders(id) on delete cascade,
  name text not null,
  src text not null,
  imagekit_file_id text,
  created_at_ms bigint not null
);

create index if not exists admin_stickers_folder_idx
  on public.admin_stickers (folder_id, created_at_ms);

create table if not exists public.admin_backgrounds (
  id text primary key,
  name text not null,
  src text not null,
  imagekit_file_id text,
  created_at_ms bigint not null
);

alter table public.photobook_templates enable row level security;
alter table public.photobook_media enable row level security;
alter table public.admin_sticker_folders enable row level security;
alter table public.admin_stickers enable row level security;
alter table public.admin_backgrounds enable row level security;

-- The app accesses these tables only through server functions using the service-role key.
-- No anon policies are intentionally created, so browser clients cannot modify admin data.
