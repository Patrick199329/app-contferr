-- Novo perfil "Gerente": como Usuário Final (só acessa departamentos
-- liberados via `permissoes`), mas adicionalmente pode criar/editar
-- clientes e vincular/desvincular clientes aos departamentos que gerencia.
alter type public.user_role add value 'gerente';
