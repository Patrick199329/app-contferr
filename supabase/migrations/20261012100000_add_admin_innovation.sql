-- Terceiro nível de acesso, acima do admin do escritório: só a Innovation
-- (desenvolvedora da plataforma) enxerga certas ferramentas internas
-- (backup do banco, log de auditoria). Nenhum admin do cliente pode se
-- autoconceder isso — nem mesmo chamando a API diretamente com a própria
-- sessão — então a coluna fica de fora do grant de UPDATE liberado pra
-- authenticated. Só é alterável via service_role (script/SQL direto).
alter table public.profiles add column eh_admin_innovation boolean not null default false;

revoke update on public.profiles from authenticated;
grant update (nome, email, role, status) on public.profiles to authenticated;

create function public.eh_admin_innovation()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select eh_admin_innovation from public.profiles where id = auth.uid()),
    false
  );
$$;
