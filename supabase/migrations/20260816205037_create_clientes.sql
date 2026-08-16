-- Módulo 1: Cadastro de Clientes.
-- cnpj é guardado só com dígitos (14 caracteres); a máscara é responsabilidade da UI.

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null unique check (cnpj ~ '^\d{14}$'),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

-- Visualização: qualquer usuário autenticado (a restrição por departamento
-- do Módulo 5 se aplica às tarefas, não ao cadastro central de clientes).
create policy "Authenticated users can view clientes"
  on public.clientes for select
  to authenticated
  using (true);

-- Cadastrar/editar/desativar clientes é exclusivo do Administrador.
create policy "Admins can manage clientes"
  on public.clientes for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.clientes to authenticated;
grant all on public.clientes to service_role;
