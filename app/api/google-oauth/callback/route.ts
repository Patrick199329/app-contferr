import { NextResponse, type NextRequest } from 'next/server';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';

// Segundo passo — o Google manda a pessoa de volta pra cá com um código,
// trocado aqui por um refresh_token salvo em integracao_google_drive. A
// rotina de backup (scripts/backup-diario.mjs) lê sempre o valor mais
// recente dali, então essa troca de token não precisa mexer em nenhum
// secret do GitHub.
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!ehAdminInnovation(profile)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const erroGoogle = request.nextUrl.searchParams.get('error');
  if (erroGoogle) {
    return NextResponse.redirect(
      new URL(`/admin/backups?erro=${encodeURIComponent('Autorização cancelada no Google.')}`, request.url),
    );
  }

  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(
      new URL(`/admin/backups?erro=${encodeURIComponent('Código de autorização ausente.')}`, request.url),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        `/admin/backups?erro=${encodeURIComponent('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados.')}`,
        request.url,
      ),
    );
  }

  const redirectUri = new URL('/api/google-oauth/callback', request.url).toString();

  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok || !dados.refresh_token) {
    const mensagem = dados.refresh_token
      ? dados.error_description || 'Erro ao trocar o código pelo token.'
      : 'O Google não devolveu um refresh token — tente novamente (às vezes é preciso revogar o acesso anterior em myaccount.google.com/permissions e autorizar de novo).';
    return NextResponse.redirect(new URL(`/admin/backups?erro=${encodeURIComponent(mensagem)}`, request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('integracao_google_drive')
    .update({
      refresh_token: dados.refresh_token,
      atualizado_em: new Date().toISOString(),
      atualizado_por: profile!.id,
    })
    .eq('id', true);

  if (error) {
    return NextResponse.redirect(new URL(`/admin/backups?erro=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL('/admin/backups?autorizado=1', request.url));
}
