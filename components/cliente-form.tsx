'use client';

import { useActionState, useState } from 'react';
import { formatDocumento, isValidCnpj, onlyDigits } from '@/lib/cnpj';
import { ESTADOS_BR } from '@/lib/estados-br';
import type { ClienteFormState } from '@/app/(dashboard)/clientes/actions';
import { Button } from '@/components/ui/button';
import type { MembroDepartamento } from '@/lib/supabase/permissoes';

type ClienteFormProps = {
  action: (prevState: ClienteFormState, formData: FormData) => Promise<ClienteFormState>;
  initialValues?: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    codigo: string | null;
    inscricaoEstadual: string | null;
    tipoCalculoIr: string | null;
    telefone: string | null;
    cep: string | null;
    endereco: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    googleDriveUrl: string | null;
  };
  departamentosDisponiveis?: { id: string; nome: string }[];
  membrosPorDepartamento?: Record<string, MembroDepartamento[]>;
  submitLabel: string;
};

const initialState: ClienteFormState = { error: null };

export function ClienteForm({
  action,
  initialValues,
  departamentosDisponiveis,
  membrosPorDepartamento = {},
  submitLabel,
}: ClienteFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [cnpj, setCnpj] = useState(initialValues?.cnpj ?? '');
  const [departamentosMarcados, setDepartamentosMarcados] = useState<Set<string>>(new Set());
  const [razaoSocial, setRazaoSocial] = useState(initialValues?.razaoSocial ?? '');
  const [nomeFantasia, setNomeFantasia] = useState(initialValues?.nomeFantasia ?? '');
  const [codigo, setCodigo] = useState(initialValues?.codigo ?? '');
  const [inscricaoEstadual, setInscricaoEstadual] = useState(initialValues?.inscricaoEstadual ?? '');
  const [tipoCalculoIr, setTipoCalculoIr] = useState(initialValues?.tipoCalculoIr ?? '');
  const [telefone, setTelefone] = useState(initialValues?.telefone ?? '');
  const [cep, setCep] = useState(initialValues?.cep ?? '');
  const [endereco, setEndereco] = useState(initialValues?.endereco ?? '');
  const [complemento, setComplemento] = useState(initialValues?.complemento ?? '');
  const [bairro, setBairro] = useState(initialValues?.bairro ?? '');
  const [cidade, setCidade] = useState(initialValues?.cidade ?? '');
  const [uf, setUf] = useState(initialValues?.uf ?? '');
  const [googleDriveUrl, setGoogleDriveUrl] = useState(initialValues?.googleDriveUrl ?? '');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPending, setLookupPending] = useState(false);

  const digits = onlyDigits(cnpj);

  // A Receita só disponibiliza consulta pública de CNPJ — CPF é dado
  // protegido, não existe API equivalente. Acima de 11 dígitos já é CNPJ em
  // formação, então só trava mesmo o caso de 11 dígitos completos.
  const pareceCpf = digits.length === 11;

  async function handleLookup() {
    setLookupError(null);

    if (!isValidCnpj(digits)) {
      setLookupError(
        pareceCpf
          ? 'Não existe consulta pública de CPF — preencha manualmente.'
          : 'CNPJ inválido — confira os dígitos antes de buscar.',
      );
      return;
    }

    // Cliente já cadastrado (initialValues só existe na tela de Editar) pode
    // ter dados ajustados manualmente depois do primeiro cadastro — buscar
    // de novo sobrescreveria isso sem avisar. Cliente novo não tem nada pra
    // perder, segue direto.
    if (initialValues) {
      const confirmado = window.confirm(
        'Isso vai substituir Razão Social, Nome Fantasia, Telefone, CEP, Endereço, Complemento, ' +
          'Bairro, Cidade, UF e Tipo Cálc. IR pelos dados atuais da Receita Federal — inclusive ' +
          'qualquer ajuste manual feito depois do cadastro. Código e Inscrição Estadual não são ' +
          'afetados (a Receita não tem esses dados). Continuar?',
      );
      if (!confirmado) return;
    }

    setLookupPending(true);
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error ?? 'Não foi possível buscar os dados do CNPJ.');
        return;
      }

      // Só sobrescreve o que a Receita realmente devolveu — o resto (Código,
      // Inscrição Estadual) nenhuma API sabe, continua manual sempre.
      setRazaoSocial(data.razaoSocial || razaoSocial);
      setNomeFantasia(data.nomeFantasia || nomeFantasia);
      setTipoCalculoIr(data.tipoCalculoIr || tipoCalculoIr);
      setTelefone(data.telefone || telefone);
      setCep(data.cep || cep);
      setEndereco(data.endereco || endereco);
      setComplemento(data.complemento || complemento);
      setBairro(data.bairro || bairro);
      setCidade(data.cidade || cidade);
      setUf(data.uf || uf);
    } catch {
      setLookupError('Não foi possível buscar os dados do CNPJ. Preencha manualmente.');
    } finally {
      setLookupPending(false);
    }
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="cnpj" className="text-sm font-medium">
          CNPJ / CPF
        </label>
        <div className="flex gap-2">
          <input
            id="cnpj"
            name="cnpj"
            required
            value={formatDocumento(cnpj)}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00 ou CPF"
            className="input"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleLookup}
            disabled={lookupPending || pareceCpf}
            title={pareceCpf ? 'Não existe consulta pública de CPF' : undefined}
          >
            {lookupPending ? 'Buscando…' : 'Buscar dados'}
          </Button>
        </div>
        {lookupError ? <p className="text-sm text-status-pending">{lookupError}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="razao_social" className="text-sm font-medium">
          Razão social
        </label>
        <input
          id="razao_social"
          name="razao_social"
          required
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="nome_fantasia" className="text-sm font-medium">
          Nome fantasia
        </label>
        <input
          id="nome_fantasia"
          name="nome_fantasia"
          required
          value={nomeFantasia}
          onChange={(e) => setNomeFantasia(e.target.value)}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="codigo" className="text-sm font-medium">
            Código Cliente Alterdata
          </label>
          <input
            id="codigo"
            name="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="inscricao_estadual" className="text-sm font-medium">
            Inscrição Estadual
          </label>
          <input
            id="inscricao_estadual"
            name="inscricao_estadual"
            value={inscricaoEstadual}
            onChange={(e) => setInscricaoEstadual(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tipo_calculo_ir" className="text-sm font-medium">
          Tipo Cálc. IR
        </label>
        <input
          id="tipo_calculo_ir"
          name="tipo_calculo_ir"
          list="tipo-calculo-ir-opcoes"
          value={tipoCalculoIr}
          onChange={(e) => setTipoCalculoIr(e.target.value)}
          placeholder="Simples Nacional, Lucro Presumido, Lucro Real…"
          className="input"
        />
        <datalist id="tipo-calculo-ir-opcoes">
          <option value="SIMPLES NACIONAL" />
          <option value="LUCRO PRESUMIDO" />
          <option value="LUCRO REAL" />
          <option value="MEI" />
        </datalist>
        <p className="text-xs text-muted">
          Sugerido pela Receita quando existir, mas é só um retrato do último ano informado — confira
          antes de confiar.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="telefone" className="text-sm font-medium">
          Telefone
        </label>
        <input
          id="telefone"
          name="telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="google_drive_url" className="text-sm font-medium">
          Pasta no Google Drive
        </label>
        <input
          id="google_drive_url"
          name="google_drive_url"
          type="text"
          placeholder="https://drive.google.com/…"
          value={googleDriveUrl}
          onChange={(e) => setGoogleDriveUrl(e.target.value)}
          className="input"
        />
      </div>

      <div className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
        <span className="text-sm font-medium text-muted uppercase">Endereço</span>

        <div className="flex flex-col gap-1">
          <label htmlFor="cep" className="text-sm font-medium">
            CEP
          </label>
          <input
            id="cep"
            name="cep"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            className="input max-w-[10rem]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="endereco" className="text-sm font-medium">
            Endereço
          </label>
          <input
            id="endereco"
            name="endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua, número"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="complemento" className="text-sm font-medium">
            Complemento
          </label>
          <input
            id="complemento"
            name="complemento"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bairro" className="text-sm font-medium">
            Bairro
          </label>
          <input
            id="bairro"
            name="bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className="input"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label htmlFor="cidade" className="text-sm font-medium">
              Cidade
            </label>
            <input
              id="cidade"
              name="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="uf" className="text-sm font-medium">
              UF
            </label>
            <select
              id="uf"
              name="uf"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="input"
            >
              <option value="">—</option>
              {ESTADOS_BR.map((sigla) => (
                <option key={sigla} value={sigla}>
                  {sigla}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {departamentosDisponiveis && departamentosDisponiveis.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-sm font-medium text-muted uppercase">Departamentos</span>
          {departamentosDisponiveis.map((dep) => {
            const marcado = departamentosMarcados.has(dep.id);
            const membros = membrosPorDepartamento[dep.id] ?? [];
            const grupos = new Map<string, MembroDepartamento[]>();
            for (const m of membros) {
              grupos.set(m.grupo, [...(grupos.get(m.grupo) ?? []), m]);
            }
            return (
              <div key={dep.id} className="flex flex-col gap-2 rounded-2xl bg-surface-muted/60 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="departamentos"
                    value={dep.id}
                    checked={marcado}
                    onChange={(e) =>
                      setDepartamentosMarcados((prev) => {
                        const novo = new Set(prev);
                        if (e.target.checked) novo.add(dep.id);
                        else novo.delete(dep.id);
                        return novo;
                      })
                    }
                  />
                  {dep.nome}
                </label>
                {marcado && membros.length > 0 ? (
                  <select
                    name={`responsavel_${dep.id}`}
                    defaultValue=""
                    className="input py-1.5 text-sm"
                  >
                    <option value="">Sem responsável padrão</option>
                    {[...grupos.entries()].map(([grupo, pessoas]) => (
                      <optgroup key={grupo} label={grupo}>
                        {pessoas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome || p.email}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  );
}
