-- Número sequencial da tarefa (visível pra todos, mostrado na última coluna
-- da lista) — só um identificador curto pra referenciar a tarefa em
-- conversa, não confundir com o id (uuid) interno.
alter table public.quadro_tarefas add column numero bigint generated always as identity;

-- Ao concluir uma tarefa recorrente, gera a próxima ocorrência na hora — não
-- precisa esperar o cron diário rodar. Igual a gerar_tarefas_recorrentes,
-- mas pra uma recorrência específica e sem checar se a data já venceu.
create or replace function public.gerar_proxima_ocorrencia(p_recorrencia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.quadro_tarefas_recorrencias;
begin
  select * into r from public.quadro_tarefas_recorrencias where id = p_recorrencia_id and ativa;
  if not found then
    return;
  end if;

  if not public.pode_acessar_departamento(r.departamento_id) then
    return;
  end if;

  insert into public.quadro_tarefas
    (departamento_id, cliente_id, titulo, descricao, responsavel_id, criado_por, prazo, recorrencia_id)
  values
    (r.departamento_id, r.cliente_id, r.titulo, r.descricao, r.responsavel_id, r.criado_por, r.proxima_data, r.id);

  update public.quadro_tarefas_recorrencias
  set proxima_data = case r.frequencia
      when 'diaria' then r.proxima_data + (r.intervalo::text || ' days')::interval
      when 'semanal' then r.proxima_data + (r.intervalo::text || ' weeks')::interval
      when 'mensal' then r.proxima_data + (r.intervalo::text || ' months')::interval
    end,
    updated_at = now()
  where id = r.id;
end;
$$;

grant execute on function public.gerar_proxima_ocorrencia(uuid) to authenticated;
