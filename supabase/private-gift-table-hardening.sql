drop policy if exists "Public can read active gifts" on public.gifts;
drop policy if exists "Public can read categories" on public.gift_categories;

grant execute on function public.get_public_gifts() to anon, authenticated;
