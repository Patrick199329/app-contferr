import { NextResponse, type NextRequest } from 'next/server';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';

// Primeiro passo do botão "Autorizar Google Drive" em /admin/backups — manda
// pra tela de permissão do Google. access_type=offline + prompt=consent
// garantem que um refresh_token novo sempre volte, mesmo que a pessoa já
// tenha autorizado antes (sem isso o Google às vezes pula o refresh_token
// numa reautorização).
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!ehAdminInnovation(profile)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/admin/backups?erro=' + encodeURIComponent('GOOGLE_CLIENT_ID não configurado.'), request.url),
    );
  }

  const redirectUri = new URL('/api/google-oauth/callback', request.url).toString();

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(url);
}
