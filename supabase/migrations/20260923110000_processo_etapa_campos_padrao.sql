-- Campos padrão que se repetem em toda etapa de processo (vistos no
-- protótipo ao clicar/expandir uma etapa): além do prazo (já existia),
-- Responsável, Protocolo e Observações. Diferente do protótipo (que trata
-- "Responsável" como texto livre), aqui ele é um vínculo real com profiles —
-- mesmo padrão já usado em processos.responsavel_id, pra não fragmentar
-- "quem é responsável" em representações inconsistentes pelo sistema.
alter table public.processo_etapas
  add column responsavel_id uuid references public.profiles (id) on delete set null,
  add column protocolo text,
  add column observacoes text;

create index processo_etapas_responsavel_id_idx on public.processo_etapas (responsavel_id);

-- atualizar_processo_etapa_detalhes: caminho de escrita pro formulário
-- expandido da etapa (Prazo, Responsável, Protocolo, Status, Observações,
-- todos salvos juntos). Igual atualizar_status_processo_etapa, roda security
-- definer e é o único jeito de gravar nessas colunas — não existe policy de
-- UPDATE em processo_etapas (ver 20260922100100_add_processos_dados.sql),
-- então a checagem da trava por taxa JUCEMG continua valendo mesmo pra esse
-- caminho novo. Mantida como função separada (em vez de estender a
-- existente) pra não arriscar o fluxo do seletor rápido de status, que já
-- está em produção testado.
create function public.atualizar_processo_etapa_detalhes(
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

grant execute on function public.atualizar_processo_etapa_detalhes to authenticated;
