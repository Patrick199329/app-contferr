-- A migration original de profiles (Fase 1.3) foi criada antes de o Supabase
-- exigir GRANT explícito para as roles da API em tabelas novas — só ficou com
-- SELECT. A policy "Admins can manage all profiles" (RLS) já existia, mas sem
-- o GRANT de base a operação nem chega a ser avaliada pela RLS (fica só o erro
-- genérico "permission denied for table profiles"). Faltava para Fase 3.1
-- (editar/desativar usuário).
grant insert, update, delete on public.profiles to authenticated;
