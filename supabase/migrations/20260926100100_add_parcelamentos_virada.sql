-- Virada mensal dos Parcelamentos — mesmo padrão da Virada Mensal da Tabela
-- de Tarefas (função SECURITY DEFINER agendada via pg_cron + log + botão de
-- forçar manual). Resolve o "precisamos ir replicando isso ao longo do
-- tempo" sem ninguém ter que lembrar de criar a guia do mês.
create table public.parcelamento_virada_log (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  status text not null check (status in ('sucesso', 'erro')),
  mensagem text,
  parcelas_criadas integer not null default 0,
  parcelamentos_perdidos integer not null default 0,
  parcelamentos_quitados integer not null default 0,
  executado_por uuid references public.profiles (id),
  executado_em timestamptz not null default now()
);

alter table public.parcelamento_virada_log enable row level security;

create policy "Admins can view parcelamento_virada_log"
  on public.parcelamento_virada_log for select
  using (public.is_admin());

grant select on public.parcelamento_virada_log to authenticated;
grant all on public.parcelamento_virada_log to service_role;

-- Pra cada parcelamento ativo, antes de gerar a guia do mês:
--   1. Se tem regra de tolerância e as últimas N competências já geradas
--      vieram todas sem pagamento, marca "perdido" e para de gerar guia
--      nova (é o caso do Simples: 3 meses sem pagar = perdeu a negociação).
--   2. Se já geraram guias pra todas as parcelas previstas
--      (quantidade_parcelas), para de gerar; se todas essas já estão pagas,
--      marca "quitado".
--   3. Senão, gera a guia da competência corrente, com o número de parcela
--      seguinte (parcela_inicial + quantas guias já existem).
-- Idempotente via unique(parcelamento_id, competencia) + ON CONFLICT.
create or replace function public.executar_virada_parcelamentos(
  p_competencia date default null,
  p_executado_por uuid default null
)
returns public.parcelamento_virada_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competencia date := coalesce(p_competencia, date_trunc('month', now())::date);
  v_criadas integer := 0;
  v_perdidos integer := 0;
  v_quitados integer := 0;
  v_log public.parcelamento_virada_log;
  r record;
  v_existentes integer;
  v_recentes_em_aberto integer;
  v_pagas integer;
begin
  for r in select * from public.parcelamentos where situacao = 'ativo' loop
    select count(*) into v_existentes
    from public.parcelamento_parcelas
    where parcelamento_id = r.id;

    if r.meses_tolerancia_inadimplencia is not null and v_existentes >= r.meses_tolerancia_inadimplencia then
      select count(*) into v_recentes_em_aberto
      from (
        select pago from public.parcelamento_parcelas
        where parcelamento_id = r.id
        order by competencia desc
        limit r.meses_tolerancia_inadimplencia
      ) recentes
      where pago = false;

      if v_recentes_em_aberto = r.meses_tolerancia_inadimplencia then
        update public.parcelamentos set situacao = 'perdido', updated_at = now() where id = r.id;
        v_perdidos := v_perdidos + 1;
        continue;
      end if;
    end if;

    if v_existentes >= r.quantidade_parcelas then
      select count(*) into v_pagas
      from public.parcelamento_parcelas
      where parcelamento_id = r.id and pago = true;

      if v_pagas >= r.quantidade_parcelas then
        update public.parcelamentos set situacao = 'quitado', updated_at = now() where id = r.id;
        v_quitados := v_quitados + 1;
      end if;
      continue;
    end if;

    insert into public.parcelamento_parcelas (parcelamento_id, competencia, numero_parcela)
    values (r.id, v_competencia, r.parcela_inicial + v_existentes)
    on conflict (parcelamento_id, competencia) do nothing;

    if found then
      v_criadas := v_criadas + 1;
    end if;
  end loop;

  insert into public.parcelamento_virada_log
    (competencia, status, parcelas_criadas, parcelamentos_perdidos, parcelamentos_quitados, executado_por)
  values (v_competencia, 'sucesso', v_criadas, v_perdidos, v_quitados, p_executado_por)
  returning * into v_log;

  return v_log;
exception when others then
  insert into public.parcelamento_virada_log (competencia, status, mensagem, executado_por)
  values (v_competencia, 'erro', sqlerrm, p_executado_por)
  returning * into v_log;
  return v_log;
end;
$$;

grant execute on function public.executar_virada_parcelamentos(date, uuid) to authenticated;

-- 00:15 do dia 1 — depois da Virada Mensal (00:05), evitando concorrência.
select cron.schedule(
  'virada-parcelamentos-contferr',
  '15 0 1 * *',
  $$select public.executar_virada_parcelamentos();$$
);
