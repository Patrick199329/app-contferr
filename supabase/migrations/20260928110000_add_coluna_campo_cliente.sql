-- Novo tipo de coluna "campo_cliente": puxa um campo do cadastro do cliente
-- direto pra Tabela de Tarefas/Histórico, sempre ao vivo — substitui o
-- "campo_funcionario" (descontinuado) com uma versão mais simples e aberta
-- a QUALQUER departamento, sem precisar de nenhuma ferramenta ligada
-- antes: são só dados cadastrais comuns, já com leitura aberta a todo
-- authenticated na própria tabela `clientes`.
--
-- Deliberadamente NÃO inclui senha_gov/codigo_acesso/senha — essas 3
-- continuam restritas à aba "Acesso a portais" do cadastro (só visível pra
-- quem acessa um departamento com "Funcionários por cliente" ligado). Abrir
-- esse mecanismo pra qualquer departamento com as credenciais incluídas
-- deixaria qualquer departamento capaz de expor a senha de um cliente que
-- nem é dele.
alter type public.coluna_tipo add value 'campo_cliente';

alter table public.colunas add column campo_cliente_alvo text
  check (campo_cliente_alvo in (
    'codigo', 'cnpj', 'inscricao_estadual', 'tipo_calculo_ir', 'telefone',
    'cep', 'endereco', 'complemento', 'bairro', 'cidade', 'uf'
  ));
