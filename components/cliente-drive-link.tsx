import { FolderOpen } from 'lucide-react';

type ClienteDriveLinkProps = {
  url: string | null | undefined;
  className?: string;
  size?: number;
};

// Ícone genérico (sem logo de marca, mesmo padrão da coluna "Link" em
// lib/link-icones.tsx) que abre a pasta do cliente no Google Drive numa aba
// nova. Não renderiza nada se o cliente não tiver o link cadastrado.
export function ClienteDriveLink({ url, className, size = 14 }: ClienteDriveLinkProps) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir pasta do cliente no Google Drive"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex shrink-0 text-muted hover:text-foreground ${className ?? ''}`}
    >
      <FolderOpen size={size} />
    </a>
  );
}
