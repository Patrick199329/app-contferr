-- Guarda o refresh token do Google Drive usado pelo backup diário — trocado
-- aqui em vez de um secret fixo no GitHub, pra permitir renovar com um
-- clique dentro de /admin/backups em vez de refazer o fluxo manual do OAuth
-- Playground toda vez que expira (~7 dias, enquanto o app OAuth ficar em
-- modo "Testing" no Google). Singleton, mesmo padrão de configuracoes_marca.
create table public.integracao_google_drive (
  id boolean primary key default true check (id),
  refresh_token text,
  atualizado_em timestamptz,
  atualizado_por uuid references public.profiles (id) on delete set null
);

insert into public.integracao_google_drive (id) values (true);

alter table public.integracao_google_drive enable row level security;

create policy "Somente admin Innovation vê a integração do Drive" on public.integracao_google_drive
  for select using (public.eh_admin_innovation());

create policy "Somente admin Innovation atualiza a integração do Drive" on public.integracao_google_drive
  for update using (public.eh_admin_innovation()) with check (public.eh_admin_innovation());

grant select, update on public.integracao_google_drive to authenticated;
grant all on public.integracao_google_drive to service_role;
