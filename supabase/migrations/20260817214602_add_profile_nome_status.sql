-- Fase 3.1: gestão de usuários precisa de nome e de um status para
-- desativação (não exclusão), como já vale para as outras entidades.

alter table public.profiles add column nome text not null default '';
alter table public.profiles add column status text not null default 'ativo' check (status in ('ativo', 'inativo'));

-- Repropaga o nome vindo do metadata do Auth (definido em admin.createUser)
-- para dentro de profiles no momento da criação do usuário.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nome', ''), 'usuario_final');
  return new;
end;
$$;
