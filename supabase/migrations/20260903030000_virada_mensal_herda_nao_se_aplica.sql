-- Colunas tipo checklist marcadas "Não se aplica" passam a persistir nos
-- meses seguintes automaticamente na virada mensal, em vez de nascer sempre
-- vazias ("Pendente") — evita que alguém inicie um serviço desnecessário só
-- porque a tela "esqueceu" a decisão do mês anterior. Basta olhar a linha do
-- mês N-1: se ela tiver 'nao_se_aplica' numa coluna checklist ativa, a linha
-- nova do mês N já nasce com essa mesma chave/valor; senão nasce vazia como
-- hoje. Quando o usuário mudar o valor do mês corrente pra outro estado, a
-- próxima virada simplesmente não encontra mais 'nao_se_aplica' no mês
-- anterior e a linha seguinte volta a nascer vazia — sem lógica extra de
-- "desligar", e sem tocar em nenhuma linha já existente (viradas só inserem).
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
  insert into public.tarefas (cliente_id, departamento_id, competencia, valores)
  select
    cd.cliente_id,
    cd.departamento_id,
    v_competencia,
    coalesce(
      (
        select jsonb_object_agg(col.id::text, 'nao_se_aplica')
        from public.colunas col
        join public.tarefas anterior
          on anterior.cliente_id = cd.cliente_id
          and anterior.departamento_id = cd.departamento_id
          and anterior.competencia = (v_competencia - interval '1 month')::date
        where col.departamento_id = cd.departamento_id
          and col.status = 'ativo'
          and col.tipo = 'checklist'
          and anterior.valores ->> col.id::text = 'nao_se_aplica'
      ),
      '{}'::jsonb
    )
  from public.cliente_departamentos cd
  join public.clientes c on c.id = cd.cliente_id
  join public.departamentos d on d.id = cd.departamento_id
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
