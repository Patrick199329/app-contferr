import { notFound, redirect } from 'next/navigation';
import { Fragment } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
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
        <Breadcrumbs
          items={[
            { label: 'Usuários', href: '/usuarios' },
            { label: `Permissões — ${usuario.nome || usuario.email}` },
          ]}
        />
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

  const topLevel = (departamentos ?? []).filter((d) => !d.parent_id);
  const filhosPorPai = new Map<string, Departamento[]>();
  for (const dep of departamentos ?? []) {
    if (dep.parent_id) {
      filhosPorPai.set(dep.parent_id, [...(filhosPorPai.get(dep.parent_id) ?? []), dep]);
    }
  }

  const linha = (dep: Departamento, herdadoDe?: string) => {
    const liberadoDireto = liberados.has(dep.id);
    const herdado = !liberadoDireto && herdadoDe !== undefined && liberados.has(herdadoDe);
    return (
      <li
        key={dep.id}
        className={`flex items-center justify-between p-4 ${herdadoDe !== undefined ? 'pl-10 text-sm' : ''}`}
      >
        <span>
          {herdadoDe !== undefined ? '↳ ' : ''}
          {dep.nome}
          {herdado ? <span className="ml-2 text-xs text-muted">(herdado do pai)</span> : null}
        </span>
        {herdado ? (
          <span className="text-sm text-muted">Liberado</span>
        ) : (
          <form action={toggleDepartamentoPermissao.bind(null, id, dep.id, !liberadoDireto)}>
            <button type="submit" className="text-sm text-muted hover:underline">
              {liberadoDireto ? 'Revogar' : 'Liberar'}
            </button>
          </form>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Usuários', href: '/usuarios' },
          { label: `Permissões — ${usuario.nome || usuario.email}` },
        ]}
      />
      <h1 className="text-xl font-semibold">Permissões — {usuario.nome || usuario.email}</h1>
      <p className="text-sm text-muted">
        Departamentos que este usuário pode ver e editar na Tabela de Tarefas e no Histórico.
        {usuario.role === 'gerente'
          ? ' Como Gerente, também poderá criar clientes e vincular/desvincular clientes existentes nesses departamentos.'
          : ''}{' '}
        Liberar um departamento pai libera automaticamente todos os seus subdepartamentos. Efeito
        imediato — não precisa de logout.
      </p>

      <ul className="app-card flex flex-col divide-y divide-border">
        {topLevel.map((dep) => (
          <Fragment key={dep.id}>
            {linha(dep)}
            {(filhosPorPai.get(dep.id) ?? []).map((filho) => linha(filho, dep.id))}
          </Fragment>
        ))}
        {(departamentos ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhum departamento cadastrado ainda.</li>
        ) : null}
      </ul>
    </div>
  );
}
