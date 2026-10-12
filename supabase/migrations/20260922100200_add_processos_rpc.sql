-- criar_processo: insere processo + copia etapas_modelo -> processo_etapas +
-- cria processo_taxas_jucemg pra toda etapa copiada com trava_por_taxa_jucemg
-- + grava evento inicial, tudo atômico. NÃO security definer — roda com o
-- RLS de quem chama (mesmo modo de upsert_tarefa_valor em
-- 20260912150001_funcionarios_virada_e_upserts.sql), já que é uma ação de
-- usuário normal, não uma rotina batch/cron.
create function public.criar_processo(
  p_departamento_id uuid,
  p_tipo_processo_id uuid,
  p_titulo text,
  p_prioridade public.processo_prioridade,
  p_responsavel_id uuid,
  p_prazo_final date,
  p_cliente_id uuid default null,
  p_cliente_nome_avulso text default null,
  p_data_abertura date default current_date,
  p_protocolo_geral text default null,
  p_observacoes text default null
)
returns public.processos
language plpgsql
as $$
declare
  v_processo public.processos;
  v_modelo record;
  v_etapa_id uuid;
begin
  if p_cliente_id is null and coalesce(trim(p_cliente_nome_avulso), '') = '' then
    raise exception 'Informe um cliente cadastrado ou o nome da empresa.';
  end if;

  insert into public.processos (
    departamento_id, tipo_processo_id, cliente_id, cliente_nome_avulso, titulo,
    prioridade, responsavel_id, criado_por, prazo_final, data_abertura,
    protocolo_geral, observacoes
  ) values (
    p_departamento_id, p_tipo_processo_id, p_cliente_id, nullif(trim(p_cliente_nome_avulso), ''),
    p_titulo, p_prioridade, p_responsavel_id, auth.uid(), p_prazo_final, p_data_abertura,
    nullif(trim(p_protocolo_geral), ''), nullif(trim(p_observacoes), '')
  )
  returning * into v_processo;

  for v_modelo in
    select id, nome, ordem, trava_por_taxa_jucemg from public.etapas_modelo
    where tipo_processo_id = p_tipo_processo_id and status = 'ativo'
    order by ordem
  loop
    insert into public.processo_etapas (processo_id, etapa_modelo_id, nome, ordem, trava_por_taxa_jucemg)
    values (v_processo.id, v_modelo.id, v_modelo.nome, v_modelo.ordem, v_modelo.trava_por_taxa_jucemg)
    returning id into v_etapa_id;

    if v_modelo.trava_por_taxa_jucemg then
      insert into public.processo_taxas_jucemg (processo_etapa_id) values (v_etapa_id);
    end if;
  end loop;

  insert into public.processo_eventos (processo_id, descricao, criado_por)
  values (v_processo.id, 'Processo incluído — Serviço: ' || p_titulo, auth.uid());

  return v_processo;
end;
$$;
grant execute on function public.criar_processo to authenticated;

-- atualizar_status_processo_etapa: SECURITY DEFINER de propósito — é o único
-- caminho de escrita pra processo_etapas.status (não existe policy de UPDATE
-- pra essa tabela — ver migration anterior), então a regra "não sai de
-- pendente com taxa não paga/dispensada" não tem como ser contornada por um
-- .update() direto via supabase-js. A checagem de acesso ao departamento é
-- feita manualmente dentro da função (via pode_acessar_departamento), já
-- que rodando como definer o RLS de processo_etapas não filtra sozinho.
create function public.atualizar_status_processo_etapa(
  p_etapa_id uuid,
  p_status public.processo_etapa_status
)
returns public.processo_etapas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etapa public.processo_etapas;
  v_departamento_id uuid;
  v_taxa public.processo_taxas_jucemg;
begin
  select * into v_etapa from public.processo_etapas where id = p_etapa_id;
  if not found then
    raise exception 'Etapa não encontrada ou sem acesso.';
  end if;

  select departamento_id into v_departamento_id
  from public.processos where id = v_etapa.processo_id;

  if not public.pode_acessar_departamento(v_departamento_id) then
    raise exception 'Etapa não encontrada ou sem acesso.';
  end if;

  if v_etapa.trava_por_taxa_jucemg and p_status <> 'pendente' then
    select * into v_taxa from public.processo_taxas_jucemg where processo_etapa_id = p_etapa_id;
    if v_taxa is null or v_taxa.situacao not in ('paga', 'dispensada') then
      raise exception 'Etapa bloqueada: a Taxa JUCEMG precisa estar paga ou dispensada.';
    end if;
  end if;

  update public.processo_etapas
  set status = p_status,
      concluida_em = case when p_status = 'concluida' then now() else null end,
      updated_at = now()
  where id = p_etapa_id
  returning * into v_etapa;

  insert into public.processo_eventos (processo_id, descricao, criado_por)
  values (
    v_etapa.processo_id,
    'Etapa "' || v_etapa.nome || '" marcada como ' ||
      case p_status when 'pendente' then 'Pendente' when 'em_andamento' then 'Em andamento' else 'Concluída' end,
    auth.uid()
  );

  return v_etapa;
end;
$$;
grant execute on function public.atualizar_status_processo_etapa to authenticated;
