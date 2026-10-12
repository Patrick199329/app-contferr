-- Ajusta as funções que dependiam da constraint única antiga de `tarefas`
-- (substituída por dois índices parciais na migration anterior) e ensina a
-- virada mensal a criar 1 linha por funcionário ativo nos departamentos que
-- usam essa granularidade, incluindo o retrato inicial das colunas
-- "campo_funcionario" (puxadas do cadastro no momento da virada).

-- upsert_tarefa_valor ganha um parâmetro opcional p_funcionario_id: quando
-- presente, o conflito é resolvido pelo índice parcial de funcionário; sem
-- ele, continua exatamente como antes (índice parcial "sem funcionário").
-- Precisa de "drop" explícito porque mudar a assinatura (parâmetro novo)
-- faz o Postgres criar uma sobrecarga em vez de substituir a função antiga.
drop function public.upsert_tarefa_valor(uuid, uuid, date, uuid, jsonb, uuid);

create function public.upsert_tarefa_valor(
  p_cliente_id uuid,
  p_departamento_id uuid,
  p_competencia date,
  p_coluna_id uuid,
  p_valor jsonb,
  p_user_id uuid,
  p_funcionario_id uuid default null
)
returns void
language plpgsql
as $$
begin
  if p_funcionario_id is null then
    insert into public.tarefas (cliente_id, departamento_id, competencia, valores, updated_by, updated_at)
    values (
      p_cliente_id,
      p_departamento_id,
      p_competencia,
      jsonb_build_object(p_coluna_id::text, p_valor),
      p_user_id,
      now()
    )
    on conflict (cliente_id, departamento_id, competencia) where funcionario_id is null
    do update set
      valores = tarefas.valores || jsonb_build_object(p_coluna_id::text, p_valor),
      updated_by = p_user_id,
      updated_at = now();
  else
    insert into public.tarefas (cliente_id, departamento_id, competencia, valores, updated_by, updated_at, funcionario_id)
    values (
      p_cliente_id,
      p_departamento_id,
      p_competencia,
      jsonb_build_object(p_coluna_id::text, p_valor),
      p_user_id,
      now(),
      p_funcionario_id
    )
    on conflict (funcionario_id, departamento_id, competencia) where funcionario_id is not null
    do update set
      valores = tarefas.valores || jsonb_build_object(p_coluna_id::text, p_valor),
      updated_by = p_user_id,
      updated_at = now();
  end if;
end;
$$;

-- Novo: mesma ideia, mas pro campo responsavel_padrao_id (usado tanto pelo
-- espelhamento cadastro -> mês corrente quanto pela edição direto na Tabela
-- de Tarefas). O Supabase JS .upsert() não consegue mirar um índice
-- parcial, então essas duas gravações passam a chamar esta função em vez de
-- .upsert() direto.
create or replace function public.upsert_responsavel_padrao_mes(
  p_cliente_id uuid,
  p_departamento_id uuid,
  p_competencia date,
  p_responsavel_id uuid,
  p_funcionario_id uuid default null
)
returns void
language plpgsql
as $$
begin
  if p_funcionario_id is null then
    insert into public.tarefas (cliente_id, departamento_id, competencia, responsavel_padrao_id)
    values (p_cliente_id, p_departamento_id, p_competencia, p_responsavel_id)
    on conflict (cliente_id, departamento_id, competencia) where funcionario_id is null
    do update set responsavel_padrao_id = p_responsavel_id;
  else
    insert into public.tarefas (cliente_id, departamento_id, competencia, responsavel_padrao_id, funcionario_id)
    values (p_cliente_id, p_departamento_id, p_competencia, p_responsavel_id, p_funcionario_id)
    on conflict (funcionario_id, departamento_id, competencia) where funcionario_id is not null
    do update set responsavel_padrao_id = p_responsavel_id;
  end if;
end;
$$;

grant execute on function public.upsert_tarefa_valor to authenticated;
grant execute on function public.upsert_responsavel_padrao_mes to authenticated;

-- Virada mensal: agora em duas partes. Departamentos sem usa_funcionarios
-- seguem exatamente como antes (1 linha por cliente). Departamentos com
-- usa_funcionarios criam 1 linha por funcionário ativo do cliente, herdando
-- responsável/checklist "não se aplica" do mês anterior do MESMO
-- funcionário (não do cliente) e gravando o retrato inicial de toda coluna
-- "campo_funcionario" ativa (puxado do cadastro no momento da virada — dali
-- em diante o mês corrente sempre lê ao vivo do cadastro, só o retrato da
-- virada fica congelado pro Histórico).
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
  v_linhas_funcionario integer := 0;
  v_log public.virada_log;
begin
  -- Parte 1: departamentos sem funcionários (inalterado).
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores, responsavel_padrao_id)
  select
    cd.cliente_id,
    cd.departamento_id,
    v_competencia,
    coalesce(
      (
        select jsonb_object_agg(col.id::text, 'nao_se_aplica')
        from public.colunas col
        where col.departamento_id = cd.departamento_id
          and col.status = 'ativo'
          and col.tipo = 'checklist'
          and anterior.valores ->> col.id::text = 'nao_se_aplica'
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
    and anterior.funcionario_id is null
  where c.status = 'ativo' and d.status = 'ativo' and not d.usa_funcionarios
  on conflict (cliente_id, departamento_id, competencia) where funcionario_id is null do nothing;

  get diagnostics v_linhas = row_count;

  -- Parte 2: departamentos com funcionários — 1 linha por funcionário ativo.
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores, responsavel_padrao_id, funcionario_id)
  select
    cd.cliente_id,
    cd.departamento_id,
    v_competencia,
    coalesce(
      (
        select jsonb_object_agg(
          col.id::text,
          case col.campo_funcionario_alvo
            when 'nome' then f.nome
            when 'cpf' then f.cpf
            when 'senha_gov' then f.senha_gov
            when 'codigo_acesso' then f.codigo_acesso
            when 'senha' then f.senha
          end
        )
        from public.colunas col
        where col.departamento_id = cd.departamento_id
          and col.status = 'ativo'
          and col.tipo = 'campo_funcionario'
      ),
      '{}'::jsonb
    ) || coalesce(
      (
        select jsonb_object_agg(col.id::text, 'nao_se_aplica')
        from public.colunas col
        where col.departamento_id = cd.departamento_id
          and col.status = 'ativo'
          and col.tipo = 'checklist'
          and anterior.valores ->> col.id::text = 'nao_se_aplica'
      ),
      '{}'::jsonb
    ),
    case when anterior.id is not null then anterior.responsavel_padrao_id else cd.responsavel_padrao_id end,
    f.id
  from public.cliente_departamentos cd
  join public.clientes c on c.id = cd.cliente_id
  join public.departamentos d on d.id = cd.departamento_id
  join public.funcionarios f on f.cliente_id = cd.cliente_id and f.status = 'ativo'
  left join public.tarefas anterior
    on anterior.funcionario_id = f.id
    and anterior.departamento_id = cd.departamento_id
    and anterior.competencia = (v_competencia - interval '1 month')::date
  where c.status = 'ativo' and d.status = 'ativo' and d.usa_funcionarios
  on conflict (funcionario_id, departamento_id, competencia) where funcionario_id is not null do nothing;

  get diagnostics v_linhas_funcionario = row_count;
  v_linhas := v_linhas + v_linhas_funcionario;

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
