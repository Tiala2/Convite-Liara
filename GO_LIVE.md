# Go-live - Cha de Bebe da Liara

Use este checklist antes de enviar o link para os convidados.

## 1. Supabase Real

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env`.
3. Preencha:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

4. No Supabase, abra `SQL Editor`.
5. Execute `supabase/schema.sql`.
6. Execute `supabase/seed-gifts.sql`.
7. Execute `supabase/admin-hardening.sql`.
8. Execute `supabase/storage-hardening.sql`.
9. Execute `supabase/admin-content-rpcs.sql`.
10. Execute `supabase/public-validation-hardening.sql`.
11. Execute `supabase/duplicate-whatsapp-hardening.sql`.
12. Execute `supabase/admin-backup-log.sql`.
13. Execute `supabase/public-gifts-rpc.sql`.
14. Execute `supabase/private-gift-table-hardening.sql`.
15. Execute `supabase/invite-links.sql`.
16. Execute `supabase/invite-confirmation-link.sql`.
17. Rode:

```bash
npm run check:go-live
```

18. Valide o Supabase real:

```bash
npm run check:supabase-real
```

19. Valide o fluxo completo real:

```bash
npm run test:supabase-flow
```

## 2. Anti-presente duplicado

Teste antes de publicar:

1. Abra o convite em dois celulares ou duas abas anonimas.
2. Escolha o mesmo presente nas duas.
3. Confirme quase ao mesmo tempo.
4. Resultado esperado: apenas uma confirmacao passa; a outra recebe erro e a lista atualiza.

A regra principal fica na funcao SQL:

```text
confirm_guest_with_gift
```

Ela bloqueia o presente com `for update`.

## 3. Pix Real

No painel admin ou direto no Supabase, configure:

- chave Pix real
- nome do favorecido
- cidade Pix
- banco Pix, apenas para conferencia visual do convidado
- valores dos presentes

O banco nao entra no codigo Pix. O valor do Pix e gerado automaticamente conforme o presente escolhido.

Depois teste:

1. escolha um presente
2. selecione Pix
3. copie o codigo
4. valide no app do banco
5. envie comprovante opcional
6. confira o comprovante no admin

## 4. Google Maps

No admin, configure:

- endereco completo
- referencia do local
- link do Google Maps
- embed do Google Maps

Teste no celular:

- botao "Ver localizacao"
- mapa recolhivel
- link abrindo o app de mapas

## 5. Exportacoes

No admin, teste:

- convidados CSV
- convites CSV
- presentes CSV
- Pix CSV
- historico seguranca CSV
- backup completo JSON
- relatorio imprimivel/PDF
- lista de presenca

## 6. Convites individuais

No admin, aba `Convites`:

1. Crie um link por convidado ou familia.
2. Copie a mensagem pronta.
3. Envie pelo WhatsApp.
4. O link deve ficar no formato `/c/codigo`, sem nome no endereco.
5. Depois de abrir, o painel mostra a quantidade de aberturas.

## 7. Deploy

### Caminho rapido pela Vercel CLI

1. Faça login na Vercel:

```bash
npx vercel login
```

2. Publique em producao:

```bash
npx vercel --prod
```

3. Quando a Vercel perguntar:

```text
Set up and deploy? Y
Which scope? sua conta
Link to existing project? N
Project name? cha-bebe-liara
In which directory is your code located? ./
Want to modify settings? N
```

4. Depois, configure as variaveis na Vercel:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

5. Faça um novo deploy se configurou as variaveis depois da primeira publicacao:

```bash
npx vercel --prod
```

### Caminho com GitHub

1. Suba o projeto para GitHub.
2. Conecte na Vercel.
3. Configure as variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Publique.

### Testes depois de publicar

1. Teste o link principal.
2. Teste `/admin`.
3. Teste um link individual `/c/codigo`.
4. Rode uma confirmacao real de ponta a ponta.
5. Envie o link no WhatsApp e confira capa, titulo e descricao.

Link profissional recomendado:

```text
https://cha-bebe-liara.vercel.app
```

Use um unico link para todos os convidados. Nao use link com nome na URL.

## 8. Teste Final No Celular

- Home carrega rapido.
- Logo aparece integrada ao fundo.
- Confirmacao de presenca funciona.
- Lista de presentes carrega do Supabase.
- Presente reservado some/atualiza.
- Pix copia corretamente.
- Confirmacao final aparece.
- Compartilhar abre WhatsApp.
- Admin abre em `/admin`.
