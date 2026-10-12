const WHATSAPP_URL = 'https://wa.me/5531982828899';

type DesenvolvidoPorProps = {
  className?: string;
};

export function DesenvolvidoPor({ className }: DesenvolvidoPorProps) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Falar no WhatsApp"
      className={`flex flex-col items-center gap-1 ${className ?? ''}`}
    >
      <span className="text-[10px] font-medium tracking-wide text-muted uppercase">
        Desenvolvido por
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/desenvolvido-por.png"
        alt="Desenvolvido por"
        className="h-6 w-auto opacity-70 transition-opacity hover:opacity-100"
      />
    </a>
  );
}
