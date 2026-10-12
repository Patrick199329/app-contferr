-- Reverte a granularidade "1 linha por funcionário" da Tabela de Tarefas
-- (introduzida em 20260912150000 e seguintes) — o DP confirmou que a
-- apuração mensal é sempre por cliente (empregador), nunca por funcionário
-- individual. `funcionarios` continua existindo como cadastro simples
-- (nome + CPF) dentro da ficha do cliente, só sai do meio da Tabela de
-- Tarefas.

-- Descarta as guias de teste já geradas em duplicidade por funcionário —
-- não dá pra fundir de forma segura valores que podem ter sido preenchidos
-- diferente pra cada funcionário do mesmo cliente/mês, e é dado de teste do
-- módulo (nenhum departamento em produção real usava isso além do piloto).
delete from public.tarefas where funcionario_id is not null;

drop index public.tarefas_com_funcionario_key;
drop index public.tarefas_sem_funcionario_key;
alter table public.tarefas drop column funcionario_id;
alter table public.tarefas
  add constraint tarefas_cliente_id_departamento_id_competencia_key
  unique (cliente_id, departamento_id, competencia);

-- upsert_tarefa_valor e upsert_responsavel_padrao_mes voltam a não ter
-- p_funcionario_id — precisa de "drop" explícito porque tirar um parâmetro
-- muda a assinatura (cria sobrecarga em vez de substituir).
drop function public.upsert_tarefa_valor(uuid, uuid, date, uuid, jsonb, uuid, uuid);
create function public.upsert_tarefa_valor(
  p_cliente_id uuid,
  p_departamento_id uuid,
  p_competencia date,
  p_coluna_id uuid,
  p_valor jsonb,
  p_user_id uuid
)
returns void
language plpgsql
as $$
begin
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores, updated_by, updated_at)
  values (
    p_cliente_id,
    p_departamento_id,
    p_competencia,
    jsonb_build_object(p_coluna_id::text, p_valor),
    p_user_id,
    now()
  )
  on conflict (cliente_id, departamento_id, competencia)
  do update set
    valores = tarefas.valores || jsonb_build_object(p_coluna_id::text, p_valor),
    updated_by = p_user_id,
    updated_at = now();
end;
$$;
grant execute on function public.upsert_tarefa_valor(uuid, uuid, date, uuid, jsonb, uuid) to authenticated;

drop function public.upsert_responsavel_padrao_mes(uuid, uuid, date, uuid, uuid);
create function public.upsert_responsavel_padrao_mes(
  p_cliente_id uuid,
  p_departamento_id uuid,
  p_competencia date,
  p_responsavel_id uuid
)
returns void
language plpgsql
as $$
begin
  insert into public.tarefas (cliente_id, departamento_id, competencia, responsavel_padrao_id)
  values (p_cliente_id, p_departamento_id, p_competencia, p_responsavel_id)
  on conflict (cliente_id, departamento_id, competencia)
  do update set responsavel_padrao_id = p_responsavel_id;
end;
$$;
grant execute on function public.upsert_responsavel_padrao_mes(uuid, uuid, date, uuid) to authenticated;

-- Desativa as colunas "campo_funcionario" já criadas (o histórico gravado em
-- tarefas.valores continua intacto, só param de aparecer nas telas) — o
-- valor do enum coluna_tipo em si permanece no schema sem uso, recriar o
-- tipo pra removê-lo seria um custo só cosmético.
update public.colunas set status = 'inativo', updated_at = now() where tipo = 'campo_funcionario';

-- Virada mensal volta a criar sempre 1 linha por cliente, sem branch de
-- funcionário — mesma lógica da Parte 1 anterior (herda "não se aplica" do
-- checklist e "manter valor anterior"), sem a Parte 2.
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
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores, responsavel_padrao_id)
  select
    cd.cliente_id,
    cd.departamento_id,
    v_competencia,
    coalesce(
      (
        select jsonb_object_agg(
          col.id::text,
          case when col.tipo = 'checklist' then 'nao_se_aplica' else anterior.valores ->> col.id::text end
        )
        from public.colunas col
        where col.departamento_id = cd.departamento_id
          and col.status = 'ativo'
          and (
            (col.tipo = 'checklist' and anterior.valores ->> col.id::text = 'nao_se_aplica')
            or (
              col.manter_valor_anterior
              and col.tipo in ('texto', 'lista_opcoes', 'status', 'responsavel')
              and anterior.valores ? col.id::text
            )
          )
      ),
      '{}'::jsonb
    ),
    case when anterior.id is not null then anterior.responsavel_padrao_id else cd.responsavel_padrao_id end
  from public.cliente_departamentos cd
  join public.clientes c on c.id = cd.cliente_id
  join public.departamentos d on d.id = cd.departamento_id
  left join public.tarefas anterior
    on anterior.cliente_id = cd.cliente_id
    and anterior.departamento_id = cd.departamento_id
    and anterior.competencia = (v_competencia - interval '1 month')::date
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
