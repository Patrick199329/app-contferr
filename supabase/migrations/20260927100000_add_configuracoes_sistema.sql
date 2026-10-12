-- Configurações operacionais do sistema (Painel Administrativo > Configurações)
-- — mesma ideia de configuracoes_marca (tabela singleton), mas pra regras de
-- negócio em vez de aparência. Primeira: até quantos meses antes do atual a
-- Tabela de Tarefas deixa editar — pedido de departamentos cujo ciclo
-- interno não vira junto com o calendário. 0 preserva o comportamento
-- anterior (só o mês corrente), então nada muda pra ninguém até o admin
-- decidir abrir a janela.
create table public.configuracoes_sistema (
  id boolean primary key default true check (id),
  tarefas_meses_edicao_retroativa integer not null default 0 check (tarefas_meses_edicao_retroativa >= 0),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.configuracoes_sistema (id) values (true);

alter table public.configuracoes_sistema enable row level security;

-- Todo usuário logado precisa ler isso pra saber até onde pode editar na
-- Tabela de Tarefas — não é uma tela admin-only por natureza dos dados.
create policy "Authenticated users can view configuracoes_sistema"
  on public.configuracoes_sistema for select
  to authenticated
  using (true);

create policy "Admins can manage configuracoes_sistema"
  on public.configuracoes_sistema for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.configuracoes_sistema to authenticated;
grant all on public.configuracoes_sistema to service_role;
