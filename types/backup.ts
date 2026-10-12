export type BackupStatus = 'em_andamento' | 'sucesso' | 'erro';

export type BackupLog = {
  id: string;
  iniciado_em: string;
  concluido_em: string | null;
  status: BackupStatus;
  drive_arquivo_id: string | null;
  drive_arquivo_url: string | null;
  tamanho_bytes: number | null;
  mensagem_erro: string | null;
  disparado_manualmente: boolean;
};

export const BACKUP_STATUS_LABELS: Record<BackupStatus, string> = {
  em_andamento: 'Em andamento',
  sucesso: 'Sucesso',
  erro: 'Erro',
};

export const BACKUP_STATUS_TONES: Record<BackupStatus, 'active' | 'pending' | 'inactive'> = {
  em_andamento: 'pending',
  sucesso: 'active',
  erro: 'inactive',
};

const VALIDADE_TOKEN_GOOGLE_DIAS = 7;

// Enquanto o app OAuth do Google ficar em modo "Testing", o refresh token
// expira ~7 dias depois de emitido. Função separada (não inline no corpo de
// um componente) porque chamar Date.now() direto durante a renderização
// viola a regra de pureza do React.
export function calcularDiasRestantesAutorizacaoGoogle(atualizadoEm: string | null): number | null {
  if (!atualizadoEm) return null;
  const diasDecorridos = Math.floor((Date.now() - new Date(atualizadoEm).getTime()) / (24 * 60 * 60 * 1000));
  return VALIDADE_TOKEN_GOOGLE_DIAS - diasDecorridos;
}

export function formatarBytes(bytes: number | null): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
