-- Histórico dos backups diários (rodados fora da aplicação, via GitHub
-- Actions — ver .github/workflows/backup-diario.yml). A própria rotina
-- grava aqui, usando a service_role key, no início e no fim de cada
-- execução; a tela em /admin/backups só lê. O botão "rodar agora" do
-- admin dispara o workflow via API do GitHub, não escreve nesta tabela
-- diretamente — quem registra o resultado é sempre a rotina em si.
create table public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'sucesso', 'erro')),
  drive_arquivo_id text,
  drive_arquivo_url text,
  tamanho_bytes bigint,
  mensagem_erro text,
  disparado_manualmente boolean not null default false
);
create index backup_logs_iniciado_em_idx on public.backup_logs (iniciado_em desc);

alter table public.backup_logs enable row level security;

create policy "Somente admin Innovation vê os backups" on public.backup_logs
  for select using (public.eh_admin_innovation());

grant select on public.backup_logs to authenticated;
grant all on public.backup_logs to service_role;
