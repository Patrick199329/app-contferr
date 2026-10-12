-- A migration anterior só deu grant de select pra authenticated — faltou
-- update (a policy "Admins can manage configuracoes_sistema" já restringe
-- quem de fato consegue, mas sem o grant de base o Postgres barra antes de
-- chegar na RLS). Mesmo padrão de configuracoes_marca.
grant update on public.configuracoes_sistema to authenticated;
