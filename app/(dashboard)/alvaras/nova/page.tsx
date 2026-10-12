import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createLicenca } from '../actions';
import { LicencaForm } from '@/components/licenca-form';
import { getClientesAtivos, getSugestoesLicenca } from '@/lib/supabase/licencas';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

type NovaLicencaPageProps = {
  searchParams: Promise<{ departamento?: string }>;
};

export default async function NovaLicencaPage({ searchParams }: NovaLicencaPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { departamento: departamentoId } = await searchParams;
  if (!departamentoId) notFound();

  const supabase = await createClient();
  const [{ data: departamento }, clientes, membros, sugestoes] = await Promise.all([
    supabase.from('departamentos').select('id, nome, usa_alvaras').eq('id', departamentoId).single(),
    getClientesAtivos(),
    getMembrosDoDepartamento(departamentoId),
    getSugestoesLicenca(departamentoId),
  ]);

  if (!departamento || !departamento.usa_alvaras) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nova licença ou alvará — {departamento.nome}</h1>
          <p className="text-sm text-muted">Cadastre a vigência e configure a taxa anual.</p>
        </div>
        <Link
          href={`/alvaras?departamento=${departamentoId}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>
      <div className="app-card p-6">
        <LicencaForm
          action={createLicenca.bind(null, departamentoId)}
          clientesDisponiveis={clientes}
          membros={membros}
          defaultResponsavelId={profile.id}          submitLabel="Cadastrar licença"
          {...sugestoes}
        />
      </div>
    </div>
  );
}
