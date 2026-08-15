# Backlog de Tarefas — Contferr

Tarefas ordenadas por dependência técnica. Tudo nas Fases 1–5 é desenvolvido e validado em ambiente **local** (Next.js local + Supabase CLI ou equivalente). Supabase Cloud e Vercel entram somente na Fase 6.

---

## Fase 1 — Fundação (local)

### 1.1 — Estrutura do projeto Next.js
- **Descrição:** inicializar o projeto Next.js com a estrutura de pastas padrão da Innovation, configurar TypeScript, ESLint, Prettier e Tailwind. Configurar Supabase local (CLI) e conectar ao projeto Next.js via variáveis de ambiente.
- **Depende de:** nenhuma
- **Critério de aceite:** projeto roda localmente em `localhost:3000` sem erros; conexão com Supabase local confirmada via query de teste.

### 1.2 — Autenticação de usuários
- **Descrição:** implementar login/logout via Supabase Auth (e-mail + senha). Tela de login com validação de campos. Redirecionamento para dashboard após login bem-sucedido. Sessão persistida entre reloads.
- **Depende de:** 1.1
- **Critério de aceite:** usuário consegue logar com credenciais válidas, é redirecionado para o dashboard e permanece logado após reload; tentativa com credenciais inválidas exibe mensagem de erro; logout redireciona para tela de login.

### 1.3 — Estrutura de perfis e permissões (base)
- **Descrição:** definir e implementar os dois perfis (Administrador e Usuário Final) como camada de autorização. Criar middleware/guard de rota que impede Usuário Final de acessar páginas administrativas. Criar seed de dados local com pelo menos um Admin e dois Usuários Finais para testes.
- **Depende de:** 1.2
- **Critério de aceite:** Usuário Final logado não consegue acessar rotas do painel administrativo (recebe 403 ou redirect); Administrador acessa tudo; o seed popula o banco local sem erros.

---

## Fase 2 — Módulos principais (local)

### 2.1 — Módulo 1: Cadastro de Clientes (CRUD completo)
- **Descrição:** tela de listagem de clientes (com busca por nome/razão social), formulário de criação/edição (razão social, nome fantasia, CNPJ com máscara e validação), ação de desativação (não exclusão). Clientes inativos não aparecem na listagem padrão, mas são acessíveis por filtro.
- **Depende de:** 1.3
- **Critério de aceite:** Admin consegue criar, editar e desativar clientes; CNPJ inválido bloqueia o formulário com mensagem; cliente inativo some da listagem principal mas aparece com filtro "inativos"; dados persistem após reload.

### 2.2 — Módulo 2: Departamentos (CRUD pelo Admin)
- **Descrição:** painel de criação e edição de departamentos. Cada departamento tem nome e lista de colunas configuráveis. Tipos de coluna suportados: texto livre, lista de opções (dropdown), data, status, responsável (usuário do sistema). Colunas podem ser reordenadas. Desativação de coluna (não exclusão).
- **Depende de:** 1.3
- **Critério de aceite:** Admin cria um departamento com ao menos 3 colunas de tipos diferentes; reordena as colunas; desativa uma coluna e ela desaparece da tabela de tarefas sem apagar dados históricos; renomear departamento reflete imediatamente em toda a interface.

### 2.3 — Módulo 3: Tabela de Tarefas (competência corrente)
- **Descrição:** tela central da plataforma. Exibe a tabela de tarefas do mês corrente para o departamento selecionado. Linhas = clientes ativos. Colunas = configuradas no Módulo 2 para aquele departamento. Edição inline (sem modal separado). Salva automaticamente ao sair do campo (sem botão "salvar"). Filtro/busca de cliente dentro da tabela.
- **Depende de:** 2.1, 2.2
- **Critério de aceite:** tabela carrega com todos os clientes ativos; edição de um campo é salva sem ação explícica do usuário; busca por nome de cliente filtra as linhas em tempo real; Usuário Final sem acesso ao departamento não vê a tabela (nem o departamento no menu).

### 2.4 — Módulo 4: Histórico de competências (leitura)
- **Descrição:** tela de consulta de competências anteriores. Seletor de mês/ano para navegar no histórico. A tabela histórica é idêntica em layout à tabela corrente, mas somente-leitura. Acesso restrito ao mesmo nível de permissão de departamento.
- **Depende de:** 2.3
- **Critério de aceite:** Admin consegue navegar para o mês anterior e ver o estado da tabela como estava; campos históricos não são editáveis; Usuário Final sem acesso ao departamento não vê o histórico daquele departamento.

---

## Fase 3 — Painel Administrativo (local)

### 3.1 — Gestão de usuários (CRUD pelo Admin)
- **Descrição:** listagem de usuários, criação (nome, e-mail, perfil), edição e desativação. Sistema impede desativação do último Administrador ativo.
- **Depende de:** 1.3
- **Critério de aceite:** Admin cria um novo Usuário Final; o usuário recebe e-mail de convite via Supabase Auth (ou senha definida pelo Admin); tentativa de desativar o último Admin retorna erro com mensagem explicativa.

### 3.2 — Configuração de permissões por usuário
- **Descrição:** interface para o Admin configurar quais departamentos cada Usuário Final pode acessar. Alterações têm efeito imediato (sem logout/login necessário).
- **Depende de:** 3.1, 2.2
- **Critério de aceite:** Admin libera um departamento para um Usuário Final; ao recarregar, o Usuário Final vê o departamento no menu; ao revogar o acesso, o departamento desaparece na próxima ação do usuário.

### 3.3 — Gestão de listas de opções (dropdowns)
- **Descrição:** dentro do painel admin, o Admin pode editar as opções de colunas do tipo "lista de opções" sem precisar reconfigurar toda a coluna. Adicionar, reordenar e desativar opções.
- **Depende de:** 2.2
- **Critério de aceite:** Admin adiciona uma nova opção a um dropdown; a opção aparece imediatamente no campo correspondente na tabela de tarefas; opção desativada não aparece como selecionável em novos registros, mas é preservada em registros históricos.

---

## Fase 4 — Virada Mensal Automática (local)

### 4.1 — Implementação do mecanismo de virada
- **Descrição:** ao virar o mês, o sistema cria automaticamente uma nova competência com todos os clientes ativos e as colunas configuradas — valores de campos iniciam vazios (ou com padrão configurado, ⚠️ **confirmar comportamento padrão com Patrick antes de implementar**). O snapshot da competência anterior é gravado como histórico somente-leitura. Implementar via `pg_cron` (Supabase/Postgres) ou Vercel Cron — avaliar qual é mais compatível com o padrão da Innovation.
- **Depende de:** 2.3, 2.4
- **Critério de aceite:** simular virada manual em ambiente local (ex.: forçar execução da função); nova competência aparece vazia com todos os clientes ativos; competência anterior aparece no histórico como somente-leitura; cliente inativado antes da virada não aparece na nova competência.

### 4.2 — Log de falha e reprocessamento manual
- **Descrição:** se a virada automática falhar, registrar log de erro acessível ao Admin. Disponibilizar ação manual de "forçar virada" no painel administrativo (protegida por confirmação explícita).
- **Depende de:** 4.1
- **Critério de aceite:** ao simular uma falha na virada, o log registra o erro com timestamp; o Admin consegue disparar a virada manualmente pela interface; a virada manual produz o mesmo resultado da automática.

---

## Fase 5 — Validação local completa

### 5.1 — Revisão de escopo e teste integrado
- **Descrição:** percorrer cada item do escopo aprovado (Módulos 1 a 6) e verificar contra os critérios de aceite do Anexo I do contrato. Testar os fluxos com os 3 perfis de seed (1 Admin, 2 Usuários Finais com permissões diferentes). Verificar os casos de borda documentados na especificação funcional. Nenhuma pendência de escopo aberta antes de avançar para a Fase 6.
- **Depende de:** todas as tarefas das Fases 1–4
- **Critério de aceite:** todos os critérios de aceite das tarefas anteriores validados; nenhum módulo do Anexo I sem implementação correspondente; sem bugs bloqueantes no fluxo principal.

---

## Fase 6 — Deploy em nuvem (Supabase Cloud + Vercel)

### 6.1 — Provisionar Supabase de produção
- **Descrição:** criar projeto Supabase de produção para a Contferr (projeto separado, custo ~R$ 58/mês conforme padrão Innovation). Rodar migrations do schema validado localmente. Configurar Row Level Security (RLS) alinhado com o modelo de permissões implementado.
- **Depende de:** 5.1
- **Critério de aceite:** migrations aplicadas sem erros no Supabase Cloud; RLS bloqueando acesso indevido (testar com usuário sem permissão).

### 6.2 — Deploy na Vercel e variáveis de ambiente
- **Descrição:** criar projeto na Vercel, conectar ao repositório GitHub da Contferr, configurar variáveis de ambiente de produção (URL do Supabase de produção, anon key, service key). Configurar domínio (subdomínio padrão Innovation ou domínio próprio do cliente, se aplicável).
- **Depende de:** 6.1
- **Critério de aceite:** build de produção passa sem erros; aplicação acessível via URL de produção; login funciona com usuários criados no Supabase de produção.

### 6.3 — Seed de dados de produção
- **Descrição:** criar o usuário Administrador inicial e os departamentos reais (pessoal, fiscal, lucro presumido/real, societário) no ambiente de produção. Não usar dados fictícios do seed de desenvolvimento.
- **Depende de:** 6.2
- **Critério de aceite:** Admin da Contferr consegue logar com credenciais próprias; 4 departamentos aparecem no painel; Admin consegue criar usuários e configurar permissões.

---

## Fase 7 — Testes finais e entrega

### 7.1 — Checklist de entrega
- **Descrição:** verificar todos os itens do checklist padrão Innovation antes de declarar entrega formal.
- **Depende de:** 6.3
- **Critério de aceite:** todos os itens abaixo confirmados:
  - [ ] Backup automatizado habilitado no Supabase Cloud (plano Pro inclui PITR)
  - [ ] Domínio/URL final definido e funcionando com HTTPS
  - [ ] Credenciais de acesso Admin entregues ao cliente (forma segura)
  - [ ] Usuários iniciais criados conforme lista fornecida pelo cliente
  - [ ] Gravação de onboarding realizada (ou sessão ao vivo agendada) cobrindo: login, cadastro de cliente, uso da tabela de tarefas, navegação no histórico
  - [ ] Contrato assinado com valor atualizado (R$ 2.400,00 no Quadro Resumo Comercial) ⚠️ **confirmar antes da entrega se a versão final do contrato já tem os dois valores corrigidos**

### 7.2 — Sessão de onboarding com o time
- **Descrição:** conduzir sessão de 15–20 min com os usuários da Contferr (em especial com o departamento da Priscilla, que teve resistência inicial) demonstrando que a plataforma substitui passos manuais — não adiciona uma camada em cima deles. Focar em: como atualizar status de tarefas, como navegar entre departamentos e como consultar o histórico.
- **Depende de:** 7.1
- **Critério de aceite:** sessão realizada; usuários conseguem executar as 3 ações principais sem auxílio ao final da sessão; aceite formal de entrega assinado pelo cliente (conforme cláusula de homologação do contrato).
