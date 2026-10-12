-- Excluir tarefa avulsa é uma operação normal do dia a dia aqui (diferente
-- de clientes/departamentos, que seguem "desativar, não excluir") — qualquer
-- um com acesso ao departamento pode excluir, não só admin.
drop policy "Admins can delete quadro_tarefas" on public.quadro_tarefas;

create policy "Users can delete quadro_tarefas of accessible departamentos"
  on public.quadro_tarefas for delete
  using (public.pode_acessar_departamento(departamento_id));
