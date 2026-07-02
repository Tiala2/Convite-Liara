create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
    from public.admins
   where user_id = auth.uid()
   limit 1;
$$;

create unique index if not exists admins_user_id_unique
on public.admins(user_id);

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := public.current_admin_id();

  if v_admin_id is null then
    raise exception 'Acesso administrativo necessario.';
  end if;

  insert into public.audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (v_admin_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.admin_update_pix_status(
  p_guest_id uuid,
  p_pix_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if p_pix_status not in ('not_required', 'pending_receipt', 'pending_review', 'confirmed', 'rejected') then
    raise exception 'Status Pix invalido.';
  end if;

  update public.guests
     set pix_status = p_pix_status,
         updated_at = now()
   where id = p_guest_id;

  if not found then
    raise exception 'Convidado nao encontrado.';
  end if;

  perform public.write_audit_log(
    'pix_status_updated',
    'guest',
    p_guest_id,
    jsonb_build_object('pix_status', p_pix_status)
  );
end;
$$;

create or replace function public.admin_release_gift(
  p_gift_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  select id
    into v_guest_id
    from public.guests
   where gift_id = p_gift_id
   limit 1;

  delete from public.guests
   where gift_id = p_gift_id;

  update public.gifts
     set status = 'available',
         reserved_by_guest_id = null,
         reserved_at = null,
         updated_at = now()
   where id = p_gift_id;

  if not found then
    raise exception 'Presente nao encontrado.';
  end if;

  perform public.write_audit_log(
    'gift_released',
    'gift',
    p_gift_id,
    jsonb_build_object('removed_guest_id', v_guest_id)
  );
end;
$$;

create or replace function public.admin_cancel_guest(
  p_guest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  select gift_id
    into v_gift_id
    from public.guests
   where id = p_guest_id;

  if v_gift_id is null then
    raise exception 'Convidado nao encontrado.';
  end if;

  delete from public.guests
   where id = p_guest_id;

  update public.gifts
     set status = 'available',
         reserved_by_guest_id = null,
         reserved_at = null,
         updated_at = now()
   where id = v_gift_id;

  perform public.write_audit_log(
    'guest_cancelled',
    'guest',
    p_guest_id,
    jsonb_build_object('released_gift_id', v_gift_id)
  );
end;
$$;

create or replace function public.admin_update_guest(
  p_guest_id uuid,
  p_full_name text,
  p_whatsapp text,
  p_people_count integer,
  p_pool_usage text,
  p_gift_method text,
  p_pix_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if length(trim(p_full_name)) < 3 then
    raise exception 'Nome invalido.';
  end if;

  if p_people_count < 1 or p_people_count > 10 then
    raise exception 'Quantidade de pessoas invalida.';
  end if;

  if p_pool_usage not in ('yes', 'no', 'maybe') then
    raise exception 'Uso da piscina invalido.';
  end if;

  if p_gift_method not in ('bring_gift', 'pix') then
    raise exception 'Forma de presentear invalida.';
  end if;

  if p_pix_status not in ('not_required', 'pending_receipt', 'pending_review', 'confirmed', 'rejected') then
    raise exception 'Status Pix invalido.';
  end if;

  update public.guests
     set full_name = trim(p_full_name),
         whatsapp = p_whatsapp,
         people_count = p_people_count,
         pool_usage = p_pool_usage,
         gift_method = p_gift_method,
         pix_status = case when p_gift_method = 'pix' then p_pix_status else 'not_required' end,
         updated_at = now()
   where id = p_guest_id;

  if not found then
    raise exception 'Convidado nao encontrado.';
  end if;

  perform public.write_audit_log(
    'guest_updated',
    'guest',
    p_guest_id,
    jsonb_build_object('full_name', trim(p_full_name), 'pix_status', p_pix_status)
  );
end;
$$;

create or replace function public.admin_set_gift_disabled(
  p_gift_id uuid,
  p_is_disabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  update public.gifts
     set status = case when p_is_disabled then 'disabled' else 'available' end,
         updated_at = now()
   where id = p_gift_id
     and status <> 'reserved';

  if not found then
    raise exception 'Presente nao encontrado ou reservado.';
  end if;

  perform public.write_audit_log(
    case when p_is_disabled then 'gift_disabled' else 'gift_enabled' end,
    'gift',
    p_gift_id,
    jsonb_build_object('is_disabled', p_is_disabled)
  );
end;
$$;

create or replace function public.admin_clear_confirmations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  delete from public.guests;

  update public.gifts
     set status = case when status = 'disabled' then 'disabled' else 'available' end,
         reserved_by_guest_id = null,
         reserved_at = null,
         updated_at = now();

  perform public.write_audit_log('confirmations_cleared', 'system', null, '{}'::jsonb);
end;
$$;

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
  if length(trim(p_full_name)) < 3 then
    raise exception 'Digite seu nome completo.';
  end if;

  if p_people_count < 1 or p_people_count > 10 then
    raise exception 'Quantidade de pessoas invalida.';
  end if;

  if p_pool_usage not in ('yes', 'no', 'maybe') then
    raise exception 'Uso da piscina invalido.';
  end if;

  if p_gift_method not in ('bring_gift', 'pix') then
    raise exception 'Forma de presentear invalida.';
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

grant execute on function public.current_admin_id() to authenticated;
grant execute on function public.admin_update_pix_status(uuid, text) to authenticated;
grant execute on function public.admin_release_gift(uuid) to authenticated;
grant execute on function public.admin_cancel_guest(uuid) to authenticated;
grant execute on function public.admin_update_guest(uuid, text, text, integer, text, text, text) to authenticated;
grant execute on function public.admin_set_gift_disabled(uuid, boolean) to authenticated;
grant execute on function public.admin_clear_confirmations() to authenticated;
