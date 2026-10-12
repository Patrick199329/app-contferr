import { X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adicionarParcelaRetroativa, deleteParcelamento, updateParcelamento } from '../../actions';
import { ConfirmFormButton } from '@/components/confirm-form-button';
import { ParcelaRetroativaForm } from '@/components/parcela-retroativa-form';
import { ParcelamentoForm } from '@/components/parcelamento-form';
import { ParcelamentoParcelaToggle } from '@/components/parcelamento-parcela-toggle';
import { Badge } from '@/components/ui/badge';
import { formatCompetencia } from '@/lib/competencia';
import { getClientesAtivos } from '@/lib/supabase/licencas';
import { getSugestoesOrigem } from '@/lib/supabase/parcelamentos';
import { getMembrosDoDepartamento } from '@/lib/supabase/permissoes';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import { calcularAvisoPerda, type Parcelamento, type ParcelamentoParcela } from '@/types/parcelamento';

type EditarParcelamentoPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditarParcelamentoPage({
  params,
  searchParams,
}: EditarParcelamentoPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: parcelamento } = await supabase
    .from('parcelamentos')
    .select('*')
    .eq('id', id)
    .single<Parcelamento>();
  if (!parcelamento) notFound();

  const [{ data: departamento }, { data: parcelas }, clientes, membros, origensSugeridas] =
    await Promise.all([
      supabase.from('departamentos').select('id, nome').eq('id', parcelamento.departamento_id).single(),
      supabase
        .from('parcelamento_parcelas')
        .select('*')
        .eq('parcelamento_id', id)
        .order('competencia', { ascending: false })
        .returns<ParcelamentoParcela[]>(),
      getClientesAtivos(parcelamento.cliente_id),
      getMembrosDoDepartamento(parcelamento.departamento_id),
      getSugestoesOrigem(parcelamento.departamento_id),
    ]);
  if (!departamento) notFound();

  const avisoPerda = calcularAvisoPerda(parcelamento, parcelas ?? []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar parcelamento — {departamento.nome}</h1>
        <Link
          href={`/parcelamentos?departamento=${parcelamento.departamento_id}`}
          aria-label="Fechar"
          className="rounded-full p-2 text-muted hover:bg-surface-muted"
        >
          <X size={18} />
        </Link>
      </div>

      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

      <Link
        href={`/clientes/${parcelamento.cliente_id}`}
        className="w-fit text-sm text-muted hover:underline"
      >
        Ver ficha e histórico do cliente
      </Link>

      <div className="app-card p-6">
        <ParcelamentoForm
          action={updateParcelamento.bind(null, id, parcelamento.departamento_id)}
          clientesDisponiveis={clientes}
          membros={membros}
          origensSugeridas={origensSugeridas}
          initialValues={parcelamento}
          submitLabel="Salvar parcelamento"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-medium">Guias mensais</h2>
          {avisoPerda ? (
            <Badge tone="pending">
              Atenção: {avisoPerda.mesesEmAberto} de {avisoPerda.tolerancia} parcelas vencidas em
              aberto, prestes a perder o parcelamento
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          Marque aqui direto o que já aconteceu em cada mês — sem precisar navegar mês a mês na
          lista de Parcelamentos.
        </p>
        {(parcelas ?? []).length > 0 ? (
          <div className="app-card overflow-x-auto">
            <table className="app-table w-full min-w-max border-collapse">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Parcela</th>
                  <th>Guia enviada</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {(parcelas ?? []).map((parcela) => (
                  <tr key={parcela.id}>
                    <td className="font-medium whitespace-nowrap">
                      {formatCompetencia(parcela.competencia)}
                    </td>
                    <td>
                      {parcela.numero_parcela}/{parcelamento.quantidade_parcelas}
                    </td>
                    <td>
                      <ParcelamentoParcelaToggle
                        parcelaId={parcela.id}
                        campo="guia_enviada"
                        valorInicial={parcela.guia_enviada}
                        label="Enviada"
                      />
                    </td>
                    <td>
                      <ParcelamentoParcelaToggle
                        parcelaId={parcela.id}
                        campo="pago"
                        valorInicial={parcela.pago}
                        label="Pago"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhuma guia gerada ainda.</p>
        )}

        <p className="text-sm text-muted">
          Adicionar guia de um mês que não está na lista acima — por exemplo, um mês pulado na
          geração automática.
        </p>
        <ParcelaRetroativaForm action={adicionarParcelaRetroativa.bind(null, id)} />
      </div>

      <div className="flex justify-end">
        <ConfirmFormButton
          action={deleteParcelamento.bind(null, id, parcelamento.departamento_id)}
          confirmMessage="Excluir este parcelamento e todo o histórico de guias mensais dele? Essa ação não pode ser desfeita."
          className="text-sm text-status-inactive hover:underline"
        >
          Excluir parcelamento
        </ConfirmFormButton>
      </div>
    </div>
  );
}
