'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleParcelamentoParcela } from '@/app/(dashboard)/parcelamentos/actions';

type ParcelamentoParcelaToggleProps = {
  parcelaId: string;
  campo: 'guia_enviada' | 'pago';
  valorInicial: boolean;
  label: string;
};

export function ParcelamentoParcelaToggle({
  parcelaId,
  campo,
  valorInicial,
  label,
}: ParcelamentoParcelaToggleProps) {
  const [valor, setValor] = useState(valorInicial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function alternar() {
    const novoValor = !valor;
    setValor(novoValor);
    startTransition(async () => {
      const { error } = await toggleParcelamentoParcela(parcelaId, campo, novoValor);
      if (error) {
        setValor(!novoValor);
        return;
      }
      // Força atualizar os dados da página — outros cálculos que dependem
      // dessa guia (ex.: aviso de "prestes a perder o parcelamento") são
      // derivados no server component e não se atualizam sozinhos só pelo
      // estado local deste checkbox.
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
      <input type="checkbox" checked={valor} onChange={alternar} className="h-4 w-4" />
      {label}
    </label>
  );
}
