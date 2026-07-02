create extension if not exists "pgcrypto";

create table if not exists public.event_settings (
  id uuid primary key default gen_random_uuid(),
  baby_name text not null default 'Liara',
  event_title text not null default 'Cha de Bebe da Liara',
  host_names text,
  event_date date,
  event_time time,
  address text,
  address_reference text,
  google_maps_url text,
  google_maps_embed_url text,
  pix_key text,
  pix_receiver_name text,
  pix_city text,
  pix_bank text,
  invitation_message text,
  final_message text,
  max_people_per_confirmation integer not null default 10,
  allow_pix_receipt_upload boolean not null default true,
  banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  seed_code text unique,
  category_id uuid not null references public.gift_categories(id),
  name text not null,
  estimated_value numeric(10, 2) not null default 0,
  suggested_brands text,
  status text not null default 'available' check (status in ('available', 'reserved', 'disabled')),
  reserved_by_guest_id uuid,
  reserved_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  people_count integer not null check (people_count between 1 and 10),
  pool_usage text not null check (pool_usage in ('yes', 'no', 'maybe')),
  gift_id uuid not null unique references public.gifts(id),
  gift_method text not null check (gift_method in ('bring_gift', 'pix')),
  pix_status text not null default 'not_required' check (
    pix_status in ('not_required', 'pending_receipt', 'pending_review', 'confirmed', 'rejected')
  ),
  pix_receipt_url text,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gifts
  drop constraint if exists gifts_reserved_by_guest_id_fkey;

alter table public.gifts
  add constraint gifts_reserved_by_guest_id_fkey
  foreign key (reserved_by_guest_id)
  references public.guests(id)
  on delete set null
  deferrable initially deferred;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.confirm_guest_with_gift(
  p_full_name text,
  p_whatsapp text,
  p_people_count integer,
  p_pool_usage text,
  p_gift_id uuid,
  p_gift_method text,
  p_pix_receipt_url text default null
)
returns public.guests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift public.gifts;
  v_guest public.guests;
  v_pix_status text;
begin
  if p_people_count < 1 or p_people_count > 10 then
    raise exception 'Quantidade de pessoas invalida.';
  end if;

  select *
    into v_gift
    from public.gifts
   where id = p_gift_id
   for update;

  if not found or v_gift.status <> 'available' then
    raise exception 'Esse presente acabou de ser escolhido por outro convidado. Por favor, escolha outro presente disponivel para a Liara.';
  end if;

  v_pix_status := case
    when p_gift_method = 'pix' and p_pix_receipt_url is not null then 'pending_review'
    when p_gift_method = 'pix' then 'pending_receipt'
    else 'not_required'
  end;

  insert into public.guests (
    full_name,
    whatsapp,
    people_count,
    pool_usage,
    gift_id,
    gift_method,
    pix_status,
    pix_receipt_url
  )
  values (
    trim(p_full_name),
    p_whatsapp,
    p_people_count,
    p_pool_usage,
    p_gift_id,
    p_gift_method,
    v_pix_status,
    p_pix_receipt_url
  )
  returning * into v_guest;

  update public.gifts
     set status = 'reserved',
         reserved_by_guest_id = v_guest.id,
         reserved_at = now(),
         updated_at = now()
   where id = p_gift_id;

  return v_guest;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.admins
     where user_id = auth.uid()
  );
$$;

alter table public.event_settings enable row level security;
alter table public.gift_categories enable row level security;
alter table public.gifts enable row level security;
alter table public.guests enable row level security;
alter table public.admins enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Public can read event settings" on public.event_settings;
create policy "Public can read event settings"
on public.event_settings for select
using (true);

drop policy if exists "Public can read categories" on public.gift_categories;
create policy "Public can read categories"
on public.gift_categories for select
using (true);

drop policy if exists "Public can read active gifts" on public.gifts;
create policy "Public can read active gifts"
on public.gifts for select
using (status in ('available', 'reserved'));

drop policy if exists "Admins manage event settings" on public.event_settings;
create policy "Admins manage event settings"
on public.event_settings for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage categories" on public.gift_categories;
create policy "Admins manage categories"
on public.gift_categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage gifts" on public.gifts;
create policy "Admins manage gifts"
on public.gifts for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read guests" on public.guests;
create policy "Admins read guests"
on public.guests for select
using (public.is_admin());

drop policy if exists "Admins manage guests" on public.guests;
create policy "Admins manage guests"
on public.guests for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read admins" on public.admins;
create policy "Admins read admins"
on public.admins for select
using (public.is_admin());

drop policy if exists "Admins read audit logs" on public.audit_logs;
create policy "Admins read audit logs"
on public.audit_logs for select
using (public.is_admin());

grant execute on function public.confirm_guest_with_gift(text, text, integer, text, uuid, text, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('pix-receipts', 'pix-receipts', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can upload pix receipts" on storage.objects;
create policy "Public can upload pix receipts"
on storage.objects for insert
with check (bucket_id = 'pix-receipts');

drop policy if exists "Public can read pix receipts" on storage.objects;
create policy "Public can read pix receipts"
on storage.objects for select
using (bucket_id = 'pix-receipts');

drop policy if exists "Admins can delete pix receipts" on storage.objects;
create policy "Admins can delete pix receipts"
on storage.objects for delete
using (bucket_id = 'pix-receipts' and public.is_admin());
