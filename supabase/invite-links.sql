create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  label text not null,
  whatsapp text,
  created_by_admin_id uuid references public.admins(id),
  open_count integer not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_links enable row level security;

drop policy if exists "Admins read invite links" on public.invite_links;
create policy "Admins read invite links"
on public.invite_links for select
using (public.is_admin());

create or replace function public.admin_create_invite_link(
  p_label text,
  p_whatsapp text default null
)
returns public.invite_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_invite public.invite_links;
begin
  v_admin_id := public.current_admin_id();

  if v_admin_id is null then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if length(trim(p_label)) < 2 then
    raise exception 'Informe uma identificacao para o convite.';
  end if;

  insert into public.invite_links (label, whatsapp, created_by_admin_id)
  values (trim(p_label), nullif(trim(coalesce(p_whatsapp, '')), ''), v_admin_id)
  returning * into v_invite;

  perform public.write_audit_log(
    'invite_link_created',
    'invite_link',
    v_invite.id,
    jsonb_build_object('label', v_invite.label)
  );

  return v_invite;
end;
$$;

create or replace function public.mark_invite_link_opened(
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invite_links
     set open_count = open_count + 1,
         first_opened_at = coalesce(first_opened_at, now()),
         last_opened_at = now()
   where token = lower(trim(p_token));
end;
$$;

create or replace function public.admin_delete_invite_link(
  p_invite_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  select label
    into v_label
    from public.invite_links
   where id = p_invite_id;

  if v_label is null then
    raise exception 'Convite nao encontrado.';
  end if;

  delete from public.invite_links
   where id = p_invite_id;

  perform public.write_audit_log(
    'invite_link_deleted',
    'invite_link',
    p_invite_id,
    jsonb_build_object('label', v_label)
  );
end;
$$;

grant execute on function public.admin_create_invite_link(text, text) to authenticated;
grant execute on function public.admin_delete_invite_link(uuid) to authenticated;
grant execute on function public.mark_invite_link_opened(text) to anon, authenticated;
