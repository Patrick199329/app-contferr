# Especificação Funcional — Contferr

---

## Módulo 1 — Cadastro de Clientes

- **Descrição:** cadastro central das empresas-clientes atendidas pela Contferr. É a base de dados que alimenta todos os departamentos — evita redigitação e divergência de nomes entre setores.
- **Atores / perfis envolvidos:** Administrador (cadastra, edita, desativa); Usuário Final (consulta, conforme permissão de departamento)
- **Regras de negócio:**
  - Cada cliente tem obrigatoriamente: razão social, nome fantasia e CNPJ
  - Nome fantasia existe como campo separado (não sinônimo de razão social) — foi uma dor explicitamente citada pelo cliente (divergência de nomenclatura entre setores)
  - CNPJ deve ter formato validado (máscara XX.XXX.XXX/XXXX-XX)
  - Um cliente não pode ser excluído enquanto tiver tarefas ativas vinculadas — apenas desativado
- **Dados envolvidos:** razão social, nome fantasia, CNPJ, status (ativo/inativo)
- **Casos de borda relevantes:**
  - Cliente inativado não deve aparecer na tabela de tarefas da competência atual, mas seu histórico deve ser preservado
  - Edição de nome fantasia/razão social deve refletir imediatamente em todas as telas que referenciam aquele cliente

---

## Módulo 2 — Departamentos e Colunas Configuráveis

- **Descrição:** o Administrador cria e configura os departamentos da Contferr e define quais colunas cada departamento terá na tabela de tarefas. Os departamentos reais do cliente são: pessoal, fiscal, lucro presumido/real e societário.
- **Atores / perfis envolvidos:** Administrador (cria e configura); Usuário Final (visualiza a estrutura do departamento ao qual tem acesso)
- **Regras de negócio:**
  - Cada departamento tem um nome e uma lista de colunas própria
  - Tipos de coluna suportados: texto livre, lista de opções (dropdown), data, status (ex.: pendente / em andamento / concluído), responsável (seleção de usuário do sistema)
  - As opções das colunas tipo "lista de opções" também são configuráveis pelo Administrador
  - Uma coluna não pode ser excluída enquanto houver dados registrados nela — apenas desativada
  - Ordem das colunas deve ser reordenável pelo Administrador
- **Dados envolvidos:** nome do departamento, lista de colunas (nome, tipo, opções quando aplicável, ordem, status ativo/inativo)
- **Casos de borda relevantes:**
  - Desativar uma coluna não deve apagar os dados históricos já registrados nela — apenas ocultá-la da visão atual
  - Renomear um departamento ou coluna deve refletir em todo o sistema (inclusive no histórico de competências anteriores)

---

## Módulo 3 — Tabela de Tarefas

- **Descrição:** visão central do trabalho da Contferr. Exibe as tarefas do mês corrente por cliente, organizadas por departamento. O usuário atualiza status, responsável e demais campos definidos para aquele departamento.
- **Atores / perfis envolvidos:** Administrador e Usuário Final (ambos leem e editam, dentro das permissões configuradas)
- **Regras de negócio:**
  - A tabela exibe os clientes da competência mensal corrente para o departamento selecionado
  - Cada linha da tabela = um cliente × uma competência × um departamento
  - As colunas disponíveis dependem da configuração do Módulo 2 para aquele departamento
  - Apenas usuários com permissão para o departamento podem visualizar e editar as tarefas daquele departamento
  - Edições são salvas imediatamente (sem necessidade de botão "salvar" manual)
  - Deve ser possível filtrar ou buscar por cliente dentro da tabela
- **Dados envolvidos:** cliente (referência ao Módulo 1), competência (mês/ano), departamento, valores dos campos configurados no Módulo 2, usuário que fez a última edição, data/hora da última edição
- **Casos de borda relevantes:**
  - Dois usuários editando o mesmo registro simultaneamente: o sistema deve garantir que a última gravação não sobrescreva silenciosamente a anterior sem aviso — ⚠️ **definir comportamento com Patrick** (último grava / lock / aviso de conflito)
  - Se um novo cliente for adicionado no meio do mês, ele deve aparecer na tabela da competência corrente imediatamente

---

## Módulo 4 — Histórico e Virada Mensal

- **Descrição:** ao final de cada mês, o sistema preserva o estado completo da tabela de tarefas e inicia uma nova competência vazia (ou pré-populada com os mesmos clientes). O histórico de meses anteriores fica acessível para consulta.
- **Atores / perfis envolvidos:** Administrador (configura regras de virada, se houver); Usuário Final (consulta histórico); o processo de virada em si é automático
- **Regras de negócio:**
  - A virada mensal acontece automaticamente na virada do mês (sem intervenção manual)
  - O histórico de competências anteriores é somente-leitura — não pode ser editado retroativamente
  - A nova competência deve trazer automaticamente todos os clientes ativos — as colunas de status/valores começam vazias (ou com valor padrão configurado, ⚠️ **a confirmar com Patrick se haverá valor padrão por coluna**)
  - O acesso ao histórico de competências anteriores respeita as mesmas permissões de departamento do Módulo 6
- **Dados envolvidos:** snapshot da tabela de tarefas por competência (mês/ano), incluindo todos os valores de colunas no momento da virada
- **Casos de borda relevantes:**
  - Um cliente inativado antes da virada não deve aparecer na nova competência, mas deve constar no histórico da competência em que estava ativo
  - Se a virada automática falhar (erro de sistema), deve haver log de falha e mecanismo de reprocessamento manual pelo Administrador

---

## Módulo 5 — Permissões

- **Descrição:** define o que cada usuário pode ver e fazer na plataforma. O Administrador configura o acesso de cada Usuário Final: quais departamentos ele vê e se pode editar ou só visualizar.
- **Atores / perfis envolvidos:** Administrador (configura permissões); Usuário Final (opera dentro do que foi liberado)
- **Regras de negócio:**
  - Dois perfis base: **Administrador** e **Usuário Final**
  - Administrador: acesso irrestrito a todos os módulos, incluindo configuração de departamentos, colunas, usuários e permissões
  - Usuário Final: vê apenas os departamentos aos quais foi explicitamente liberado; dentro de cada departamento, pode ter acesso de edição ou somente leitura (⚠️ **confirmar com Patrick se haverá distinção visualizar/editar por departamento ou só liberado/bloqueado**)
  - Um usuário sem acesso a um departamento não deve nem ver a existência daquele departamento na interface
  - Alterações de permissão têm efeito imediato (sem necessidade de logout/login)
- **Dados envolvidos:** usuário, perfil (Admin/Usuário Final), lista de departamentos liberados com nível de acesso
- **Casos de borda relevantes:**
  - Se um Administrador revogar o acesso de um usuário que está logado, o usuário deve perder o acesso na próxima ação (ou imediatamente, via invalidação de sessão)
  - Deve haver pelo menos um Administrador ativo no sistema em todo momento — o sistema não deve permitir que o último Admin seja rebaixado

---

## Módulo 6 — Painel Administrativo

- **Descrição:** interface centralizada onde o Administrador gerencia toda a configuração da plataforma: departamentos, colunas, usuários, permissões e listas de opções.
- **Atores / perfis envolvidos:** somente Administrador
- **Regras de negócio:**
  - Funções disponíveis: criar/editar/desativar departamentos; criar/editar/desativar colunas; gerenciar opções de colunas tipo dropdown; criar/editar/desativar usuários; configurar permissões por usuário
  - Desativação (não exclusão) é o padrão para qualquer entidade com dados históricos vinculados
  - Ações de configuração devem gerar log básico (quem fez o quê e quando) — ⚠️ **confirmar com Patrick nível de detalhe do log necessário**
- **Dados envolvidos:** departamentos, colunas, usuários, permissões, listas de opções, log de ações administrativas
- **Casos de borda relevantes:**
  - Administrador não deve conseguir excluir (apenas desativar) um usuário que tenha registros de tarefas vinculados a ele

---

## Perfis de acesso — visão consolidada

| Ação | Administrador | Usuário Final |
|---|---|---|
| Cadastrar / editar / desativar clientes | ✅ | ❌ |
| Visualizar clientes | ✅ | ✅ (dentro dos depart. com acesso) |
| Criar / editar departamentos e colunas | ✅ | ❌ |
| Visualizar tabela de tarefas | ✅ (todos os depart.) | ✅ (somente depart. liberados) |
| Editar tarefas na tabela | ✅ | ✅ (dentro dos depart. liberados) |
| Consultar histórico de competências | ✅ | ✅ (somente depart. liberados) |
| Editar histórico retroativamente | ❌ | ❌ |
| Gerenciar usuários e permissões | ✅ | ❌ |
| Acessar painel administrativo | ✅ | ❌ |
