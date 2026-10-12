-- Liga o Supabase Realtime na tabela tarefas — primeira tabela do projeto a
-- usar isso. Sem isso, a Tabela de Tarefas já aberta numa aba só reflete uma
-- edição feita em outro lugar (outra aba, o cadastro do cliente, outro
-- usuário) depois de um F5 manual: revalidatePath invalida o cache do
-- servidor, mas não avisa uma página já carregada. RLS de tarefas já é
-- aberta pra leitura ("Authenticated users can view tarefas" using (true)),
-- então não precisa de policy nova pro Realtime entregar os eventos.
alter publication supabase_realtime add table public.tarefas;
