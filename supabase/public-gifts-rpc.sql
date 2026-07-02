create or replace function public.get_public_gifts()
returns table (
  id uuid,
  name text,
  estimated_value numeric,
  status text,
  category_name text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gifts.id,
    gifts.name,
    gifts.estimated_value,
    gifts.status,
    gift_categories.name as category_name,
    gifts.sort_order
  from public.gifts
  join public.gift_categories on gift_categories.id = gifts.category_id
  where gifts.status in ('available', 'reserved')
  order by gifts.sort_order asc;
$$;

grant execute on function public.get_public_gifts() to anon, authenticated;
