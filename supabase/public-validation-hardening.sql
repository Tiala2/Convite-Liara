create or replace function public.only_digits(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
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
  v_whatsapp_digits text;
begin
  v_whatsapp_digits := public.only_digits(p_whatsapp);

  if length(trim(coalesce(p_full_name, ''))) < 6 or array_length(regexp_split_to_array(trim(p_full_name), '\s+'), 1) < 2 then
    raise exception 'Digite seu nome completo.';
  end if;

  if length(v_whatsapp_digits) < 10 or length(v_whatsapp_digits) > 13 then
    raise exception 'Digite um WhatsApp valido.';
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

grant execute on function public.only_digits(text) to anon, authenticated;
grant execute on function public.confirm_guest_with_gift(text, text, integer, text, uuid, text, text) to anon, authenticated;
