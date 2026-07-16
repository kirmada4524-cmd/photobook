alter table public.photobook_templates
  add column if not exists like_count bigint not null default 0;

create table if not exists public.photobook_template_likes (
  template_id text not null references public.photobook_templates(id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  primary key (template_id, voter_key)
);

create index if not exists photobook_template_likes_voter_idx
  on public.photobook_template_likes (voter_key);

alter table public.photobook_template_likes enable row level security;

create or replace function public.toggle_photobook_template_like(
  p_template_id text,
  p_voter_key text
)
returns table (liked boolean, like_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
  v_rows integer;
begin
  if not exists (
    select 1 from public.photobook_templates where id = p_template_id
  ) then
    raise exception 'Template not found';
  end if;

  delete from public.photobook_template_likes
  where template_id = p_template_id and voter_key = p_voter_key;

  if found then
    v_liked := false;
  else
    insert into public.photobook_template_likes (template_id, voter_key)
    values (p_template_id, p_voter_key)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    v_liked := v_rows > 0;
  end if;

  update public.photobook_templates as template
  set like_count = (
    select count(*)
    from public.photobook_template_likes as template_like
    where template_like.template_id = p_template_id
  )
  where template.id = p_template_id;

  return query
  select v_liked, template.like_count
  from public.photobook_templates as template
  where template.id = p_template_id;
end;
$$;

revoke all on function public.toggle_photobook_template_like(text, text) from public;
revoke all on function public.toggle_photobook_template_like(text, text) from anon;
revoke all on function public.toggle_photobook_template_like(text, text) from authenticated;
grant execute on function public.toggle_photobook_template_like(text, text) to service_role;
