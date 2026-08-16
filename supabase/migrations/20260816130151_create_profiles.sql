-- Perfis de acesso (Fase 1.3): Administrador e Usuário Final.
-- A distinção granular de departamentos (Módulo 5) chega em fases futuras;
-- por ora, apenas a role base que separa o painel administrativo do resto.

create type public.user_role as enum ('admin', 'usuario_final');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.user_role not null default 'usuario_final',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer para evitar recursão de RLS ao checar a própria tabela profiles
-- dentro de uma policy de profiles (padrão recomendado pelo Supabase).
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can manage all profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Cria automaticamente uma linha em profiles (role padrão usuario_final)
-- sempre que um novo usuário é criado em auth.users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'usuario_final');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A partir desta versão, novas tabelas não são mais expostas automaticamente
-- às roles da API (mesmo comportamento do Supabase Cloud) — GRANT é explícito.
-- RLS acima continua sendo quem decide o acesso linha a linha.
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
