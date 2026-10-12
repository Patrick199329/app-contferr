-- Responsável padrão do cliente dentro de um departamento/subdepartamento —
-- não é um valor por competência (como as colunas normais), é um atributo
-- do próprio vínculo cliente x departamento: um "dono" fixo, cadastrado uma
-- vez, em vez de descobrir quem cuida do cliente só olhando quem editou a
-- linha por último.
alter table public.cliente_departamentos
  add column responsavel_padrao_id uuid references public.profiles (id) on delete set null;

-- A tabela só tinha grant de insert/delete pra authenticated até aqui — a
-- app nunca precisou dar update nela (só criava/removia o vínculo inteiro).
-- A RLS de escrita já cobre update (policies "for all" de admin/gerente),
-- só faltava o grant.
grant update on public.cliente_departamentos to authenticated;
