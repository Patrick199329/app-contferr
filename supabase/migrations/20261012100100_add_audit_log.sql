-- Log de auditoria — rastreia login/logout e criação/edição/exclusão das
-- tabelas administrativas/estruturais (quem tem acesso a quê, cadastro de
-- clientes e departamentos). Deliberadamente NÃO inclui tabelas de alto
-- volume operacional (tarefas, quadro_tarefas) — preencher um checklist
-- mensal normal não é o tipo de evento que esse log pretende rastrear, e
-- incluir isso afogaria a tela em ruído. Dá pra anexar o mesmo gatilho em
-- mais tabelas depois, se fizer falta.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  operacao text not null check (operacao in ('insert', 'update', 'delete', 'login', 'logout')),
  registro_id uuid,
  usuario_id uuid references public.profiles (id) on delete set null,
  dados_antigos jsonb,
  dados_novos jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_tabela_idx on public.audit_log (tabela);
create index audit_log_usuario_id_idx on public.audit_log (usuario_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Só leitura, e só pra quem tem o flag — nem o admin do escritório acessa.
-- Sem nenhuma policy de insert/update/delete pra authenticated: a única
-- forma de gravar é via as funções SECURITY DEFINER abaixo (gatilho
-- genérico e registrar_evento_sessao), nunca por um .insert() direto.
create policy "Somente admin Innovation vê o log de auditoria" on public.audit_log
  for select using (public.eh_admin_innovation());

grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;

create function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (tabela, operacao, registro_id, usuario_id, dados_antigos, dados_novos)
  values (
    TG_TABLE_NAME,
    lower(TG_OP),
    case when TG_OP = 'DELETE' then OLD.id else NEW.id end,
    auth.uid(),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );
  return coalesce(NEW, OLD);
end;
$$;

create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.registrar_auditoria();

create trigger audit_departamentos
  after insert or update or delete on public.departamentos
  for each row execute function public.registrar_auditoria();

create trigger audit_permissoes
  after insert or update or delete on public.permissoes
  for each row execute function public.registrar_auditoria();

create trigger audit_cliente_departamentos
  after insert or update or delete on public.cliente_departamentos
  for each row execute function public.registrar_auditoria();

-- Único jeito de gravar entrada/saída — chamado por login()/logout() em
-- app/(auth)/login/actions.ts logo após autenticar (ou logo antes de
-- encerrar a sessão, enquanto auth.uid() ainda resolve).
create function public.registrar_evento_sessao(p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo not in ('login', 'logout') then
    raise exception 'Tipo de evento de sessão inválido: %', p_tipo;
  end if;
  if auth.uid() is null then
    return;
  end if;
  insert into public.audit_log (tabela, operacao, usuario_id)
  values ('sessao', p_tipo, auth.uid());
end;
$$;
grant execute on function public.registrar_evento_sessao to authenticated;
