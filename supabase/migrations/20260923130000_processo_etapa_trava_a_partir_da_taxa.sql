-- Ajuste pedido: a trava sequencial da migration anterior
-- (20260923120000) era rígida demais — exigia TODA etapa anterior concluída
-- pra qualquer etapa avançar, mesmo sem relação com taxa nenhuma. A regra
-- certa: etapas antes de uma trava por taxa JUCEMG podem ser feitas em
-- qualquer ordem, livremente; só a partir da etapa que tem a trava (e as
-- etapas depois dela) ficam bloqueadas enquanto essa taxa não for resolvida.
-- Ou seja: uma etapa só é bloqueada se existir alguma etapa ANTERIOR travada
-- por taxa que ainda não está concluída (e uma etapa travada por taxa só
-- fica "concluída" depois de paga/dispensada, já garantido pela checagem
-- de taxa logo abaixo) — não mais "toda etapa anterior precisa estar feita".
create or replace function public.atualizar_status_processo_etapa(
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

  if p_status <> 'pendente' then
    if exists (
      select 1 from public.processo_etapas anterior
      where anterior.processo_id = v_etapa.processo_id
        and anterior.ordem < v_etapa.ordem
        and anterior.trava_por_taxa_jucemg
        and anterior.status <> 'concluida'
    ) then
      raise exception 'Etapa bloqueada: existe uma etapa anterior aguardando a Taxa JUCEMG.';
    end if;
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
      case p_status
        when 'pendente' then 'Pendente'
        when 'em_andamento' then 'Em andamento'
        else 'Concluída'
      end,
    auth.uid()
  );

  return v_etapa;
end;
$$;

create or replace function public.atualizar_processo_etapa_detalhes(
  p_etapa_id uuid,
  p_status public.processo_etapa_status,
  p_prazo date default null,
  p_responsavel_id uuid default null,
  p_protocolo text default null,
  p_observacoes text default null
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

  if p_status <> 'pendente' then
    if exists (
      select 1 from public.processo_etapas anterior
      where anterior.processo_id = v_etapa.processo_id
        and anterior.ordem < v_etapa.ordem
        and anterior.trava_por_taxa_jucemg
        and anterior.status <> 'concluida'
    ) then
      raise exception 'Etapa bloqueada: existe uma etapa anterior aguardando a Taxa JUCEMG.';
    end if;
  end if;

  if v_etapa.trava_por_taxa_jucemg and p_status <> 'pendente' then
    select * into v_taxa from public.processo_taxas_jucemg where processo_etapa_id = p_etapa_id;
    if v_taxa is null or v_taxa.situacao not in ('paga', 'dispensada') then
      raise exception 'Etapa bloqueada: a Taxa JUCEMG precisa estar paga ou dispensada.';
    end if;
  end if;

  update public.processo_etapas
  set status = p_status,
      prazo = p_prazo,
      responsavel_id = p_responsavel_id,
      protocolo = nullif(trim(p_protocolo), ''),
      observacoes = nullif(trim(p_observacoes), ''),
      concluida_em = case when p_status = 'concluida' then now() else null end,
      updated_at = now()
  where id = p_etapa_id
  returning * into v_etapa;

  insert into public.processo_eventos (processo_id, descricao, criado_por)
  values (v_etapa.processo_id, 'Etapa "' || v_etapa.nome || '" atualizada', auth.uid());

  return v_etapa;
end;
$$;
