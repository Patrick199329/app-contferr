-- Excluir cliente ou coluna só é permitido quando não há movimentação
-- registrada (a checagem em si fica na aplicação, aqui só liberamos a
-- operação de DELETE em si pra quem já podia editar).

-- Gerente já pode editar cliente vinculado a departamento que gerencia — a
-- exclusão segue a mesma regra (admin já tem acesso irrestrito via a policy
-- "Admins can manage clientes" existente).
create policy "Gerentes can delete own clientes"
  on public.clientes for delete
  using (
    is_gerente_ativo()
    and exists (
      select 1 from public.cliente_departamentos cd
      where cd.cliente_id = clientes.id and is_gerente_do_departamento(cd.departamento_id)
    )
  );
