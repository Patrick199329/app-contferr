'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

export type FormState = {
  error: string | null;
  sucesso?: boolean;
};

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function parseUrlOpcional(valor: FormDataEntryValue | null, campo: string): string | null | { error: string } {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;
  if (!/^https?:\/\//i.test(texto)) {
    return { error: `${campo}: a URL deve começar com http:// ou https://` };
  }
  return texto;
}

export async function updateConfiguracaoMarca(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') {
    throw new Error('Não autorizado.');
  }

  const nomeSite = String(formData.get('nome_site') ?? '').trim() || null;

  const personalizarCabecalho = formData.get('personalizar_cabecalho') === 'on';
  const personalizarMenu = formData.get('personalizar_menu') === 'on';
  const personalizarCabecalhoTabela = formData.get('personalizar_cabecalho_tabela') === 'on';
  const corCabecalho = personalizarCabecalho ? String(formData.get('cor_cabecalho') ?? '').trim() : null;
  const corMenu = personalizarMenu ? String(formData.get('cor_menu_selecionado') ?? '').trim() : null;
  const corCabecalhoTabela = personalizarCabecalhoTabela
    ? String(formData.get('cor_cabecalho_tabela') ?? '').trim()
    : null;

  if (corCabecalho && !HEX_REGEX.test(corCabecalho)) {
    return { error: 'Cor do cabeçalho inválida.' };
  }
  if (corMenu && !HEX_REGEX.test(corMenu)) {
    return { error: 'Cor do menu selecionado inválida.' };
  }
  if (corCabecalhoTabela && !HEX_REGEX.test(corCabecalhoTabela)) {
    return { error: 'Cor do cabeçalho das tabelas inválida.' };
  }

  const logoUrl = parseUrlOpcional(formData.get('logo_url'), 'Logo');
  if (logoUrl && typeof logoUrl === 'object') return logoUrl;

  const logoLoginUrl = parseUrlOpcional(formData.get('logo_login_url'), 'Logo da tela de login');
  if (logoLoginUrl && typeof logoLoginUrl === 'object') return logoLoginUrl;

  const supabase = await createClient();

  // Upload de arquivo tem prioridade sobre a URL colada — se a pessoa
  // escolheu um arquivo, ignora o que estiver no campo de texto.
  const faviconFile = formData.get('favicon_file');
  let faviconUrl: string | null;
  if (faviconFile instanceof File && faviconFile.size > 0) {
    if (!faviconFile.type.startsWith('image/')) {
      return { error: 'Favicon: envie um arquivo de imagem.' };
    }
    const extensao = faviconFile.name.split('.').pop()?.toLowerCase() || 'png';
    const caminho = `favicon-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from('branding')
      .upload(caminho, faviconFile, { contentType: faviconFile.type, upsert: true });
    if (erroUpload) return { error: `Erro ao enviar favicon: ${erroUpload.message}` };
    faviconUrl = supabase.storage.from('branding').getPublicUrl(caminho).data.publicUrl;
  } else {
    const parsed = parseUrlOpcional(formData.get('favicon_url'), 'Favicon');
    if (parsed && typeof parsed === 'object') return parsed;
    faviconUrl = parsed;
  }

  const { error } = await supabase
    .from('configuracoes_marca')
    .update({
      cor_cabecalho: corCabecalho,
      cor_menu_selecionado: corMenu,
      cor_cabecalho_tabela: corCabecalhoTabela,
      logo_url: logoUrl,
      logo_login_url: logoLoginUrl,
      favicon_url: faviconUrl,
      nome_site: nomeSite,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  if (error) return { error: error.message };

  // Layout raiz busca a config em toda página (login incluso) — precisa
  // invalidar o cache dele, não só da própria tela de admin.
  revalidatePath('/', 'layout');
  return { error: null, sucesso: true };
}
