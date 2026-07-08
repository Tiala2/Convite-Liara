import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
  console.error('Defina SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL e ADMIN_PASSWORD.');
  process.exit(1);
}

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const checks = [];

const addCheck = (name, ok, details = '') => {
  checks.push({ name, ok, details });
};

const publicGifts = await publicSupabase.rpc('get_public_gifts');
addCheck(
  'RPC publica de presentes responde',
  !publicGifts.error && (publicGifts.data?.length || 0) >= 1,
  publicGifts.error?.message || `count=${publicGifts.data?.length || 0}`,
);

const publicGiftsTable = await publicSupabase.from('gifts').select('id,reserved_by_guest_id').limit(1);
addCheck(
  'Anonimo nao le tabela de presentes diretamente',
  !publicGiftsTable.error && (publicGiftsTable.data?.length || 0) === 0,
  publicGiftsTable.error?.message || `rows=${publicGiftsTable.data?.length || 0}`,
);

const publicGuests = await publicSupabase.from('guests').select('id').limit(1);
addCheck(
  'Anonimo nao le convidados diretamente',
  !publicGuests.error && (publicGuests.data?.length || 0) === 0,
  publicGuests.error?.message || `rows=${publicGuests.data?.length || 0}`,
);

const publicAuditLogs = await publicSupabase.from('audit_logs').select('id').limit(1);
addCheck(
  'Anonimo nao le logs administrativos',
  !publicAuditLogs.error && (publicAuditLogs.data?.length || 0) === 0,
  publicAuditLogs.error?.message || `rows=${publicAuditLogs.data?.length || 0}`,
);

const publicInviteLinks = await publicSupabase.from('invite_links').select('id').limit(1);
addCheck(
  'Anonimo nao le convites individuais',
  !publicInviteLinks.error && (publicInviteLinks.data?.length || 0) === 0,
  publicInviteLinks.error?.message || `rows=${publicInviteLinks.data?.length || 0}`,
);

const publicInviteOpen = await publicSupabase.rpc('mark_invite_link_opened', {
  p_token: 'codigo-inexistente',
});
addCheck('RPC publica de abertura de convite responde', !publicInviteOpen.error, publicInviteOpen.error?.message);

const publicAdminRpc = await publicSupabase.rpc('admin_clear_confirmations');
addCheck(
  'Anonimo nao executa RPC administrativa',
  Boolean(publicAdminRpc.error) && publicAdminRpc.error.message.includes('Acesso administrativo necessario'),
  publicAdminRpc.error?.message,
);

const login = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

addCheck('Login admin', !login.error && Boolean(login.data.user), login.error?.message);

const admin = await supabase.rpc('current_admin_id');
addCheck('Usuario vinculado como admin', !admin.error && Boolean(admin.data), admin.error?.message);

const event = await supabase.from('event_settings').select('baby_name,event_date,event_time,address,pix_key').limit(1).single();
addCheck('Evento configurado', !event.error && event.data?.baby_name === 'Liara', event.error?.message);
addCheck('Data final correta', event.data?.event_date === '2026-08-02' && event.data?.event_time?.startsWith('14:00'), JSON.stringify(event.data));
addCheck('Pix real configurado', event.data?.pix_key === '075.650.053-20', event.data?.pix_key);

const gifts = await supabase.from('gifts').select('id,status', { count: 'exact' }).limit(1);
addCheck('Presentes existem', !gifts.error && (gifts.count || 0) >= 115, gifts.error?.message || `count=${gifts.count}`);

const guests = await supabase.from('guests').select('id', { count: 'exact' }).limit(1);
addCheck('Tabela convidados acessivel ao admin', !guests.error, guests.error?.message || `count=${guests.count}`);

const logs = await supabase.from('audit_logs').select('id', { count: 'exact' }).limit(1);
addCheck('Logs administrativos acessiveis', !logs.error, logs.error?.message || `count=${logs.count}`);

const inviteLinks = await supabase.from('invite_links').select('id', { count: 'exact' }).limit(1);
addCheck('Convites individuais acessiveis ao admin', !inviteLinks.error, inviteLinks.error?.message || `count=${inviteLinks.count}`);

let testInvite = null;
try {
  const createdInvite = await supabase.rpc('admin_create_invite_link', {
    p_label: `Teste Codex ${Date.now()}`,
    p_whatsapp: '(85) 99999-0000',
  });
  testInvite = createdInvite.data;

  addCheck('Admin cria convite individual', !createdInvite.error && Boolean(testInvite?.id), createdInvite.error?.message);

  if (testInvite?.token) {
    const openedInvite = await publicSupabase.rpc('mark_invite_link_opened', {
      p_token: testInvite.token,
    });
    addCheck('Visitante registra abertura do convite', !openedInvite.error, openedInvite.error?.message);

    const updatedInvite = await supabase.from('invite_links').select('open_count').eq('id', testInvite.id).single();
    addCheck(
      'Admin ve abertura do convite',
      !updatedInvite.error && updatedInvite.data?.open_count === 1,
      updatedInvite.error?.message || `open_count=${updatedInvite.data?.open_count}`,
    );
  }
} finally {
  if (testInvite?.id) {
    const deletedInvite = await supabase.rpc('admin_delete_invite_link', {
      p_invite_id: testInvite.id,
    });
    addCheck('Admin remove convite de teste', !deletedInvite.error, deletedInvite.error?.message);
  }
}

const antiDuplicateRpc = await supabase.rpc('confirm_guest_with_gift', {
  p_full_name: '',
  p_whatsapp: '',
  p_people_count: 0,
  p_pool_usage: 'no',
  p_gift_id: '00000000-0000-0000-0000-000000000000',
  p_gift_method: 'pix',
  p_pix_receipt_url: null,
});
addCheck('RPC publica anti-duplicidade responde', Boolean(antiDuplicateRpc.error), antiDuplicateRpc.error?.message);

const adminRpc = await supabase.rpc('current_admin_id');
addCheck('RPC administrativa responde', !adminRpc.error && Boolean(adminRpc.data), adminRpc.error?.message);

const invalidConfirmation = await supabase.rpc('confirm_guest_with_gift', {
  p_full_name: 'Ana',
  p_whatsapp: '123',
  p_people_count: 1,
  p_pool_usage: 'no',
  p_gift_id: '00000000-0000-0000-0000-000000000000',
  p_gift_method: 'pix',
  p_pix_receipt_url: null,
});
addCheck(
  'Banco rejeita convidado invalido',
  Boolean(invalidConfirmation.error) && invalidConfirmation.error.message.includes('Digite seu nome completo'),
  invalidConfirmation.error?.message,
);

const existingGuest = await supabase.from('guests').select('whatsapp').limit(1).maybeSingle();
const availableGift = await supabase.from('gifts').select('id').eq('status', 'available').limit(1).maybeSingle();

if (existingGuest.data?.whatsapp && availableGift.data?.id) {
  const duplicateWhatsapp = await supabase.rpc('confirm_guest_with_gift', {
    p_full_name: 'Teste WhatsApp Duplicado',
    p_whatsapp: existingGuest.data.whatsapp,
    p_people_count: 1,
    p_pool_usage: 'no',
    p_gift_id: availableGift.data.id,
    p_gift_method: 'pix',
    p_pix_receipt_url: null,
  });

  addCheck(
    'Banco rejeita WhatsApp duplicado',
    Boolean(duplicateWhatsapp.error) && duplicateWhatsapp.error.message.includes('ja confirmou presenca'),
    duplicateWhatsapp.error?.message,
  );
} else {
  addCheck('Banco rejeita WhatsApp duplicado', true, 'Sem convidado existente para testar agora.');
}

console.log('\nChecklist Supabase real - Cha da Liara\n');
for (const check of checks) {
  console.log(`${check.ok ? 'OK ' : 'FALHA'} ${check.name}`);
  if (!check.ok && check.details) console.log(`      ${check.details}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.log(`\n${failed.length} item(ns) falharam no Supabase real.\n`);
  process.exit(1);
}

console.log('\nSupabase real pronto.\n');
