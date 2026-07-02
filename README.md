# Cha de Bebe da Liara

Um convite digital interativo e responsivo para o cha de bebe da Liara, com lista de presentes, confirmacao de presenca, opcao de Pix e painel administrativo.

## Funcionalidades

- [x] Tela inicial com informacoes do evento
- [x] Contador regressivo
- [x] Contador de presentes disponiveis
- [x] Confirmacao de presenca com validacao obrigatoria
- [x] Fluxo fechado: presenca -> presente -> confirmacao
- [x] Selecao de presentes com busca e filtros por categoria
- [x] Protecao real contra presente duplicado no Supabase
- [x] Opcao de contribuicao via Pix com chave CPF copiavel
- [x] Comprovante Pix opcional com validacao de tipo e tamanho
- [x] Tela de confirmacao final
- [x] Painel administrativo protegido por Supabase Auth
- [x] Acesso direto ao painel por `/admin`
- [x] Links individuais profissionais por convidado em `/c/codigo`
- [x] Registro de abertura dos convites individuais
- [x] Dashboard com estatisticas de convidados, piscina, presentes e Pix
- [x] Admin com abas de convites, convidados, presentes, Pix, seguranca e exportacoes
- [x] Edicao e cancelamento de confirmacoes no admin
- [x] Criacao, edicao, ativacao e desativacao de presentes no admin
- [x] Configuracoes editaveis do evento no painel admin
- [x] Mensagem inicial e mensagem final editaveis no admin
- [x] Exportacao CSV para Excel, backup JSON e relatorio HTML imprimivel/PDF
- [x] Lista de presenca imprimivel com campo de assinatura
- [x] Mapa Google Maps incorporado na tela inicial
- [x] Design responsivo e mobile-first
- [x] Animacoes suaves com Framer Motion
- [x] RLS, RPCs administrativas, logs de auditoria e comprovantes Pix privados

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Supabase

## Instalacao

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para producao
npm run build
```

## Configuracao do Supabase

1. Crie um projeto no Supabase (https://supabase.com)
2. Copie o arquivo `.env.example` para `.env`
3. Adicione as credenciais do seu projeto
4. Execute os SQLs listados em `GO_LIVE.md`
5. Siga o guia em `supabase/README.md`

## Deploy na Vercel

1. Conecte seu repositorio GitHub a Vercel
2. Adicione as variaveis de ambiente (se usando Supabase)
3. Deploy automatico a cada push na main

Antes de publicar, rode:

```bash
npm run check:go-live
```

O checklist completo esta em:

```text
GO_LIVE.md
```

## Senha do Painel Administrativo

O acesso administrativo usa Supabase Auth. Crie o usuario admin real antes de publicar.

O painel pode ser acessado diretamente em:

```text
/admin
```

## Personalizacao

### Dados do Evento
No app, acesse o painel admin e use a aba `Configuracoes` para alterar:

- Data e horario do evento
- Endereco
- Chave Pix
- Nome do bebe
- Mensagem inicial
- Mensagem final

O arquivo `src/data/gifts.ts` contem os valores padrao usados antes de qualquer configuracao ser salva.

### Lista de Presentes
A lista inicial de presentes fica em `src/data/gifts.ts`.

No app, a familia pode usar a aba `Presentes` do painel admin para:

- criar nova cota
- editar nome, categoria e valor
- desativar uma cota nao reservada
- reativar uma cota desativada
- liberar presente reservado

### Confirmacoes

Na aba `Convidados`, a familia pode:

- editar nome, WhatsApp, quantidade de pessoas e piscina
- alterar forma de presentear
- alterar status Pix
- cancelar uma confirmacao
- liberar o presente escolhido

### Pix

No fluxo publico, o convidado que escolher Pix ve:

- valor sugerido do presente
- chave Pix CPF
- botao para copiar a chave Pix
- dados do favorecido para conferencia
- envio opcional de comprovante em JPG, PNG, WEBP ou PDF ate 5 MB

### Paleta de Cores
As cores estao configuradas no Tailwind:
- Baby Pink: #F8D7E4
- Light Pink: #F4C7D7
- Soft Beige: #F7EFE8

## Regras Do Projeto

As regras oficiais ficam em:

```text
REGRAS_DO_PROJETO.md
```

Pontos principais:

- imagens sao referencia visual, nao textual
- textos oficiais vem das regras do projeto
- confirmacao so termina apos escolher presente
- cada presente/cota so pode ser escolhido uma vez
- no Supabase real, a reserva deve usar a funcao `confirm_guest_with_gift`

## Licenca

MIT
