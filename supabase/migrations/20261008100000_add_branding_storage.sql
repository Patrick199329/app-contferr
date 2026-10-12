-- Bucket público pra arquivos de marca (favicon, logo) enviados por upload
-- em Painel Administrativo > Aparência — até aqui só existia colar uma URL
-- já hospedada em outro lugar. Público porque precisa carregar sem sessão
-- (tela de login, favicon do navegador); só admin pode escrever.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "Qualquer um pode ler arquivos de marca" on storage.objects
  for select using (bucket_id = 'branding');

create policy "Admins podem enviar arquivos de marca" on storage.objects
  for insert with check (bucket_id = 'branding' and public.is_admin());

create policy "Admins podem atualizar arquivos de marca" on storage.objects
  for update using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

create policy "Admins podem apagar arquivos de marca" on storage.objects
  for delete using (bucket_id = 'branding' and public.is_admin());
