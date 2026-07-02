# Regras Oficiais Do Projeto - Cha de Bebe da Liara

Este documento e a fonte da verdade para o desenvolvimento do sistema do Cha de Bebe da Liara.

Antes de implementar ou alterar qualquer tela, componente, fluxo, banco de dados ou integracao, estas regras devem ser respeitadas.

## 1. Regra Principal Sobre As Imagens

As imagens anexadas ao projeto devem ser usadas apenas como referencia visual.

Usar as imagens para seguir fielmente:

- identidade visual
- paleta de cores
- estilo da logo
- formato dos cards
- estilo dos botoes
- sombras
- bordas
- espacamento
- composicao geral
- atmosfera delicada, feminina, baby, premium e clean

Nao usar os textos que aparecem nas imagens como fonte oficial.

Todos os textos, titulos, labels, mensagens, botoes e conteudos exibidos no sistema devem seguir exclusivamente o prompt/regras deste projeto.

Se houver conflito entre imagem e texto do projeto, o texto do projeto sempre vence.

## 2. Identidade Visual Obrigatoria

O visual deve seguir o estilo delicado das referencias:

- ursinha delicada
- laco central superior
- nome "Liara" em fonte cursiva elegante
- moldura rosa clara
- fundo claro
- visual feminino, delicado, baby e premium

Paleta:

- rosa bebe suave
- rosa claro
- branco
- bege claro
- detalhes suaves
- cinza delicado para textos secundarios
- dourado claro apenas se for usado como detalhe premium sutil

Nao usar:

- azul
- roxo
- vermelho forte
- rosa choque
- preto pesado
- elementos modernos que fujam do visual delicado

Tipografia:

- "Liara" em fonte cursiva elegante
- titulos com fonte serifada delicada
- textos com fonte sans-serif limpa
- botoes com fonte legivel e arredondada

Estilo geral:

- mobile first
- cards arredondados
- sombras suaves
- icones redondos rosa
- barra de progresso com checkmarks
- fundo delicado
- elementos suaves de ursinha, laco e coracoes
- bastante espaco em branco
- aparencia premium e clean

## 3. Objetivo Do Sistema

Criar um convite digital interativo para o Cha de Bebe da Liara.

O sistema deve permitir que o convidado:

1. veja as informacoes do evento
2. abra a localizacao no Google Maps
3. preencha seus dados
4. informe se pretende usar a piscina
5. escolha obrigatoriamente um presente da lista
6. escolha se vai levar o presente no dia ou contribuir via Pix
7. finalize a confirmacao somente apos escolher um presente disponivel

O sistema tambem deve ter painel administrativo para a familia acompanhar convidados, presentes, piscina, Pix e exportacoes.

## 4. Regra De Fluxo Fechado

A confirmacao de presenca so deve ser salva como concluida depois que o convidado:

1. preencher nome completo
2. preencher WhatsApp
3. informar quantidade de pessoas
4. responder sobre uso da piscina
5. escolher um presente disponivel
6. escolher a forma de presentear
7. confirmar a escolha final

Nao existe confirmacao completa sem presente escolhido.

Fluxo principal:

```text
Tela Inicial
  -> Dados do Convidado
  -> Escolha do Presente
  -> Forma de Presentear
  -> Confirmacao Final
```

## 5. Paginas Publicas

### Tela Inicial

Deve conter:

- logo centralizada no topo
- titulo: "Cha de Bebe da Liara"
- mensagem principal do convite
- data do evento
- horario
- endereco
- aviso sobre piscina
- contador regressivo
- contador de presentes disponiveis
- botao "Ver Localizacao"
- botao "Confirmar Presenca"

Texto principal:

```text
Com muito amor, estamos preparando a chegada da nossa pequena Liara e gostariamos de compartilhar esse momento especial com voce.
```

Aviso da piscina:

```text
Teremos piscina liberada para os convidados. Quem quiser aproveitar, pode levar roupa de banho.
```

### Dados Do Convidado

Campos obrigatorios:

- nome completo
- WhatsApp
- quantidade de pessoas
- vai utilizar a piscina? Sim, Nao ou Talvez

Mensagem abaixo da piscina:

```text
Se for usar a piscina, lembre-se de levar roupa de banho.
```

Mensagem informativa:

```text
Para finalizar sua confirmacao, sera necessario escolher um presente para ajudar no enxoval da Liara.
```

Botao:

```text
Continuar para Lista de Presentes
```

### Escolha Do Presente

Titulo:

```text
Escolha seu presente para a Liara
```

Texto auxiliar:

```text
Cada presente ajuda a compor o enxoval da Liara. Escolha uma opcao disponivel para finalizar sua confirmacao.
```

Filtros:

- Fralda P
- Fralda M
- Fralda G

Cada presente deve aparecer em card delicado com:

- nome do presente
- categoria
- valor estimado
- status
- botao "Escolher"

Status:

- Disponivel
- Reservado

Presentes reservados devem aparecer bloqueados e indisponiveis.

### Forma De Presentear

Depois de escolher o presente, perguntar:

```text
Como deseja presentear?
```

Opcoes:

1. Vou comprar e levar no dia
2. Quero contribuir via Pix

Se escolher Pix, mostrar:

- valor sugerido
- QR Code Pix
- chave Pix
- nome do favorecido
- botao "Copiar chave Pix"
- campo opcional para anexar comprovante

Mensagem Pix:

```text
O comprovante e opcional, mas ajuda a familia a conferir.
```

### Confirmacao Final

Topo:

```text
PRESENCA CONFIRMADA!
```

Mostrar resumo:

- nome do convidado
- WhatsApp
- quantidade de pessoas
- uso da piscina
- presente escolhido
- forma de presentear
- status do Pix, se houver

Mensagem final:

```text
Obrigada por fazer parte desse momento tao especial.

Estamos muito felizes por ter voce conosco nessa fase tao importante da preparacao do enxoval da nossa princesa Liara.

Sua presenca, seu carinho e sua contribuicao significam muito para nossa familia.
```

Aviso final:

```text
Se for aproveitar a piscina, nao esqueca de levar roupa de banho.
```

Botoes:

- Voltar ao inicio
- Compartilhar convite
- Abrir localizacao

## 6. Lista De Presentes

Cada item da lista deve ser tratado como uma cota unica.

Mesmo que dois presentes tenham o mesmo nome e valor, cada cota deve ser um registro independente no banco.

Exemplo:

```text
Fralda P + Lenco Umedecido Huggies - Cota 01
Fralda P + Lenco Umedecido Huggies - Cota 02
Fralda P + Lenco Umedecido Huggies - Cota 03
```

Visualmente, pode aparecer apenas o nome do presente, mas a logica deve tratar cada item como unico.

Total esperado:

```text
115 presentes disponiveis
```

Categorias:

- Fralda P
- Fralda M
- Fralda G

Marcas sugeridas para fraldas:

- Pampers Confort Sec
- Huggies Tripla Protecao
- MamyPoko

## 7. Regra Contra Presentes Duplicados

Esta e uma regra critica do sistema.

Cada presente/cota so pode ser escolhido uma unica vez.

O frontend nao deve ser a unica protecao contra duplicidade.

A reserva deve acontecer no banco de dados, em transacao, usando uma funcao RPC do Supabase/PostgreSQL.

Funcao recomendada:

```text
confirm_guest_with_gift
```

A funcao deve:

1. receber os dados do convidado
2. receber o presente escolhido
3. verificar se o presente ainda esta disponivel
4. criar o convidado
5. vincular o presente ao convidado
6. marcar o presente como reservado
7. retornar sucesso

Se o presente ja tiver sido reservado por outra pessoa, a funcao deve falhar e retornar uma mensagem amigavel:

```text
Esse presente acabou de ser escolhido por outro convidado. Por favor, escolha outro presente disponivel para a Liara.
```

## 8. Estrategia De Reserva

Nao bloquear o presente apenas quando o convidado clicar em "Escolher".

O presente so deve ser reservado definitivamente quando o convidado clicar em:

```text
Confirmar Escolha
```

Isso evita que uma pessoa abra o modal e abandone o fluxo, deixando presente preso indevidamente.

## 9. Pix

O Pix inicial deve ser manual.

Forma de presentear:

- `bring_gift`: convidado vai comprar e levar no dia
- `pix`: convidado quer contribuir via Pix

Se for Pix:

- mostrar valor sugerido igual ao valor estimado do presente
- mostrar QR Code Pix
- mostrar chave Pix
- mostrar nome do favorecido
- permitir copiar chave Pix
- permitir anexo opcional de comprovante

Status Pix:

- `not_required`: nao e Pix
- `pending_receipt`: Pix escolhido, sem comprovante
- `pending_review`: comprovante enviado, aguardando conferencia
- `confirmed`: Pix confirmado pela familia
- `rejected`: comprovante recusado ou pagamento nao localizado

Comprovantes devem ser salvos no Supabase Storage em um bucket:

```text
pix-receipts
```

## 10. Google Maps

Usar Google Maps de forma simples.

Na tela inicial:

- botao "Ver Localizacao"
- ao clicar, abrir link do Google Maps em nova aba

Opcionalmente, pode existir tela ou secao de localizacao com mapa incorporado.

Recomendacao inicial:

- usar link do Google Maps configurado no painel administrativo
- evitar Google Maps API no MVP

## 11. Painel Administrativo

Rotas recomendadas:

```text
/admin/login
/admin/dashboard
/admin/convidados
/admin/presentes
/admin/pix
/admin/configuracoes
/admin/exportacoes
```

### Dashboard

Mostrar:

- total de convidados confirmados
- total de pessoas confirmadas
- quantidade de convidados que vao usar a piscina
- quantidade de convidados que talvez usem a piscina
- presentes reservados
- presentes disponiveis
- Pix pendentes
- Pix confirmados
- valor estimado em Pix
- valor confirmado em Pix

### Convidados

Tabela:

- nome
- WhatsApp
- quantidade de pessoas
- uso da piscina
- presente escolhido
- forma de presentear
- status Pix
- data da confirmacao

Acoes:

- ver detalhes
- editar
- cancelar confirmacao
- abrir WhatsApp

Filtros:

- pesquisar convidado
- filtrar por presente
- filtrar por categoria
- filtrar por uso da piscina
- filtrar por Pix
- filtrar por levar no dia
- filtrar por data

### Presentes

Tabela:

- categoria
- nome
- valor estimado
- status
- reservado por
- data da reserva

Acoes:

- criar presente
- editar presente
- desativar presente
- liberar presente reservado

### Pix

Tabela:

- convidado
- WhatsApp
- presente
- valor sugerido
- comprovante
- status
- data

Acoes:

- ver comprovante
- confirmar pagamento
- marcar como nao localizado
- abrir WhatsApp

### Configuracoes

Campos:

- nome da bebe
- titulo do evento
- mensagem principal
- data
- horario
- endereco
- link Google Maps
- chave Pix
- nome do favorecido
- cidade Pix
- mensagem final
- limite maximo de pessoas por confirmacao
- ativar/desativar envio de comprovante

## 12. Banco Supabase

Modelo recomendado:

```text
event_settings
gift_categories
gifts
guests
admins
audit_logs
```

### event_settings

Campos:

- id
- baby_name
- event_title
- host_names
- event_date
- event_time
- address
- address_reference
- google_maps_url
- google_maps_embed_url
- pix_key
- pix_receiver_name
- pix_city
- invitation_message
- final_message
- max_people_per_confirmation
- allow_pix_receipt_upload
- banner_url
- created_at
- updated_at

### gift_categories

Campos:

- id
- name
- sort_order
- created_at

### gifts

Campos:

- id
- category_id
- name
- estimated_value
- suggested_brands
- status
- reserved_by_guest_id
- reserved_at
- sort_order
- created_at
- updated_at

Status:

- `available`
- `reserved`
- `disabled`

### guests

Campos:

- id
- full_name
- whatsapp
- people_count
- pool_usage
- gift_id
- gift_method
- pix_status
- pix_receipt_url
- confirmed_at
- created_at
- updated_at

Pool usage:

- `yes`
- `no`
- `maybe`

Gift method:

- `bring_gift`
- `pix`

### admins

Campos:

- id
- user_id
- name
- role
- created_at

### audit_logs

Campos:

- id
- admin_id
- action
- entity_type
- entity_id
- metadata
- created_at

## 13. Relacionamentos

```text
gift_categories 1 -> N gifts
guests 1 -> 1 gifts
auth.users 1 -> N admins
admins 1 -> N audit_logs
```

O presente escolhido deve ficar vinculado ao convidado.

O convidado deve ficar vinculado ao presente reservado.

## 14. Seguranca

Usar Supabase Auth para administradores.

Ativar Row Level Security.

Area publica pode:

- ler configuracoes publicas do evento
- ler categorias
- ler presentes ativos
- executar a funcao `confirm_guest_with_gift`
- enviar comprovante Pix, se habilitado

Area administrativa pode:

- ler todos os dados
- editar configuracoes
- criar, editar e desativar presentes
- editar convidados
- liberar presentes
- confirmar Pix
- exportar dados

## 15. Exportacoes

Exportacoes em Excel:

- lista geral de convidados
- lista de piscina
- lista de presentes reservados
- lista de Pix
- lista de Pix pendente

Exportacoes em PDF:

- resumo do evento
- lista de presenca
- lista de presentes
- lista de Pix pendente

Bibliotecas recomendadas:

- `xlsx` para Excel
- `jspdf` e `jspdf-autotable` para PDF simples
- ou tela HTML imprimivel para PDF mais bonito

## 16. WhatsApp

O painel administrativo deve ter atalho para abrir conversa no WhatsApp do convidado.

Usar link:

```text
https://wa.me/55NUMERO
```

Usos:

- lembrar do presente
- conferir Pix
- agradecer confirmacao
- avisar sobre roupa de banho

## 17. Experiencia Do Usuario

O sistema deve ser extremamente simples para qualquer convidado usar.

Boas praticas obrigatorias:

- layout mobile first
- campos grandes e legiveis
- validacao clara
- mensagens amigaveis
- botao voltar entre etapas
- preservar dados temporarios no navegador enquanto o usuario nao finaliza
- mostrar presentes disponiveis primeiro
- mostrar reservados como bloqueados
- feedback visual ao copiar chave Pix
- mensagem amigavel se o presente for reservado por outra pessoa

## 18. Regras Obrigatorias

1. Nao permitir confirmar presenca sem escolher presente.
2. Nao permitir reservar presente duplicado.
3. Nao permitir avancar sem preencher campos obrigatorios.
4. Cada presente/cota so pode ser escolhido uma unica vez.
5. Salvar no banco o convidado e o presente escolhido.
6. Atualizar disponibilidade em tempo real.
7. Mostrar presentes reservados como indisponiveis.
8. O painel administrativo deve refletir os dados em tempo real.
9. O sistema deve ser simples para qualquer convidado usar.
10. O design deve seguir fielmente as imagens anexadas como referencia visual.
11. Os textos exibidos devem seguir o prompt/regras, nao os textos das imagens.
12. A reserva deve acontecer no banco, em transacao.
13. Se dois convidados tentarem escolher o mesmo presente, apenas o primeiro deve conseguir.
14. O segundo deve receber mensagem amigavel e voltar para a lista.
15. O sistema deve ser mobile first.

## 19. Tecnologias

Usar:

- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase
- PostgreSQL
- Vercel

Estrutura esperada:

- componentes reutilizaveis
- rotas organizadas
- servicos separados para Supabase
- tipagens TypeScript
- layout responsivo
- codigo limpo
- boas praticas

## 20. Regra Antes De Codar

Antes de implementar uma funcionalidade, validar se ela respeita:

1. a identidade visual
2. o fluxo fechado de confirmacao
3. a regra de presente unico
4. a fonte oficial dos textos
5. a seguranca do banco
6. a experiencia mobile
7. o painel administrativo

Se alguma decisao entrar em conflito com este documento, este documento deve prevalecer.
