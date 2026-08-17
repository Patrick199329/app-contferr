export type ViradaLog = {
  id: string;
  competencia: string;
  status: 'sucesso' | 'erro';
  mensagem: string | null;
  linhas_criadas: number;
  executado_por: string | null;
  executado_em: string;
};
