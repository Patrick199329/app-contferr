-- Estrutura de departamentos/subdepartamentos definida pelo cliente pra
-- receber a carga real dos 700 clientes (planilha Alterdata) e suporte a CPF
-- (pessoa física) além de CNPJ.

-- Corrige o typo original do subdepartamento (a Receita e a planilha do
-- cliente grafam "Lucro Presumido", nunca "Luco").
update public.departamentos set nome = 'Lucro Presumido' where nome = 'Luco Presumido';

-- "Lucro Real/Presumido" e "DP" foram criados à mão pela UI, antes de
-- qualquer migration capturar isso — não existe INSERT deles no histórico.
-- Um id fixo aqui só valeria no banco onde foram criados originalmente;
-- numa instalação nova (nenhum dos dois existe ainda) isso quebraria com
-- violação de FK. Resolve pelo nome, criando os dois se ainda não existirem
-- (idempotente: não duplica em quem já os tem).
insert into public.departamentos (nome, parent_id, ordem, usa_tarefas_padrao, usa_quadro_tarefas)
select 'Lucro Real/Presumido', null, 0, true, true
where not exists (
  select 1 from public.departamentos where nome = 'Lucro Real/Presumido' and parent_id is null
);

insert into public.departamentos (nome, parent_id, ordem, usa_tarefas_padrao, usa_quadro_tarefas)
select 'DP', null, 1, true, false
where not exists (
  select 1 from public.departamentos where nome = 'DP' and parent_id is null
);

-- Mais 5 subdepartamentos de "Lucro Real/Presumido".
insert into public.departamentos (nome, parent_id, ordem, usa_tarefas_padrao, usa_quadro_tarefas)
select v.nome, pai.id, v.ordem, true, false
from (values
  ('Sem obrigatoriedade', 2),
  ('Imunes/Isentas', 3),
  ('Associação', 4),
  ('Consórcio', 5),
  ('Cooperativa', 6)
) as v(nome, ordem)
cross join (select id from public.departamentos where nome = 'Lucro Real/Presumido' and parent_id is null) as pai;

-- Subdepartamentos de "DP".
insert into public.departamentos (nome, parent_id, ordem, usa_tarefas_padrao, usa_quadro_tarefas)
select v.nome, pai.id, v.ordem, true, false
from (values ('Divisão', 0), ('Doméstica', 1)) as v(nome, ordem)
cross join (select id from public.departamentos where nome = 'DP' and parent_id is null) as pai;

-- Departamento novo "Simples Nacional" + subdepartamentos.
insert into public.departamentos (id, nome, parent_id, ordem, usa_tarefas_padrao, usa_quadro_tarefas)
values ('c9a1f5e0-6f2e-4b1a-9c3d-8e7f6a5b4c3d', 'Simples Nacional', null, 3, true, false);

insert into public.departamentos (nome, parent_id, ordem, usa_tarefas_padrao, usa_quadro_tarefas)
values
  ('Simples', 'c9a1f5e0-6f2e-4b1a-9c3d-8e7f6a5b4c3d', 0, true, false),
  ('MEI', 'c9a1f5e0-6f2e-4b1a-9c3d-8e7f6a5b4c3d', 1, true, false),
  ('Pessoa Física', 'c9a1f5e0-6f2e-4b1a-9c3d-8e7f6a5b4c3d', 2, true, false);

-- Suporte a CPF (pessoa física, 11 dígitos) além de CNPJ (14) — a carga real
-- do Alterdata tem clientes pessoa física legítimos (MEI/autônomo cadastrado
-- pelo CPF). Mantém o nome da coluna `cnpj` pra não precisar renomear em
-- todo o app; só o formato aceito muda.
alter table public.clientes drop constraint clientes_cnpj_check;
alter table public.clientes add constraint clientes_cnpj_check check (cnpj ~ '^(\d{11}|\d{14})$');
comment on column public.clientes.cnpj is 'CNPJ (14 dígitos) ou CPF (11 dígitos) só com números — a máscara/validação de qual dos dois é responsabilidade da UI (lib/cnpj.ts).';
