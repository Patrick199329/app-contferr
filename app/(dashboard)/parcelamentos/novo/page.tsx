import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createParcelamento } from '../actions';
import { ParcelamentoForm } from '@/components/parcelamento-form';
import { getClientesAtivos } from '@/lib/supabase/licencas';
import { getSugestoesOrigem } from '@/lib/supabase/parcelamentos';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

type NovoParcelamentoPageProps = {
  searchParams: Promise<{ departamento?: string }>;
};

export default async function NovoParcelamentoPage({ searchParams }: NovoParcelamentoPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { departamento: departamentoId } = await searchParams;
  if (!departamentoId) notFound();

  const supabase = await createClient();
  const [{ data: departamento }, clientes, membros, origensSugeridas] = await Promise.all([
    supabase
      .from('departamentos')
      .select('id, nome, usa_parcelamentos')
      .eq('id', departamentoId)
      .single(),
    getClientesAtivos(),
    getMembrosDoDepartamento(departamentoId),
    getSugestoesOrigem(departamentoId),
  ]);

  if (!departamento || !departamento.usa_parcelamentos) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Novo parcelamento — {departamento.nome}</h1>
        <Link
          href={`/parcelamentos?departamento=${departamentoId}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>
      <div className="app-card p-6">
        <ParcelamentoForm
          action={createParcelamento.bind(null, departamentoId)}
          clientesDisponiveis={clientes}
          membros={membros}
          origensSugeridas={origensSugeridas}
          defaultResponsavelId={profile.id}
          submitLabel="Cadastrar parcelamento"
        />
      </div>
    </div>
  );
}
