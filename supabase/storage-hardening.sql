update storage.buckets
   set public = false
 where id = 'pix-receipts';

drop policy if exists "Public can read pix receipts" on storage.objects;
drop policy if exists "Admins can read pix receipts" on storage.objects;

create policy "Admins can read pix receipts"
on storage.objects for select
using (bucket_id = 'pix-receipts' and public.is_admin());

drop policy if exists "Public can upload pix receipts" on storage.objects;
create policy "Public can upload pix receipts"
on storage.objects for insert
with check (bucket_id = 'pix-receipts');

drop policy if exists "Admins can delete pix receipts" on storage.objects;
create policy "Admins can delete pix receipts"
on storage.objects for delete
using (bucket_id = 'pix-receipts' and public.is_admin());
