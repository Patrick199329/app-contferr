-- Libera as 3 credenciais (senha_gov/codigo_acesso/senha) como opção de
-- "Campo do cliente" — mas só pra colunas de departamentos com
-- "Funcionários por cliente" ligado. Não é uma exposição nova: esses
-- departamentos já enxergam essa credencial na aba "Acesso a portais" do
-- cadastro; isso só evita redigitar/reabrir o cadastro toda hora. Outros
-- departamentos continuam sem conseguir apontar uma coluna pra lá — reforçado
-- aqui por trigger, não só pela tela, mesmo padrão de rigor já usado nesse
-- módulo (a tentativa direta por SQL também é bloqueada).
alter table public.colunas drop constraint colunas_campo_cliente_alvo_check;
alter table public.colunas add constraint colunas_campo_cliente_alvo_check
  check (campo_cliente_alvo in (
    'codigo', 'cnpj', 'inscricao_estadual', 'tipo_calculo_ir', 'telefone',
    'cep', 'endereco', 'complemento', 'bairro', 'cidade', 'uf',
    'senha_gov', 'codigo_acesso', 'senha'
  ));

create function public.verificar_campo_cliente_alvo_restrito()
returns trigger
language plpgsql
as $$
begin
  if new.campo_cliente_alvo in ('senha_gov', 'codigo_acesso', 'senha') then
    if not exists (
      select 1 from public.departamentos
      where id = new.departamento_id and usa_funcionarios
    ) then
      raise exception 'Este campo só pode ser usado em departamentos com "Funcionários por cliente" habilitado.';
    end if;
  end if;
  return new;
end;
$$;

create trigger verificar_campo_cliente_alvo_restrito
  before insert or update on public.colunas
  for each row
  execute function public.verificar_campo_cliente_alvo_restrito();
