create unique index if not exists guests_whatsapp_digits_unique
on public.guests (public.only_digits(whatsapp));

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
  v_whatsapp_digits text;
begin
  v_whatsapp_digits := public.only_digits(p_whatsapp);

  if length(trim(coalesce(p_full_name, ''))) < 6 or array_length(regexp_split_to_array(trim(p_full_name), '\s+'), 1) < 2 then
    raise exception 'Digite seu nome completo.';
  end if;

  if length(v_whatsapp_digits) < 10 or length(v_whatsapp_digits) > 13 then
    raise exception 'Digite um WhatsApp valido.';
  end if;

  if exists (select 1 from public.guests where public.only_digits(whatsapp) = v_whatsapp_digits) then
    raise exception 'Este WhatsApp ja confirmou presenca. Fale com a familia se precisar alterar sua confirmacao.';
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
    v_whatsapp_digits,
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
declare
  v_whatsapp_digits text;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessario.';
  end if;

  v_whatsapp_digits := public.only_digits(p_whatsapp);

  if length(trim(p_full_name)) < 3 then
    raise exception 'Nome invalido.';
  end if;

  if length(v_whatsapp_digits) < 10 or length(v_whatsapp_digits) > 13 then
    raise exception 'WhatsApp invalido.';
  end if;

  if exists (
    select 1
      from public.guests
     where id <> p_guest_id
       and public.only_digits(whatsapp) = v_whatsapp_digits
  ) then
    raise exception 'Ja existe outro convidado com este WhatsApp.';
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
         whatsapp = v_whatsapp_digits,
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

grant execute on function public.confirm_guest_with_gift(text, text, integer, text, uuid, text, text) to anon, authenticated;
grant execute on function public.admin_update_guest(uuid, text, text, integer, text, text, text) to authenticated;
