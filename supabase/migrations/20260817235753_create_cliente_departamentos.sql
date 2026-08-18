-- Vínculo cliente x departamento: até aqui todo departamento enxergava
-- todos os clientes ativos na Tabela de Tarefas — não reflete a operação
-- real da Contferr (um cliente Lucro Real não é cliente do Simples, por
-- exemplo). A partir daqui, um cliente só aparece no departamento a que
-- estiver vinculado.

create table public.cliente_departamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (cliente_id, departamento_id)
);

alter table public.cliente_departamentos enable row level security;

create policy "Authenticated users can view cliente_departamentos"
  on public.cliente_departamentos for select
  to authenticated
  using (true);

grant select on public.cliente_departamentos to authenticated;
grant all on public.cliente_departamentos to service_role;

-- Gerente ativo: pode criar/editar clientes (o vínculo a departamento
-- específico é checado à parte, função abaixo).
create function public.is_gerente_ativo()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'gerente' and status = 'ativo'
  );
$$;

-- Gerente do departamento X: gerente ativo com permissão liberada (tabela
-- `permissoes`, Fase 3.2) para aquele departamento especificamente.
create function public.is_gerente_do_departamento(p_departamento_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.permissoes perm on perm.usuario_id = pr.id
    where pr.id = auth.uid()
      and pr.role = 'gerente'
      and pr.status = 'ativo'
      and perm.departamento_id = p_departamento_id
  );
$$;

create policy "Gerentes can manage own department links"
  on public.cliente_departamentos for all
  using (public.is_gerente_do_departamento(departamento_id))
  with check (public.is_gerente_do_departamento(departamento_id));

create policy "Admins can manage cliente_departamentos"
  on public.cliente_departamentos for all
  using (public.is_admin())
  with check (public.is_admin());

grant insert, delete on public.cliente_departamentos to authenticated;

-- Gerente pode criar cliente novo (o vínculo a um departamento específico
-- acontece em seguida, via insert em cliente_departamentos, já protegido
-- pela policy acima).
create policy "Gerentes can create clientes"
  on public.clientes for insert
  to authenticated
  with check (public.is_gerente_ativo());

-- Gerente só edita cliente (razão social/nome fantasia/CNPJ/status) que
-- tenha vínculo com pelo menos um departamento que ele gerencia.
create policy "Gerentes can update own clientes"
  on public.clientes for update
  to authenticated
  using (
    public.is_gerente_ativo()
    and exists (
      select 1 from public.cliente_departamentos cd
      where cd.cliente_id = clientes.id and public.is_gerente_do_departamento(cd.departamento_id)
    )
  )
  with check (
    public.is_gerente_ativo()
    and exists (
      select 1 from public.cliente_departamentos cd
      where cd.cliente_id = clientes.id and public.is_gerente_do_departamento(cd.departamento_id)
    )
  );

-- Virada mensal agora respeita o vínculo cliente x departamento — só cria
-- tarefa para as combinações realmente vinculadas, não um cross join cego.
create or replace function public.executar_virada_mensal(
  p_competencia date default null,
  p_executado_por uuid default null
)
returns public.virada_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competencia date := coalesce(p_competencia, date_trunc('month', now())::date);
  v_linhas integer := 0;
  v_log public.virada_log;
begin
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores)
  select cd.cliente_id, cd.departamento_id, v_competencia, '{}'::jsonb
  from public.cliente_departamentos cd
  join public.clientes c on c.id = cd.cliente_id
  join public.departamentos d on d.id = cd.departamento_id
  where c.status = 'ativo' and d.status = 'ativo'
  on conflict (cliente_id, departamento_id, competencia) do nothing;

  get diagnostics v_linhas = row_count;

  insert into public.virada_log (competencia, status, linhas_criadas, executado_por)
  values (v_competencia, 'sucesso', v_linhas, p_executado_por)
  returning * into v_log;

  return v_log;
exception when others then
  insert into public.virada_log (competencia, status, mensagem, executado_por)
  values (v_competencia, 'erro', sqlerrm, p_executado_por)
  returning * into v_log;
  return v_log;
end;
$$;
