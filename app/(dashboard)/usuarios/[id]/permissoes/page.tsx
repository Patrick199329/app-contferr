import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile, type Profile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';
import { toggleDepartamentoPermissao } from '../../actions';

type PermissoesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PermissoesPage({ params }: PermissoesPageProps) {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    redirect('/usuarios');
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: usuario } = await supabase
    .from('profiles')
    .select('id, email, nome, role, status')
    .eq('id', id)
    .single<Profile>();

  if (!usuario) {
    notFound();
  }

  if (usuario.role === 'admin') {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-xl font-semibold">Permissões — {usuario.nome || usuario.email}</h1>
        <p className="text-sm text-muted">
          Este usuário é Administrador e já tem acesso irrestrito a todos os departamentos.
        </p>
      </div>
    );
  }

  const [{ data: departamentos }, { data: permissoes }] = await Promise.all([
    supabase
      .from('departamentos')
      .select('*')
      .eq('status', 'ativo')
      .order('ordem')
      .returns<Departamento[]>(),
    supabase.from('permissoes').select('departamento_id').eq('usuario_id', id),
  ]);

  const liberados = new Set((permissoes ?? []).map((p) => p.departamento_id));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Permissões — {usuario.nome || usuario.email}</h1>
      <p className="text-sm text-muted">
        Departamentos que este usuário pode ver e editar na Tabela de Tarefas e no Histórico.
        {usuario.role === 'gerente'
          ? ' Como Gerente, também poderá criar clientes e vincular/desvincular clientes existentes nesses departamentos.'
          : ''}{' '}
        Efeito imediato — não precisa de logout.
      </p>

      <ul className="app-card flex flex-col divide-y divide-border">
        {(departamentos ?? []).map((dep) => {
          const liberado = liberados.has(dep.id);
          return (
            <li key={dep.id} className="flex items-center justify-between p-4">
              <span>{dep.nome}</span>
              <form action={toggleDepartamentoPermissao.bind(null, id, dep.id, !liberado)}>
                <button type="submit" className="text-sm text-muted hover:underline">
                  {liberado ? 'Revogar' : 'Liberar'}
                </button>
              </form>
            </li>
          );
        })}
        {(departamentos ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum departamento cadastrado ainda.</li>
        ) : null}
      </ul>
    </div>
  );
}
