-- Reforça no banco a mesma regra já aplicada na UI (components/coluna-form.tsx):
-- "manter_valor_anterior" só é respeitado pra tipos de coluna cujo valor é um
-- dado cadastral que tende a se repetir (texto, lista_opcoes, status,
-- responsavel). Checklist fica de fora mesmo que o campo seja marcado por
-- algum motivo fora da UI — ele já tem sua própria herança, só do estado
-- "não se aplica", nunca do valor completo (senão uma tarefa nasceria
-- "Feito" no início do mês sem ninguém ter feito nada). Campo do funcionário
-- já é sempre lido ao vivo do cadastro, então também fica de fora.
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
  -- Parte 1: departamentos sem funcionários, OU clientes de um departamento
  -- "usa_funcionarios" que não têm nenhum funcionário ativo cadastrado (ficam
  -- com 1 linha por cliente, como antes).
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
    and anterior.funcionario_id is null
  where c.status = 'ativo' and d.status = 'ativo'
    and (
      not d.usa_funcionarios
      or not exists (
        select 1 from public.funcionarios f
        where f.cliente_id = cd.cliente_id and f.status = 'ativo'
      )
    )
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
