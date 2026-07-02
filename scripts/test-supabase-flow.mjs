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

const publicClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseAnonKey);

const fail = (message) => {
  throw new Error(message);
};

const { data: loginData, error: loginError } = await adminClient.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

if (loginError || !loginData.user) fail(`Login admin falhou: ${loginError?.message || 'usuario vazio'}`);

const { data: adminId, error: adminCheckError } = await adminClient.rpc('current_admin_id');
if (adminCheckError || !adminId) fail(`Usuario nao esta vinculado como admin: ${adminCheckError?.message || 'sem admin id'}`);

const { data: gifts, error: giftsError } = await publicClient.rpc('get_public_gifts');

const gift = gifts?.find((item) => item.status === 'available');
if (giftsError || !gift) fail(`Nenhum presente disponivel para teste: ${giftsError?.message || 'lista vazia'}`);

let shouldReleaseGift = false;
let testInvite = null;

try {
  const uniqueSuffix = String(Date.now()).slice(-8);
  const createdInvite = await adminClient.rpc('admin_create_invite_link', {
    p_label: `Teste fluxo ${uniqueSuffix}`,
    p_whatsapp: `(85) 7${uniqueSuffix}`,
  });

  if (createdInvite.error || !createdInvite.data?.token) {
    fail(`Criacao do convite de teste falhou: ${createdInvite.error?.message || 'sem token'}`);
  }

  testInvite = createdInvite.data;

  const guestPayload = {
    p_full_name: 'Teste Automatizado Codex',
    p_whatsapp: `(85) 9${uniqueSuffix}`,
    p_people_count: 1,
    p_pool_usage: 'no',
    p_gift_id: gift.id,
    p_gift_method: 'pix',
    p_pix_receipt_url: null,
    p_invite_token: testInvite.token,
  };

  const { data: guest, error: confirmError } = await publicClient.rpc('confirm_guest_with_gift', guestPayload);
  if (confirmError || !guest?.id) fail(`Primeira reserva falhou: ${confirmError?.message || 'sem convidado'}`);
  shouldReleaseGift = true;

  const linkedGuest = await adminClient
    .from('guests')
    .select('id,invite_links(label)')
    .eq('id', guest.id)
    .single();

  if (linkedGuest.error || linkedGuest.data?.invite_links?.label !== testInvite.label) {
    fail(`Confirmacao nao vinculou o convite: ${linkedGuest.error?.message || 'convite ausente'}`);
  }

  const duplicate = await publicClient.rpc('confirm_guest_with_gift', {
    ...guestPayload,
    p_full_name: 'Teste Duplicado Codex',
    p_whatsapp: `(85) 8${uniqueSuffix}`,
  });

  if (!duplicate.error) fail('Reserva duplicada passou, mas deveria falhar.');

  const pixUpdate = await adminClient.rpc('admin_update_pix_status', {
    p_guest_id: guest.id,
    p_pix_status: 'confirmed',
  });

  if (pixUpdate.error) fail(`Atualizacao Pix via admin falhou: ${pixUpdate.error.message}`);

  const release = await adminClient.rpc('admin_release_gift', {
    p_gift_id: gift.id,
  });

  if (release.error) fail(`Liberacao via admin falhou: ${release.error.message}`);
  shouldReleaseGift = false;

  const { data: publicGiftsAfterRelease, error: releasedError } = await publicClient.rpc('get_public_gifts');
  const releasedGift = publicGiftsAfterRelease?.find((item) => item.id === gift.id);

  if (releasedError || releasedGift?.status !== 'available') {
    fail(`Presente nao voltou para disponivel: ${releasedError?.message || releasedGift?.status || 'nao encontrado'}`);
  }
} finally {
  if (shouldReleaseGift) {
    await adminClient.rpc('admin_release_gift', {
      p_gift_id: gift.id,
    });
  }

  if (testInvite?.id) {
    await adminClient.rpc('admin_delete_invite_link', {
      p_invite_id: testInvite.id,
    });
  }
}

const { data: logs, error: logsError } = await adminClient
  .from('audit_logs')
  .select('id, action')
  .in('action', ['pix_status_updated', 'gift_released'])
  .limit(2);

if (logsError || !logs?.length) fail(`Logs administrativos nao encontrados: ${logsError?.message || 'sem logs'}`);

console.log('LOGIN_ADMIN_OK');
console.log('ANTI_DUPLICIDADE_OK');
console.log('CONVITE_VINCULADO_OK');
console.log('RPC_ADMIN_OK');
console.log('AUDIT_LOG_OK');
console.log('LIMPEZA_TESTE_OK');
