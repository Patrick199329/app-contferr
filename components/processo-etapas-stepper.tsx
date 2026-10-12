import { ProcessoEtapaRow } from '@/components/processo-etapa-row';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';
import type { ProcessoEtapa, ProcessoTaxaJucemg } from '@/types/processo';

type ProcessoEtapasStepperProps = {
  etapas: ProcessoEtapa[];
  taxasPorEtapaId: Record<string, ProcessoTaxaJucemg>;
  membros: MembroDepartamento[];
};

export function ProcessoEtapasStepper({ etapas, taxasPorEtapaId, membros }: ProcessoEtapasStepperProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Etapas do processo</h2>
        <span className="text-sm text-muted">
          {etapas.filter((e) => e.status === 'concluida').length}/{etapas.length}
        </span>
      </div>
      <ol className="app-card flex flex-col divide-y divide-border">
        {etapas.map((etapa, i) => (
          // Inclui updated_at na key: qualquer escrita via RPC (status
          // rápido ou o form de detalhes) precisa remontar o componente pra
          // reidratar o estado local a partir do valor novo vindo do
          // servidor — mesmo padrão já usado em ResponsavelPadraoCell.
          <ProcessoEtapaRow
            key={`${etapa.id}-${etapa.updated_at}`}
            numero={i + 1}
            etapa={etapa}
            taxa={taxasPorEtapaId[etapa.id]}
            membros={membros}
            // Etapas antes de uma trava por taxa JUCEMG podem ser feitas em
            // qualquer ordem; só a partir de uma etapa travada por taxa que
            // ainda não foi resolvida (e as etapas depois dela) ficam
            // bloqueadas — mesma regra aplicada no banco (RPCs), aqui só
            // refletida na tela.
            semGateAnteriorPendente={
              !etapas.slice(0, i).some((e) => e.trava_por_taxa_jucemg && e.status !== 'concluida')
            }
          />
        ))}
        {etapas.length === 0 ? (
          <li className="p-4 text-sm text-muted">Nenhuma etapa cadastrada pra este processo.</li>
        ) : null}
      </ol>
    </div>
  );
}
