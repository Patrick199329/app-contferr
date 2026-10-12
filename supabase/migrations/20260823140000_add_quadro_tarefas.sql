-- Quadro de Tarefas (Fase 1): gestão de tarefas avulsas por departamento,
-- independente do ciclo de competência mensal da Tabela de Tarefas. Opcional
-- por departamento — cada um liga a Tabela de Tarefas, o Quadro, ou ambos.

alter table public.departamentos
  add column usa_tarefas_padrao boolean not null default true,
  add column usa_quadro_tarefas boolean not null default false;

create type public.quadro_tarefa_status as enum ('a_fazer', 'em_andamento', 'concluida');

create table public.quadro_tarefas (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete set null,
  titulo text not null,
  descricao text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  criado_por uuid not null references public.profiles (id),
  prazo date,
  status public.quadro_tarefa_status not null default 'a_fazer',
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quadro_tarefas_departamento_id_idx on public.quadro_tarefas (departamento_id);
create index quadro_tarefas_responsavel_id_idx on public.quadro_tarefas (responsavel_id);
create index quadro_tarefas_cliente_id_idx on public.quadro_tarefas (cliente_id);

-- Generaliza a lógica de "permissão no departamento ou herdada do pai" (hoje
-- duplicada em JS em lib/supabase/permissoes.ts e, para gerente, na função
-- is_gerente_do_departamento) numa função reutilizável por RLS, cobrindo
-- qualquer role com acesso ao departamento — admin sempre, ou usuário com
-- permissão direta ou herdada do pai.
create function public.pode_acessar_departamento(p_departamento_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.profiles pr
      join public.permissoes perm on perm.usuario_id = pr.id
      join public.departamentos d on d.id = p_departamento_id
      where pr.id = auth.uid()
        and pr.status = 'ativo'
        and (perm.departamento_id = p_departamento_id or perm.departamento_id = d.parent_id)
    );
$$;

alter table public.quadro_tarefas enable row level security;

-- Isolamento por departamento desde o início (diferente da Tabela de Tarefas
-- original, cuja RLS ficou mais permissiva por decisão consciente de fases
-- anteriores — aqui já nasce restrito).
create policy "Users can view quadro_tarefas of accessible departamentos"
  on public.quadro_tarefas for select
  using (public.pode_acessar_departamento(departamento_id));

create policy "Users can create quadro_tarefas in accessible departamentos"
  on public.quadro_tarefas for insert
  with check (public.pode_acessar_departamento(departamento_id));

create policy "Users can update quadro_tarefas of accessible departamentos"
  on public.quadro_tarefas for update
  using (public.pode_acessar_departamento(departamento_id))
  with check (public.pode_acessar_departamento(departamento_id));

-- Sem policy de delete além de admin — mesma filosofia "desativar, não
-- excluir" do resto do projeto, aqui expressa via status em vez de remoção.
create policy "Admins can delete quadro_tarefas"
  on public.quadro_tarefas for delete
  using (public.is_admin());

grant select, insert, update, delete on public.quadro_tarefas to authenticated;
grant all on public.quadro_tarefas to service_role;
