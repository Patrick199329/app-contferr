-- Módulo 3: Tabela de Tarefas.
-- Uma linha = cliente x departamento x competência. Os valores de coluna são
-- dinâmicos (dependem da configuração do Módulo 2), por isso ficam em JSONB
-- chaveado pelo id da coluna, em vez de colunas fixas na tabela.

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  competencia date not null,
  valores jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (cliente_id, departamento_id, competencia)
);

alter table public.tarefas enable row level security;

-- Diferente de clientes/departamentos: Módulo 3 é editável por Admin E
-- Usuário Final (a restrição por departamento do Módulo 5 chega na Fase 3.2).
create policy "Authenticated users can view tarefas"
  on public.tarefas for select
  to authenticated
  using (true);

create policy "Authenticated users can insert tarefas"
  on public.tarefas for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update tarefas"
  on public.tarefas for update
  to authenticated
  using (true)
  with check (true);

grant select, insert, update on public.tarefas to authenticated;
grant all on public.tarefas to service_role;

-- Upsert com merge de JSONB: evita a corrida entre "ler valores atuais,
-- mesclar no cliente, gravar de volta" quando duas colunas da mesma linha
-- são editadas quase ao mesmo tempo. Ganha quem grava por último (decisão
-- registrada na especificação funcional, Módulo 3).
create function public.upsert_tarefa_valor(
  p_cliente_id uuid,
  p_departamento_id uuid,
  p_competencia date,
  p_coluna_id uuid,
  p_valor jsonb,
  p_user_id uuid
)
returns void
language plpgsql
as $$
begin
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores, updated_by, updated_at)
  values (
    p_cliente_id,
    p_departamento_id,
    p_competencia,
    jsonb_build_object(p_coluna_id::text, p_valor),
    p_user_id,
    now()
  )
  on conflict (cliente_id, departamento_id, competencia)
  do update set
    valores = tarefas.valores || jsonb_build_object(p_coluna_id::text, p_valor),
    updated_by = p_user_id,
    updated_at = now();
end;
$$;

grant execute on function public.upsert_tarefa_valor to authenticated;

-- O seletor de "responsável" (Módulo 2) precisa listar todos os usuários do
-- sistema, não só o próprio perfil — a policy de profiles criada na Fase 1.3
-- só liberava auto-leitura. E-mail de colega de equipe não é dado sensível
-- aqui (27 colaboradores internos), então abrimos a leitura para qualquer
-- autenticado e mantemos a escrita restrita ao admin.
drop policy "Users can view own profile" on public.profiles;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);
