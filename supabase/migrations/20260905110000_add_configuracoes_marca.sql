-- Configurações de aparência (Painel Administrativo > Aparência): cor do
-- cabeçalho, cor do menu selecionado, logo e favicon — editáveis pelo
-- admin, sem precisar mexer em código. Tabela singleton (o "id boolean ...
-- check (id)" só permite existir a linha id=true, então nunca há disputa
-- sobre "qual linha é a de verdade").
create table public.configuracoes_marca (
  id boolean primary key default true check (id),
  cor_cabecalho text,
  cor_menu_selecionado text,
  logo_url text,
  favicon_url text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.configuracoes_marca (id) values (true);

alter table public.configuracoes_marca enable row level security;

-- Leitura liberada até pra quem não fez login: a tela de login também
-- mostra o logo/cores configurados, antes de qualquer autenticação.
create policy "Anyone can view configuracoes_marca"
  on public.configuracoes_marca for select
  to anon, authenticated
  using (true);

create policy "Admins can manage configuracoes_marca"
  on public.configuracoes_marca for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.configuracoes_marca to anon;
grant select, update on public.configuracoes_marca to authenticated;
grant all on public.configuracoes_marca to service_role;
