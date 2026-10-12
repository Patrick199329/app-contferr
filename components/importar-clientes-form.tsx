'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  confirmarImportacao,
  preverImportacao,
  type PreviewImportacao,
  type ResultadoConfirmacao,
} from '@/app/(dashboard)/admin/importar-clientes/actions';

type Etapa = 'escolher' | 'preview' | 'resultado';

export function ImportarClientesForm() {
  const [etapa, setEtapa] = useState<Etapa>('escolher');
  const [preview, setPreview] = useState<PreviewImportacao | null>(null);
  const [resultado, setResultado] = useState<ResultadoConfirmacao | null>(null);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleArquivo(formData: FormData) {
    setErro(null);
    setPending(true);
    try {
      const res = await preverImportacao(formData);
      setPreview(res);
      setEtapa('preview');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setPending(false);
    }
  }

  async function handleConfirmar() {
    if (!preview) return;
    setErro(null);
    setPending(true);
    try {
      const res = await confirmarImportacao(preview.validos);
      setResultado(res);
      setEtapa('resultado');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível importar.');
    } finally {
      setPending(false);
    }
  }

  function reiniciar() {
    setEtapa('escolher');
    setPreview(null);
    setResultado(null);
    setErro(null);
  }

  if (etapa === 'resultado' && resultado) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          <strong>{resultado.importados}</strong> cliente{resultado.importados === 1 ? '' : 's'}{' '}
          importado{resultado.importados === 1 ? '' : 's'} com sucesso.
        </p>
        {resultado.falhas.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-status-inactive">
              {resultado.falhas.length} falharam ao gravar:
            </p>
            <ul className="app-card flex flex-col divide-y divide-border text-sm">
              {resultado.falhas.map((f, i) => (
                <li key={i} className="p-3">
                  <span className="font-medium">{f.nome}</span>
                  {f.codigo ? ` (código ${f.codigo})` : ''} — {f.motivo}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button type="button" variant="secondary" onClick={reiniciar} className="w-fit">
          Importar outro arquivo
        </Button>
      </div>
    );
  }

  if (etapa === 'preview' && preview) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-status-active/10 px-3 py-1.5 font-medium text-status-active">
            {preview.validos.length} pronto{preview.validos.length === 1 ? '' : 's'} pra importar
          </span>
          {preview.rejeitados.length > 0 ? (
            <span className="rounded-full bg-status-inactive/10 px-3 py-1.5 font-medium text-status-inactive">
              {preview.rejeitados.length} ignorado{preview.rejeitados.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {preview.validos.some((v) => v.departamentosNaoEncontrados.length > 0) ? (
          <div className="app-card flex flex-col gap-2 p-4 text-sm">
            <p className="font-medium text-status-pending">
              Departamento não encontrado em algumas linhas (o cliente entra mesmo assim, só sem
              esse vínculo):
            </p>
            <ul className="flex flex-col gap-1 text-muted">
              {preview.validos
                .filter((v) => v.departamentosNaoEncontrados.length > 0)
                .map((v) => (
                  <li key={v.linha}>
                    Linha {v.linha} ({v.nomeFantasia}): {v.departamentosNaoEncontrados.join(', ')}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {preview.rejeitados.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Linhas ignoradas:</p>
            <div className="app-card max-h-80 overflow-y-auto">
              <table className="app-table w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rejeitados.map((r) => (
                    <tr key={r.linha}>
                      <td>{r.linha}</td>
                      <td>{r.codigo ?? '—'}</td>
                      <td>{r.nome ?? '—'}</td>
                      <td>{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={pending || preview.validos.length === 0}
          >
            {pending ? 'Importando…' : `Confirmar importação (${preview.validos.length})`}
          </Button>
          <Button type="button" variant="secondary" onClick={reiniciar} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleArquivo} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="arquivo" className="text-sm font-medium">
          Planilha (.xlsx)
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".xlsx"
          required
          className="input"
        />
      </div>
      {erro ? <p className="text-sm text-status-inactive">{erro}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Lendo…' : 'Analisar planilha'}
      </Button>
    </form>
  );
}
