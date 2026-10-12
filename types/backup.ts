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

export function formatarBytes(bytes: number | null): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
