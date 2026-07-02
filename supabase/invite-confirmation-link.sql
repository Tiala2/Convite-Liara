alter table public.guests
  add column if not exists invite_link_id uuid references public.invite_links(id) on delete set null;

drop function if exists public.confirm_guest_with_gift(text, text, integer, text, uuid, text, text);

create or replace function public.confirm_guest_with_gift(
  p_full_name text,
  p_whatsapp text,
  p_people_count integer,
  p_pool_usage text,
  p_gift_id uuid,
  p_gift_method text,
  p_pix_receipt_url text default null,
  p_invite_token text default null
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
  v_invite_id uuid;
begin
  if length(trim(p_full_name)) < 3 or position(' ' in trim(p_full_name)) = 0 then
    raise exception 'Digite seu nome completo.';
  end if;

  v_whatsapp_digits := public.only_digits(p_whatsapp);

  if length(v_whatsapp_digits) < 10 or length(v_whatsapp_digits) > 13 then
    raise exception 'Digite um WhatsApp valido.';
  end if;

  if exists (
    select 1
      from public.guests
     where public.only_digits(whatsapp) = v_whatsapp_digits
  ) then
    raise exception 'Este WhatsApp ja confirmou presenca. Se precisar alterar algo, fale com a Tiala.';
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

  if p_invite_token is not null and trim(p_invite_token) <> '' then
    select id
      into v_invite_id
      from public.invite_links
     where token = lower(trim(p_invite_token));
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
    pix_receipt_url,
    invite_link_id
  )
  values (
    trim(p_full_name),
    p_whatsapp,
    p_people_count,
    p_pool_usage,
    p_gift_id,
    p_gift_method,
    v_pix_status,
    p_pix_receipt_url,
    v_invite_id
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

grant execute on function public.confirm_guest_with_gift(text, text, integer, text, uuid, text, text, text) to anon, authenticated;
