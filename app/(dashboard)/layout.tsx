import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { filtrarPorFerramenta } from '@/lib/departamentos-tree';
import { getFraseMotivacionalDoDia } from '@/lib/frase-motivacional';
import { getClientesComPendenciaDoUsuario, getPendenciasQuadroDoUsuario } from '@/lib/indicadores';
import { getConfiguracaoMarca } from '@/lib/supabase/branding';
import { getDepartamentosPermitidos, podeAcessarDepartamento } from '@/lib/supabase/permissoes';
import { ehAdminInnovation, getCurrentProfile } from '@/lib/supabase/profile';
import { createClient } from '@/lib/supabase/server';
import type { Departamento } from '@/types/departamento';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  // Reverifica a cada request — se o admin desativou o usuário enquanto a
  // sessão dele já estava aberta, o login não teria como bloquear isso.
  if (profile.status === 'inativo') {
    await supabase.auth.signOut();
    redirect(
      `/login?erro=${encodeURIComponent('Este usuário foi desativado. Fale com o Administrador.')}`,
    );
  }

  const [{ data: todosDepartamentos }, permitidos, config, frase, pendenciasQuadro, clientesPendentes] =
    await Promise.all([
      supabase
        .from('departamentos')
        .select('*')
        .eq('status', 'ativo')
        .returns<Departamento[]>(),
      getDepartamentosPermitidos(),
      getConfiguracaoMarca(),
      getFraseMotivacionalDoDia(),
      getPendenciasQuadroDoUsuario(profile.id),
      getClientesComPendenciaDoUsuario(profile.id),
    ]);
  const mostrarQuadroTarefas = filtrarPorFerramenta(
    todosDepartamentos ?? [],
    'usa_quadro_tarefas',
  ).some((d) => d.usa_quadro_tarefas && podeAcessarDepartamento(permitidos, d.id));
  const mostrarProcessos = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_processos').some(
    (d) => d.usa_processos && podeAcessarDepartamento(permitidos, d.id),
  );
  const mostrarAlvaras = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_alvaras').some(
    (d) => d.usa_alvaras && podeAcessarDepartamento(permitidos, d.id),
  );
  const mostrarParcelamentos = filtrarPorFerramenta(todosDepartamentos ?? [], 'usa_parcelamentos').some(
    (d) => d.usa_parcelamentos && podeAcessarDepartamento(permitidos, d.id),
  );

  // Cabeçalho só conta/lista o que já pede atenção agora — atrasada ou
  // vencendo hoje; "próximos 7 dias" fica só pro detalhamento da Dashboard.
  const pendenciasQuadroHojeItens = pendenciasQuadro.filter(
    (p) => p.urgencia === 'atrasada' || p.urgencia === 'hoje',
  );

  return (
    <DashboardShell
      logoUrl={config.logo_url}
      frase={frase}
      isAdmin={profile.role === 'admin'}
      isAdminInnovation={ehAdminInnovation(profile)}
      mostrarQuadroTarefas={mostrarQuadroTarefas}
      mostrarProcessos={mostrarProcessos}
      mostrarAlvaras={mostrarAlvaras}
      mostrarParcelamentos={mostrarParcelamentos}
      pendenciasQuadroHojeItens={pendenciasQuadroHojeItens}
      clientesPendentes={clientesPendentes}
      usuario={{ nome: profile.nome, email: profile.email, role: profile.role }}
    >
      {children}
    </DashboardShell>
  );
}
