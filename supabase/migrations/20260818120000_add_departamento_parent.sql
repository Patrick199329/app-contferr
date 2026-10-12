-- Subdepartamentos: um departamento pode agrupar "filhos" (ex.: Departamento
-- "Lucro Real/Presumido" com os filhos "Lucro Real" e "Lucro Presumido").
-- Cada filho é um departamento normal — tem suas próprias colunas e tarefas,
-- exatamente como hoje. parent_id só existe para agrupar visualmente e para
-- herança de permissão (abaixo). Só um nível é permitido: um filho não pode
-- ter filhos.

alter table public.departamentos
  add column parent_id uuid references public.departamentos (id) on delete set null;

create index departamentos_parent_id_idx on public.departamentos (parent_id);

create function public.enforce_departamento_single_level()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Um departamento não pode ser pai de si mesmo.';
    end if;
    if exists (
      select 1 from public.departamentos where id = new.parent_id and parent_id is not null
    ) then
      raise exception 'Só é permitido um nível de subdepartamentos.';
    end if;
    if exists (select 1 from public.departamentos where parent_id = new.id) then
      raise exception
        'Este departamento já tem subdepartamentos e não pode virar subdepartamento de outro.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_departamentos_single_level
  before insert or update of parent_id on public.departamentos
  for each row execute function public.enforce_departamento_single_level();

-- Gerente do departamento X: agora também vale se o gerente for do
-- departamento PAI de X — permissão concedida no pai cobre todos os filhos.
create or replace function public.is_gerente_do_departamento(p_departamento_id uuid)
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
    join public.departamentos d on d.id = p_departamento_id
    where pr.id = auth.uid()
      and pr.role = 'gerente'
      and pr.status = 'ativo'
      and (perm.departamento_id = p_departamento_id or perm.departamento_id = d.parent_id)
  );
$$;
