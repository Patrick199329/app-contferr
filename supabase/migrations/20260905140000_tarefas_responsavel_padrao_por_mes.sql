-- Responsável passa a ser um valor por competência (como qualquer coluna),
-- não só um atributo do cliente — assim o Histórico consegue mostrar um
-- retrato fiel de quem era responsável em cada mês, sem reescrever o
-- passado quando o responsável muda hoje. cliente_departamentos.
-- responsavel_padrao_id continua existindo como "o mais atual conhecido"
-- (mostrado no cadastro, sugerido no Quadro de Tarefas) — os dois ficam
-- sincronizados só em relação ao mês corrente, nunca retroativamente.
alter table public.tarefas
  add column responsavel_padrao_id uuid references public.profiles (id) on delete set null;

-- Reescreve a virada mensal (2ª reescrita desde a criação): além de herdar
-- "Não se aplica" dos checklists, agora também herda o responsável do mês
-- anterior. Troquei a subquery correlacionada do checklist por um left join
-- em "anterior" pra poder reaproveitar a mesma linha nas duas heranças, e
-- pra distinguir "mês anterior existe mas está sem responsável" (deve
-- herdar em branco) de "não existe mês anterior" (aí sim cai pro cadastro).
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
