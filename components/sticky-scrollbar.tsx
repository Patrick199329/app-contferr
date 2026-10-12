'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

type StickyScrollbarProps = {
  targetRef: RefObject<HTMLDivElement | null>;
};

// Espelha a rolagem horizontal de `targetRef` numa barra fina grudada no
// rodapé visível da tela (sticky bottom) — fica sempre alcançável mesmo no
// meio de uma tabela comprida, sem precisar rolar a página até o fim pra
// achar a barra de rolagem nativa do container.
export function StickyScrollbar({ targetRef }: StickyScrollbarProps) {
  const barraRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [precisaRolar, setPrecisaRolar] = useState(false);
  const sincronizando = useRef<'barra' | 'tabela' | null>(null);

  useEffect(() => {
    const alvo = targetRef.current;
    if (!alvo) return;

    function medir() {
      if (!alvo) return;
      setLargura(alvo.scrollWidth);
      setPrecisaRolar(alvo.scrollWidth > alvo.clientWidth + 1);
    }

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(alvo);
    // O conteúdo (colunas) pode mudar de largura sem o container mudar de
    // tamanho (ex.: troca de departamento) — observa também o primeiro filho.
    if (alvo.firstElementChild) observer.observe(alvo.firstElementChild);

    function handleTargetScroll() {
      if (sincronizando.current === 'barra') {
        sincronizando.current = null;
        return;
      }
      sincronizando.current = 'tabela';
      if (barraRef.current && alvo) barraRef.current.scrollLeft = alvo.scrollLeft;
    }
    alvo.addEventListener('scroll', handleTargetScroll);

    return () => {
      observer.disconnect();
      alvo.removeEventListener('scroll', handleTargetScroll);
    };
  }, [targetRef]);

  function handleBarraScroll() {
    if (sincronizando.current === 'tabela') {
      sincronizando.current = null;
      return;
    }
    sincronizando.current = 'barra';
    const alvo = targetRef.current;
    if (alvo && barraRef.current) alvo.scrollLeft = barraRef.current.scrollLeft;
  }

  if (!precisaRolar) return null;

  return (
    <div
      ref={barraRef}
      onScroll={handleBarraScroll}
      className="sticky bottom-0 z-10 overflow-x-auto overflow-y-hidden bg-surface py-1"
    >
      <div style={{ width: largura, height: 1 }} />
    </div>
  );
}
