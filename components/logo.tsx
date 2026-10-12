type LogoProps = {
  logoUrl: string | null;
  size?: 'sm' | 'md';
};

// sm = topbar (nome só aparece a partir de sm: quando não há logo); md =
// tela de login (nome sempre visível quando não há logo). O logo em si é um
// pouco maior que a caixinha "C" padrão — uma imagem pequena demais fica
// difícil de reconhecer, enquanto a letra "C" já é legível nesse tamanho.
const ESTILOS = {
  sm: {
    caixa: 'h-11 w-11 rounded-xl text-base',
    imagem: 'h-16 w-16 rounded-xl',
    nome: 'hidden text-lg font-semibold sm:inline',
  },
  md: {
    caixa: 'h-28 w-28 rounded-2xl text-5xl',
    imagem: 'h-44 w-44 rounded-2xl',
    nome: 'text-3xl font-semibold',
  },
};

// Cai pro visual padrão ("C" + Contferr) quando não há logo configurado em
// Painel Administrativo > Aparência — components/aparencia-form.tsx. Com
// logo definido, o nome "Contferr" some (logo geralmente já traz o nome —
// mostrar os dois juntos fica duplicado).
export function Logo({ logoUrl, size = 'md' }: LogoProps) {
  const estilo = ESTILOS[size];
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL arbitrária definida pelo admin, sem domínio fixo pra configurar no next/image
        <img src={logoUrl} alt="Logo" className={`${estilo.imagem} shrink-0 object-contain`} />
      ) : (
        <>
          <span
            className={`flex ${estilo.caixa} shrink-0 items-center justify-center bg-accent font-bold text-accent-foreground`}
          >
            C
          </span>
          <span className={estilo.nome}>Contferr</span>
        </>
      )}
    </div>
  );
}
