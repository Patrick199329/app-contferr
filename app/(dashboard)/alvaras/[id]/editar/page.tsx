import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { deleteLicenca, updateLicenca } from '../../actions';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { LicencaForm } from '@/components/licenca-form';
import { getClientesAtivos, getSugestoesLicenca } from '@/lib/supabase/licencas';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Licenca } from '@/types/licenca';

type EditarLicencaPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditarLicencaPage({ params, searchParams }: EditarLicencaPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: licenca } = await supabase
    .from('licencas')
    .select('*')
    .eq('id', id)
    .single<Licenca>();
  if (!licenca) notFound();

  const [{ data: departamento }, clientes, membros, sugestoes] = await Promise.all([
    supabase.from('departamentos').select('id, nome').eq('id', licenca.departamento_id).single(),
    getClientesAtivos(licenca.cliente_id),
    getMembrosDoDepartamento(licenca.departamento_id),
    getSugestoesLicenca(licenca.departamento_id),
  ]);
  if (!departamento) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar licença — {departamento.nome}</h1>
        <Link
          href={`/alvaras?departamento=${licenca.departamento_id}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>

      <Link
        href={`/clientes/${licenca.cliente_id}`}
        className="w-fit text-sm text-muted hover:underline"
      >
        Ver ficha e histórico do cliente
      </Link>

      {erro ?<p className="text-sm text-status-inactive">{erro}</p> : null}

      <div className="app-card p-6">
        <LicencaForm
          action={updateLicenca.bind(null, id, licenca.departamento_id)}
          clientesDisponiveis={clientes}
          membros={membros}
          initialValues={licenca}
          submitLabel="Salvar licença"
          {...sugestoes}
        />
      </div>

      <div className="flex justify-end">
        <ConfirmFormButton
          action={deleteLicenca.bind(null, id, licenca.departamento_id)}
          confirmMessage="Excluir esta licença? Essa ação não pode ser desfeita."
          className="text-sm text-status-inactive hover:underline"
        >
          Excluir licença
        </ConfirmFormButton>
      </div>
    </div>
  );
}
