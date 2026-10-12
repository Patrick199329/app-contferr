-- Corresponsável por cliente na Tabela de Tarefas: liberado por departamento
-- (não afeta os demais) e marcado numa coluna do tipo Responsável. O valor
-- dessa coluna é mantido nos meses seguintes pela virada.
alter table public.departamentos
  add column usa_corresponsavel boolean not null default false;

alter table public.colunas
  add column eh_corresponsavel boolean not null default false;

alter table public.colunas
  add constraint colunas_corresponsavel_tipo check (
    not eh_corresponsavel or (tipo = 'responsavel' and manter_valor_anterior)
  );

create function public.verificar_coluna_corresponsavel()
returns trigger
language plpgsql
as $$
begin
  if new.eh_corresponsavel and not exists (
    select 1 from public.departamentos d
    where d.id = new.departamento_id and d.usa_corresponsavel
  ) then
    raise exception 'Corresponsável não está liberado neste departamento.';
  end if;
  return new;
end;
$$;

create trigger colunas_verificar_corresponsavel
  before insert or update of eh_corresponsavel, departamento_id on public.colunas
  for each row execute function public.verificar_coluna_corresponsavel();

create function public.verificar_desliga_corresponsavel()
returns trigger
language plpgsql
as $$
begin
  if old.usa_corresponsavel and not new.usa_corresponsavel and exists (
    select 1 from public.colunas c
    where c.departamento_id = new.id and c.eh_corresponsavel
  ) then
    raise exception 'Desmarque as colunas de corresponsável antes de desligar esta opção.';
  end if;
  return new;
end;
$$;

create trigger departamentos_verificar_desliga_corresponsavel
  before update of usa_corresponsavel on public.departamentos
  for each row execute function public.verificar_desliga_corresponsavel();
