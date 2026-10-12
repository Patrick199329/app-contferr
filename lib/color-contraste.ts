// Escolhe texto claro ou escuro em cima de uma cor de fundo qualquer, pela
// luminância relativa (fórmula padrão de percepção de brilho). Usado pra
// calcular --accent-foreground automaticamente a partir da cor de menu
// escolhida pelo admin, sem precisar pedir uma segunda cor pra isso.
export function corContrastante(hex: string): string {
  const h = hex.replace('#', '');
  const par =
    h.length === 3
      ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]]
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  const [r, g, b] = par.map((c) => parseInt(c, 16) || 0);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#1f1d1a' : '#ffffff';
}
