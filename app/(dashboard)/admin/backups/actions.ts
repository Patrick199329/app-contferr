'use server';

import { revalidatePath } from 'next/cache';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';

export type BackupFormState = {
  error: string | null;
  sucesso?: boolean;
};

// Dispara o workflow no GitHub Actions (.github/workflows/backup-diario.yml)
// por fora do app — essa função só pede pro GitHub começar a rodar, quem de
// fato faz o dump e grava o resultado em backup_logs é a rotina em si (via
// service_role). Precisa de GITHUB_PAT (fine-grained, permissão
// "Actions: write" só nesse repositório) e GITHUB_REPO ("dono/repo") nas
// variáveis de ambiente — só existem depois que o projeto for pra nuvem.
export async function dispararBackupManual(): Promise<BackupFormState> {
  const profile = await getCurrentProfile();
  if (!ehAdminInnovation(profile)) {
    throw new Error('Não autorizado.');
  }

  const token = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return {
      error:
        'Backup manual ainda não configurado (faltam GITHUB_PAT e GITHUB_REPO nas variáveis de ambiente). Disponível depois que o projeto for pra nuvem.',
    };
  }

  const resposta = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/backup-diario.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: process.env.GITHUB_BRANCH || 'main' }),
    },
  );

  if (!resposta.ok) {
    const texto = await resposta.text();
    return { error: `Não foi possível disparar o backup agora (${resposta.status}): ${texto}` };
  }

  revalidatePath('/admin/backups');
  return { error: null, sucesso: true };
}
