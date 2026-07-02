# Supabase - Cha de Bebe da Liara

Esta pasta guarda a estrutura oficial do banco do projeto.

## 1. Aplicar O Schema

No painel do Supabase:

1. Abra o projeto.
2. Va em `SQL Editor`.
3. Cole o conteudo de `schema.sql`.
4. Execute.

O schema cria:

- `event_settings`
- `gift_categories`
- `gifts`
- `guests`
- `admins`
- `audit_logs`
- funcao `confirm_guest_with_gift`
- policies de Row Level Security

## 2. Regra Contra Presente Duplicado

A funcao principal e:

```sql
public.confirm_guest_with_gift(
  p_full_name text,
  p_whatsapp text,
  p_people_count integer,
  p_pool_usage text,
  p_gift_id uuid,
  p_gift_method text,
  p_pix_receipt_url text default null
)
```

Ela faz tudo em uma transacao:

1. bloqueia o presente com `for update`
2. verifica se ainda esta disponivel
3. cria o convidado
4. vincula o presente ao convidado
5. marca o presente como reservado

Se duas pessoas escolherem o mesmo presente ao mesmo tempo, apenas a primeira confirma.

## 3. Valores Usados Pelo Banco

Piscina:

```text
yes
no
maybe
```

Forma de presentear:

```text
bring_gift
pix
```

Status Pix:

```text
not_required
pending_receipt
pending_review
confirmed
rejected
```

Status do presente:

```text
available
reserved
disabled
```

## 4. Storage Para Comprovantes Pix

O `schema.sql` cria o bucket no Supabase Storage:

```text
pix-receipts
```

Uso esperado:

- convidado envia comprovante opcional
- arquivo sobe para `pix-receipts`
- URL e salva em `guests.pix_receipt_url`
- admin revisa e muda `pix_status`

Observacao:

- o bucket fica publico para facilitar a abertura do comprovante pelo painel
- nao coloque dados sensiveis alem do comprovante
- se quiser privacidade maior, trocar para bucket privado e gerar signed URLs no admin

## 5. Variaveis De Ambiente

Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Enquanto essas variaveis nao forem configuradas, o app usa `localStorage`.

## 6. Admin

Para usar Supabase Auth no admin:

1. Crie um usuario no Supabase Auth.
2. Copie o `user_id`.
3. Insira em `public.admins`.

Exemplo:

```sql
insert into public.admins (user_id, name, role)
values ('UUID_DO_USUARIO_AUTH', 'Familia da Liara', 'owner');
```

## 7. Observacao Sobre Seed Dos Presentes

A lista oficial atual esta em:

```text
src/data/gifts.ts
```

Ao conectar o Supabase real, essas 115 cotas devem ser inseridas na tabela `gifts`, cada uma como um registro independente.

Mesmo que o nome do presente se repita, cada cota deve ter seu proprio registro.

## 8. Popular As 115 Cotas

Depois de aplicar `schema.sql`, execute tambem:

```text
supabase/seed-gifts.sql
```

Esse arquivo cria:

- configuracao inicial do evento
- categorias Fralda P, Fralda M e Fralda G
- as 115 cotas oficiais
- `seed_code` unico para impedir duplicacao ao rodar o seed novamente
