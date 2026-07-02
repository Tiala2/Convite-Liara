create or replace function public.admin_log_backup_export(
  p_guests_count integer,
  p_gifts_count integer,
  p_audit_logs_count integer
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

  perform public.write_audit_log(
    'backup_exported',
    'system',
    null,
    jsonb_build_object(
      'guests_count', p_guests_count,
      'gifts_count', p_gifts_count,
      'audit_logs_count', p_audit_logs_count
    )
  );
end;
$$;

grant execute on function public.admin_log_backup_export(integer, integer, integer) to authenticated;
