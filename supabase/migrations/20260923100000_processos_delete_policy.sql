-- Permite excluir um processo (não só desativar) enquanto ele ainda não foi
-- concluído — mesmo espírito de 20260824180000_quadro_tarefas_delete_policy.sql:
-- diferente de clientes/departamentos (cadastro, "desativar, não excluir"),
-- um processo é um registro do dia a dia, então quem acessa o departamento
-- pode excluir, não só admin. A condição "status <> 'concluido'" fica na
-- própria policy (não só checada na tela) — reforço pra nunca apagar um
-- processo já concluído, nem por chamada direta.
drop policy "Admins can delete processos" on public.processos;

create policy "Users can delete non-concluded processos of accessible departamentos"
  on public.processos for delete
  using (public.pode_acessar_departamento(departamento_id) and status <> 'concluido');
