create or replace function public.admin_update_event_settings(
  p_baby_name text,
  p_event_title text,
  p_event_date date,
  p_event_time time,
  p_address text,
  p_address_reference text,
  p_google_maps_url text,
  p_google_maps_embed_url text,
  p_pix_key text,
  p_pix_receiver_name text,
  p_pix_city text,
  p_pix_bank text,
  p_invitation_message text,
  p_final_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if length(trim(p_baby_name)) < 2 then
    raise exception 'Nome da bebe invalido.';
  end if;

  if p_event_date is null or p_event_time is null then
    raise exception 'Data e horario do evento sao obrigatorios.';
  end if;

  select id
    into v_event_id
    from public.event_settings
   limit 1;

  if v_event_id is null then
    insert into public.event_settings (
      baby_name,
      event_title,
      event_date,
      event_time,
      address,
      address_reference,
      google_maps_url,
      google_maps_embed_url,
      pix_key,
      pix_receiver_name,
      pix_city,
      pix_bank,
      invitation_message,
      final_message
    )
    values (
      trim(p_baby_name),
      trim(p_event_title),
      p_event_date,
      p_event_time,
      p_address,
      p_address_reference,
      p_google_maps_url,
      p_google_maps_embed_url,
      p_pix_key,
      p_pix_receiver_name,
      p_pix_city,
      p_pix_bank,
      p_invitation_message,
      p_final_message
    )
    returning id into v_event_id;
  else
    update public.event_settings
       set baby_name = trim(p_baby_name),
           event_title = trim(p_event_title),
           event_date = p_event_date,
           event_time = p_event_time,
           address = p_address,
           address_reference = p_address_reference,
           google_maps_url = p_google_maps_url,
           google_maps_embed_url = p_google_maps_embed_url,
           pix_key = p_pix_key,
           pix_receiver_name = p_pix_receiver_name,
           pix_city = p_pix_city,
           pix_bank = p_pix_bank,
           invitation_message = p_invitation_message,
           final_message = p_final_message,
           updated_at = now()
     where id = v_event_id;
  end if;

  perform public.write_audit_log(
    'event_settings_updated',
    'event_settings',
    v_event_id,
    jsonb_build_object('event_date', p_event_date, 'event_time', p_event_time)
  );
end;
$$;

create or replace function public.admin_create_gift(
  p_category text,
  p_name text,
  p_estimated_value numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_gift_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if p_category not in ('P', 'M', 'G') then
    raise exception 'Categoria invalida.';
  end if;

  if length(trim(p_name)) < 3 then
    raise exception 'Nome do presente invalido.';
  end if;

  if p_estimated_value <= 0 then
    raise exception 'Valor do presente invalido.';
  end if;

  select id
    into v_category_id
    from public.gift_categories
   where name = 'Fralda ' || p_category;

  if v_category_id is null then
    raise exception 'Categoria nao encontrada.';
  end if;

  insert into public.gifts (category_id, name, estimated_value, status, sort_order)
  values (
    v_category_id,
    trim(p_name),
    p_estimated_value,
    'available',
    coalesce((select max(sort_order) + 1 from public.gifts), 9999)
  )
  returning id into v_gift_id;

  perform public.write_audit_log(
    'gift_created',
    'gift',
    v_gift_id,
    jsonb_build_object('category', p_category, 'name', trim(p_name), 'estimated_value', p_estimated_value)
  );

  return v_gift_id;
end;
$$;

create or replace function public.admin_update_gift(
  p_gift_id uuid,
  p_category text,
  p_name text,
  p_estimated_value numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  if p_category not in ('P', 'M', 'G') then
    raise exception 'Categoria invalida.';
  end if;

  if length(trim(p_name)) < 3 then
    raise exception 'Nome do presente invalido.';
  end if;

  if p_estimated_value <= 0 then
    raise exception 'Valor do presente invalido.';
  end if;

  select id
    into v_category_id
    from public.gift_categories
   where name = 'Fralda ' || p_category;

  if v_category_id is null then
    raise exception 'Categoria nao encontrada.';
  end if;

  update public.gifts
     set category_id = v_category_id,
         name = trim(p_name),
         estimated_value = p_estimated_value,
         updated_at = now()
   where id = p_gift_id;

  if not found then
    raise exception 'Presente nao encontrado.';
  end if;

  perform public.write_audit_log(
    'gift_updated',
    'gift',
    p_gift_id,
    jsonb_build_object('category', p_category, 'name', trim(p_name), 'estimated_value', p_estimated_value)
  );
end;
$$;

grant execute on function public.admin_update_event_settings(text, text, date, time, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_create_gift(text, text, numeric) to authenticated;
grant execute on function public.admin_update_gift(uuid, text, text, numeric) to authenticated;
