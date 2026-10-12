-- Periodicidade de colunas: nem toda obrigação é mensal (algumas são
-- trimestrais, semestrais ou anuais). O admin marca manualmente em quais
-- meses a coluna aparece — sem cálculo automático de cadência. É só regra de
-- exibição: a tabela `tarefas` já guarda os valores num JSONB por coluna
-- dentro de uma linha por cliente×departamento×competência, não existe linha
-- por coluna, então a Virada Mensal não precisa mudar em nada.

create type public.coluna_periodicidade as enum ('mensal', 'trimestral', 'semestral', 'anual');

alter table public.colunas
  add column periodicidade public.coluna_periodicidade not null default 'mensal',
  add column meses_aplicaveis integer[] not null default '{}';

alter table public.colunas
  add constraint colunas_meses_aplicaveis_check
  check (meses_aplicaveis <@ array[1,2,3,4,5,6,7,8,9,10,11,12]);
