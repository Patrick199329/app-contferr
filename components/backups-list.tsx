'use client';

import { useState, useTransition } from 'react';
import type { BackupFormState } from '@/app/(dashboard)/admin/backups/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BACKUP_STATUS_LABELS,
  BACKUP_STATUS_TONES,
  formatarBytes,
  type BackupLog,
} from '@/types/backup';

type BackupsListProps = {
  backups: BackupLog[];
  dispararBackupManual: () => Promise<BackupFormState>;
};

export function BackupsList({ backups, dispararBackupManual }: BackupsListProps) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<BackupFormState | null>(null);

  function disparar() {
    startTransition(async () => {
      setResultado(await dispararBackupManual());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="app-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted">
          A rotina diária roda sozinha; use o botão abaixo só se precisar de um backup extra agora.
        </p>
        <Button type="button" onClick={disparar} disabled={pending} variant="secondary">
          {pending ? 'Disparando…' : 'Rodar backup agora'}
        </Button>
      </div>
      {resultado?.error ? <p className="text-sm text-status-inactive">{resultado.error}</p> : null}
      {resultado?.sucesso ? (
        <p className="text-sm text-status-active">
          Backup disparado — acompanhe o andamento na lista abaixo em alguns minutos.
        </p>
      ) : null}

      <div className="app-card overflow-x-auto">
        <table className="app-table w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th>Início</th>
              <th>Status</th>
              <th>Tamanho</th>
              <th>Origem</th>
              <th>Arquivo</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap text-sm">
                  {new Date(b.iniciado_em).toLocaleString('pt-BR')}
                </td>
                <td>
                  <Badge tone={BACKUP_STATUS_TONES[b.status]}>{BACKUP_STATUS_LABELS[b.status]}</Badge>
                  {b.status === 'erro' && b.mensagem_erro ? (
                    <p className="mt-1 max-w-xs text-xs text-status-inactive">{b.mensagem_erro}</p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap text-sm">{formatarBytes(b.tamanho_bytes)}</td>
                <td className="text-sm text-muted">{b.disparado_manualmente ? 'Manual' : 'Diário'}</td>
                <td>
                  {b.drive_arquivo_url ? (
                    <a
                      href={b.drive_arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Abrir no Drive
                    </a>
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted">
                  Nenhum backup registrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
