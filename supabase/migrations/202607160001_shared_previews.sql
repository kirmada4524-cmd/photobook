create table if not exists public.shared_previews (
  id text primary key,
  data jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_previews_expiry_idx
  on public.shared_previews (expires_at);

alter table public.shared_previews enable row level security;

-- Shared previews are read and written only by server functions using the service-role key.
-- Expired rows and their ImageKit folder can be removed by a scheduled cleanup job later.
