# Fase 6.1 — Alinhar RLS ao modelo de permissões

Mapeado em 05/09/2026 durante um levantamento de segurança geral do projeto.
Deixado propositalmente para a Fase 6.1 (Patrick decidiu manter o cronograma
como estava) — este documento existe pra não perder o raciocínio até lá.

## O risco

`tarefas`, `departamentos`, `colunas` e `opcoes_coluna` ainda têm RLS aberta
pra qualquer usuário `authenticated`, sem checar a tabela `permissoes`. Só o
app (`lib/supabase/permissoes.ts`) filtra por departamento — o banco em si
não. Qualquer pessoa logada (mesmo um Usuário Final liberado só pra um
departamento) pode abrir o console do navegador e rodar
`supabase.from('tarefas').select('*')` (ou `.update(...)`) e ler/escrever
tarefas de departamentos que não são dela. Isso já está documentado nos
comentários das próprias migrations como pendência ("a restrição por
departamento... chega na Fase 3.2" / "alinhamento de RLS... é tarefa da Fase
6.1") — nunca foi corrigido nessas quatro tabelas.

Hoje o risco é baixo (só local, exige login válido + acesso à máquina), mas
vira crítico assim que o banco for pra nuvem (Fase 6) e ficar acessível pela
internet — por isso é bloqueante antes do deploy, não opcional.

## O mecanismo certo já existe

`public.pode_acessar_departamento(p_departamento_id uuid)`, criada em
`supabase/migrations/20260823140000_add_quadro_tarefas.sql`, já resolve isso
certo pras Tarefas Avulsas (módulo mais novo): admin sempre tem acesso, ou
usuário com permissão direta ou herdada do departamento pai (mesma lógica que
`getDepartamentosPermitidos`/`podeAcessarDepartamento` no lado JS). É só
reaproveitar essa função nas quatro tabelas antigas.

## Rascunho da migration (aplicar na Fase 6.1, testar local antes de subir)

```sql
-- tarefas
drop policy "Authenticated users can view tarefas" on public.tarefas;
create policy "Users can view tarefas of accessible departamentos"
  on public.tarefas for select
  using (public.pode_acessar_departamento(departamento_id));

drop policy "Authenticated users can insert tarefas" on public.tarefas;
create policy "Users can insert tarefas in accessible departamentos"
  on public.tarefas for insert
  with check (public.pode_acessar_departamento(departamento_id));

drop policy "Authenticated users can update tarefas" on public.tarefas;
create policy "Users can update tarefas of accessible departamentos"
  on public.tarefas for update
  using (public.pode_acessar_departamento(departamento_id))
  with check (public.pode_acessar_departamento(departamento_id));

-- departamentos
drop policy "Authenticated users can view departamentos" on public.departamentos;
create policy "Users can view accessible departamentos"
  on public.departamentos for select
  using (public.pode_acessar_departamento(id));

-- colunas
drop policy "Authenticated users can view colunas" on public.colunas;
create policy "Users can view colunas of accessible departamentos"
  on public.colunas for select
  using (public.pode_acessar_departamento(departamento_id));

-- opcoes_coluna (não tem departamento_id direto — precisa ir via colunas)
drop policy "Authenticated users can view opcoes_coluna" on public.opcoes_coluna;
create policy "Users can view opcoes_coluna of accessible departamentos"
  on public.opcoes_coluna for select
  using (
    exists (
      select 1 from public.colunas c
      where c.id = opcoes_coluna.coluna_id
        and public.pode_acessar_departamento(c.departamento_id)
    )
  );
```

As policies `"Admins can manage ..." (for all, using is_admin())` de cada
tabela continuam valendo como estão — não precisam mudar.

## Antes de considerar concluído

- Rodar com os 3 perfis de seed (admin, gerente, usuário final) e confirmar
  que cada um só vê/edita o que deveria — inclusive as Tarefas Avulsas
  continuam iguais (não é afetado, já está correto).
- Testar especificamente o caso que motivou isso: logar como usuário final
  com permissão só num departamento, abrir o console do navegador e tentar
  `supabase.from('tarefas').select('*')` — deve devolver só os departamentos
  liberados pra ele, não todos.
- Reconfirmar se a decisão de deixar `clientes`/`cliente_departamentos` com
  leitura aberta a todo `authenticated` (documentada como intencional na
  migration `20260816205037_create_clientes.sql` — clientes tratados como
  diretório compartilhado da empresa, só as tarefas são por departamento)
  ainda faz sentido nessa fase, ou se deve mudar junto.
