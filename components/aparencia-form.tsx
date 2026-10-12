'use client';

import { useActionState, useState } from 'react';
import type { FormState } from '@/app/(dashboard)/admin/aparencia/actions';
import { Button } from '@/components/ui/button';

type AparenciaFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues: {
    corCabecalho: string | null;
    corMenuSelecionado: string | null;
    corCabecalhoTabela: string | null;
    logoUrl: string | null;
    logoLoginUrl: string | null;
    faviconUrl: string | null;
    nomeSite: string | null;
  };
};

const initialState: FormState = { error: null };

export function AparenciaForm({ action, initialValues }: AparenciaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [personalizarCabecalho, setPersonalizarCabecalho] = useState(
    Boolean(initialValues.corCabecalho),
  );
  const [personalizarMenu, setPersonalizarMenu] = useState(Boolean(initialValues.corMenuSelecionado));
  const [personalizarCabecalhoTabela, setPersonalizarCabecalhoTabela] = useState(
    Boolean(initialValues.corCabecalhoTabela),
  );

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome_site" className="text-sm font-medium">
          Nome do site
        </label>
        <input
          id="nome_site"
          name="nome_site"
          type="text"
          placeholder="Contferr"
          defaultValue={initialValues.nomeSite ?? ''}
          className="input"
        />
        <p className="text-xs text-muted">
          Aparece na aba do navegador. Deixe em branco pra usar &quot;Contferr&quot;.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted/60 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="personalizar_cabecalho"
            checked={personalizarCabecalho}
            onChange={(e) => setPersonalizarCabecalho(e.target.checked)}
            className="h-4 w-4"
          />
          Personalizar cor do cabeçalho
        </label>
        {personalizarCabecalho ? (
          <>
            <input
              type="color"
              name="cor_cabecalho"
              defaultValue={initialValues.corCabecalho ?? '#ffffff'}
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <p className="text-xs text-muted">
              Escolha uma cor clara — o texto do cabeçalho não muda de cor junto.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">Sem personalização, usa o vidro translúcido padrão.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted/60 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="personalizar_menu"
            checked={personalizarMenu}
            onChange={(e) => setPersonalizarMenu(e.target.checked)}
            className="h-4 w-4"
          />
          Personalizar cor do menu selecionado
        </label>
        {personalizarMenu ? (
          <>
            <input
              type="color"
              name="cor_menu_selecionado"
              defaultValue={initialValues.corMenuSelecionado ?? '#d7f542'}
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <p className="text-xs text-muted">
              Usada no item ativo do menu e em outros destaques do sistema (abas, filtros
              marcados). A cor do texto por cima se ajusta sozinha pra continuar legível.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">Sem personalização, usa a cor de destaque padrão.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-surface-muted/60 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="personalizar_cabecalho_tabela"
            checked={personalizarCabecalhoTabela}
            onChange={(e) => setPersonalizarCabecalhoTabela(e.target.checked)}
            className="h-4 w-4"
          />
          Personalizar cor do cabeçalho das tabelas
        </label>
        {personalizarCabecalhoTabela ? (
          <>
            <input
              type="color"
              name="cor_cabecalho_tabela"
              defaultValue={initialValues.corCabecalhoTabela ?? '#1f1d1a'}
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-transparent"
            />
            <p className="text-xs text-muted">
              Linha de título das colunas na Tabela de Tarefas, Histórico etc. A cor do texto por
              cima se ajusta sozinha pra continuar legível.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">Sem personalização, usa o padrão escuro do sistema.</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="logo_url" className="text-sm font-medium">
          Logo do cabeçalho (URL da imagem)
        </label>
        <input
          id="logo_url"
          name="logo_url"
          type="text"
          placeholder="https://…"
          defaultValue={initialValues.logoUrl ?? ''}
          className="input"
        />
        <p className="text-xs text-muted">Deixe em branco pra manter o logo padrão.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="logo_login_url" className="text-sm font-medium">
          Logo da tela de login (URL da imagem)
        </label>
        <input
          id="logo_login_url"
          name="logo_login_url"
          type="text"
          placeholder="https://…"
          defaultValue={initialValues.logoLoginUrl ?? ''}
          className="input"
        />
        <p className="text-xs text-muted">
          Opcional — deixe em branco pra usar o mesmo logo do cabeçalho também no login.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="favicon_file" className="text-sm font-medium">
          Favicon
        </label>
        <div className="flex items-center gap-3">
          {initialValues.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={initialValues.faviconUrl}
              alt="Favicon atual"
              className="h-8 w-8 shrink-0 rounded border border-border bg-surface object-contain"
            />
          ) : null}
          <input id="favicon_file" name="favicon_file" type="file" accept="image/*" className="input" />
        </div>
        <p className="text-xs text-muted">
          Ícone que aparece na aba do navegador. Envie uma imagem quadrada (ex.: .png ou .ico) — o
          arquivo enviado tem prioridade sobre a URL abaixo.
        </p>
        <input
          id="favicon_url"
          name="favicon_url"
          type="text"
          placeholder="ou cole a URL de uma imagem já hospedada"
          defaultValue={initialValues.faviconUrl ?? ''}
          className="input"
        />
      </div>

      {state.error ? <p className="text-sm text-status-inactive">{state.error}</p> : null}
      {state.sucesso ? (
        <p className="text-sm text-status-active">Aparência salva com sucesso.</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Salvando…' : 'Salvar aparência'}
      </Button>
    </form>
  );
}
