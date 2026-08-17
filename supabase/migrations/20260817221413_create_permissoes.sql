-- Módulo 5 / Fase 3.2: liberação de departamento por Usuário Final.
-- Modelo binário (liberado/bloqueado), não visualizar/editar separado —
-- essa distinção segue em aberto na especificação funcional (⚠️ a confirmar
-- com o cliente); o critério de aceite da Fase 3.2 só cobre liberar/revogar.
-- Administrador nunca passa por esta tabela: tem acesso irrestrito sempre.

create table public.permissoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  departamento_id uuid not null references public.departamentos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, departamento_id)
);

alter table public.permissoes enable row level security;

create policy "Users can view own permissoes"
  on public.permissoes for select
  using (auth.uid() = usuario_id);

create policy "Admins can manage all permissoes"
  on public.permissoes for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, delete on public.permissoes to authenticated;
grant all on public.permissoes to service_role;

-- Nota: o filtro de departamento por permissão é aplicado na aplicação
-- (Tabela de Tarefas / Histórico), não em RLS de tarefas/colunas ainda.
-- O alinhamento de RLS com o modelo de permissões completo é tarefa da
-- Fase 6.1, conforme já previsto no backlog.
