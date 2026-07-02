import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const checks = [];

const addCheck = (name, ok, help) => {
  checks.push({ name, ok, help });
};

const readIfExists = (file) => {
  const path = resolve(root, file);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

const env = readIfExists('.env');
const envExample = readIfExists('.env.example');
const schema = readIfExists('supabase/schema.sql');
const seed = readIfExists('supabase/seed-gifts.sql');
const adminHardening = readIfExists('supabase/admin-hardening.sql');
const storageHardening = readIfExists('supabase/storage-hardening.sql');
const adminContentRpcs = readIfExists('supabase/admin-content-rpcs.sql');
const publicValidation = readIfExists('supabase/public-validation-hardening.sql');
const duplicateWhatsapp = readIfExists('supabase/duplicate-whatsapp-hardening.sql');
const backupLog = readIfExists('supabase/admin-backup-log.sql');
const publicGiftsRpc = readIfExists('supabase/public-gifts-rpc.sql');
const privateGiftTableHardening = readIfExists('supabase/private-gift-table-hardening.sql');
const inviteLinks = readIfExists('supabase/invite-links.sql');
const inviteConfirmationLink = readIfExists('supabase/invite-confirmation-link.sql');
const gifts = readIfExists('src/data/gifts.ts');
const repository = readIfExists('src/lib/repository.ts');
const adminPanel = readIfExists('src/pages/AdminPanel.tsx');
const app = readIfExists('src/App.tsx');
const vercelConfig = readIfExists('vercel.json');
const indexHtml = readIfExists('index.html');

addCheck('.env existe', Boolean(env), 'Copie .env.example para .env e preencha as chaves reais.');
addCheck(
  'VITE_SUPABASE_URL preenchida',
  /VITE_SUPABASE_URL=https:\/\/.+\.supabase\.co/.test(env),
  'Preencha VITE_SUPABASE_URL com a URL real do projeto Supabase.'
);
addCheck(
  'VITE_SUPABASE_ANON_KEY preenchida',
  /VITE_SUPABASE_ANON_KEY=(eyJ|sb_publishable_)/.test(env),
  'Preencha VITE_SUPABASE_ANON_KEY com a anon public ou publishable key real do Supabase.'
);
addCheck(
  '.env.example documenta Supabase',
  envExample.includes('VITE_SUPABASE_URL') && envExample.includes('VITE_SUPABASE_ANON_KEY'),
  'Mantenha .env.example atualizado.'
);
addCheck(
  'RPC anti-duplicidade existe',
  schema.includes('confirm_guest_with_gift') && schema.includes('for update'),
  'Aplique supabase/schema.sql no SQL Editor do Supabase.'
);
addCheck(
  'Storage Pix configurado no schema',
  schema.includes('pix-receipts') && schema.includes('storage.buckets'),
  'Aplique as policies de storage para comprovantes Pix.'
);
addCheck(
  'RPCs administrativas existem',
  adminHardening.includes('admin_update_pix_status') &&
    adminHardening.includes('admin_release_gift') &&
    adminHardening.includes('admin_cancel_guest') &&
    adminHardening.includes('write_audit_log'),
  'Execute supabase/admin-hardening.sql no Supabase.'
);
addCheck(
  'Comprovantes Pix privados',
  storageHardening.includes('set public = false') && storageHardening.includes('Admins can read pix receipts'),
  'Execute supabase/storage-hardening.sql no Supabase.'
);
addCheck(
  'RPCs de conteudo administrativo existem',
  adminContentRpcs.includes('admin_update_event_settings') &&
    adminContentRpcs.includes('admin_create_gift') &&
    adminContentRpcs.includes('admin_update_gift'),
  'Execute supabase/admin-content-rpcs.sql no Supabase.'
);
addCheck(
  'Supabase sem fallback silencioso',
  !repository.includes('using localStorage fallback') && !repository.includes('return localStorageRepo.getGifts();\n  }') && !repository.includes('return localStorageRepo.getGuests();\n  }'),
  'Quando Supabase estiver configurado, falhas devem aparecer em vez de cair para dados locais.'
);
addCheck(
  'Validacao publica no banco existe',
  publicValidation.includes('only_digits') &&
    publicValidation.includes('Digite um WhatsApp valido') &&
    publicValidation.includes('Digite seu nome completo'),
  'Execute supabase/public-validation-hardening.sql no Supabase.'
);
addCheck(
  'WhatsApp duplicado bloqueado no banco',
  duplicateWhatsapp.includes('guests_whatsapp_digits_unique') &&
    duplicateWhatsapp.includes('Este WhatsApp ja confirmou presenca'),
  'Execute supabase/duplicate-whatsapp-hardening.sql no Supabase.'
);
addCheck(
  'Log de backup administrativo existe',
  backupLog.includes('admin_log_backup_export') && backupLog.includes('backup_exported'),
  'Execute supabase/admin-backup-log.sql no Supabase.'
);
addCheck(
  'Lista publica de presentes usa RPC segura',
  publicGiftsRpc.includes('get_public_gifts') && publicGiftsRpc.includes("where gifts.status in ('available', 'reserved')"),
  'Execute supabase/public-gifts-rpc.sql no Supabase.'
);
addCheck(
  'Tabelas de presentes sem leitura publica direta',
  privateGiftTableHardening.includes('drop policy if exists "Public can read active gifts"') &&
    privateGiftTableHardening.includes('drop policy if exists "Public can read categories"'),
  'Execute supabase/private-gift-table-hardening.sql no Supabase.'
);
addCheck(
  'Confirmacao publica busca detalhes pela RPC publica',
  repository.includes('const gifts = await getPublicGifts();') && repository.includes("supabase.rpc('get_public_gifts')"),
  'Nao use consulta direta em gifts no fluxo publico depois da reserva.'
);
addCheck(
  'Convites individuais sem nome no link',
    inviteLinks.includes('invite_links') &&
    inviteLinks.includes('mark_invite_link_opened') &&
    inviteLinks.includes('admin_delete_invite_link') &&
    repository.includes('createInviteLink') &&
    repository.includes('exportInviteLinksToExcel') &&
    app.includes('markInviteLinkOpened') &&
    adminPanel.includes('Convites individuais'),
  'Execute supabase/invite-links.sql e mantenha a aba Convites no admin.'
);
addCheck(
  'Confirmacoes ficam vinculadas ao convite usado',
  inviteConfirmationLink.includes('invite_link_id') &&
    inviteConfirmationLink.includes('p_invite_token') &&
    inviteConfirmationLink.includes('drop function if exists public.confirm_guest_with_gift(text, text, integer, text, uuid, text, text)') &&
    repository.includes('p_invite_token') &&
    repository.includes('invite_links(label)'),
  'Execute supabase/invite-confirmation-link.sql no Supabase.'
);
addCheck(
  'Rotas diretas funcionam na Vercel',
  vercelConfig.includes('"source": "/(.*)"') && vercelConfig.includes('"destination": "/index.html"'),
  'Mantenha vercel.json com rewrite para /index.html.'
);
addCheck(
  'Seed dos presentes existe',
  seed.includes('seed_code') && seed.includes('Fralda P') && seed.includes('Fralda M') && seed.includes('Fralda G'),
  'Execute supabase/seed-gifts.sql depois do schema.'
);
addCheck(
  'Pix nao esta com placeholder',
  !gifts.includes("pixKey: '11999999999'") && !seed.includes('11999999999'),
  'Atualize chave Pix real no admin/Supabase antes de publicar.'
);
addCheck(
  'Google Maps nao esta com endereco exemplo',
  !gifts.includes('Rua das Flores') && !seed.includes('Rua das Flores'),
  'Atualize local/link/embed do Google Maps antes de publicar.'
);
addCheck('Logo principal publica existe', existsSync(resolve(root, 'public/fotos/logo.png')), 'Copie a logo para public/fotos/logo.png.');
addCheck('Logo leve publica existe', existsSync(resolve(root, 'public/fotos/logo-lista.png')), 'Gere public/fotos/logo-lista.png.');
addCheck('Logo Home otimizada existe', existsSync(resolve(root, 'public/fotos/logo-home.jpg')), 'Gere public/fotos/logo-home.jpg.');
addCheck(
  'Capa de WhatsApp configurada',
  existsSync(resolve(root, 'public/fotos/preview-liara.png')) &&
    indexHtml.includes('og:image') &&
    indexHtml.includes('/fotos/preview-liara.png') &&
    indexHtml.includes('summary_large_image'),
  'Gere public/fotos/preview-liara.png e aponte as metatags Open Graph/Twitter para ela.'
);

const failed = checks.filter((check) => !check.ok);

console.log('\nChecklist go-live - Cha de Bebe da Liara\n');
for (const check of checks) {
  console.log(`${check.ok ? 'OK ' : 'FALHA'} ${check.name}`);
  if (!check.ok) console.log(`      ${check.help}`);
}

if (failed.length > 0) {
  console.log(`\n${failed.length} item(ns) precisam ser resolvidos antes de publicar.\n`);
  process.exit(1);
}

console.log('\nTudo pronto para publicar.\n');
