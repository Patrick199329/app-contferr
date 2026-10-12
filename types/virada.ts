export type ViradaLog = {
  id: string;
  competencia: string;
  status: 'sucesso' | 'erro';
  mensagem: string | null;
  linhas_criadas: number;
  executado_por: string | null;
  executado_em: string;
};

export type ParcelamentoViradaLog = {
  id: string;
  competencia: string;
  status: 'sucesso' | 'erro';
  mensagem: string | null;
  parcelas_criadas: number;
  parcelamentos_perdidos: number;
  parcelamentos_quitados: number;
  executado_por: string | null;
  executado_em: string;
};
