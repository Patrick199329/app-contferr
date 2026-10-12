-- Ajuste de design: a URL da coluna "link" não é mais digitada por linha —
-- é fixa, configurada uma vez junto com o ícone (ex.: "Portal de emissão de
-- guia" aponta sempre pro mesmo endereço, pra todo cliente/mês). Nas janelas
-- de uso (Tabela de Tarefas/Histórico) só aparece o ícone, clicável.
alter table public.colunas add column link_url text;

-- "Manter valor do mês anterior" não faz mais sentido pra link — não existe
-- mais um valor por linha/mês pra herdar, a URL já é fixa na própria coluna.
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
