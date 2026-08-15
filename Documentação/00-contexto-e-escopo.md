# Contexto e Escopo — Contferr

## Cenário do cliente
Contferr é um escritório de contabilidade com uma carteira entre 400 e 500 empresas-clientes atendidas por uma equipe de aproximadamente 27 colaboradores, divididos em departamentos (pessoal, fiscal, lucro presumido/real, societário). O contato responsável é Marcos, que intermediou a contratação. A dor que motivou o projeto: o controle de tarefas recorrentes era feito de forma dispersa — Notion, planilhas e Google Drive — sem visão consolidada por cliente/departamento, sem histórico auditável e com risco de retrabalho e perda de prazo.

## Pacote contratado
- **Classificação real de escopo:** Sob Medida (múltiplos departamentos configuráveis, permissões granulares, virada mensal automática, auditoria)
- **Setup:** R$ 2.400,00 — valor acordado com o cliente (piso do pacote Essencial, aceito como exceção estratégica por potencial de indicação)
- **Mensalidade:** R$ 250,00 — exceção documentada, abaixo do piso Sob Medida (R$ 397); não replicar para outros contratos
- **Prazo de entrega combinado:** 20 a 30 dias (compromisso verbal assumido com Marcos)
- **Condição de pagamento:** 50% na assinatura + 50% na entrega, ou 3× sem juros no cartão

> ⚠️ **Nota comercial (não bloqueia o desenvolvimento):** houve registros de versões do contrato com o valor desatualizado de R$ 2.100,00 em duas cláusulas. Confirmar com Patrick se o CONTRATO_Contferr_Innovation_v2_2.docx já tem os dois valores corrigidos antes de emitir qualquer documento novo para o cliente.

## Objetivo de negócio da plataforma
Substituir o controle manual e disperso das tarefas recorrentes por departamento por uma ferramenta única, que permita ao gestor enxergar o status de cada cliente em cada competência mensal, com histórico auditável e sem depender de comunicação informal para saber o que está pendente.

## Escopo aprovado (o que entra)

1. **Cadastro de clientes** — razão social, nome fantasia, CNPJ
2. **Departamentos configuráveis** — criação e edição de departamentos pelo Administrador; departamentos reais do cliente: pessoal, fiscal, lucro presumido/real, societário
3. **Colunas configuráveis por departamento** — tipos de coluna: texto, lista de opções, data, status, responsável
4. **Tabela de tarefas** — visão central por cliente × competência mensal; atualização de status e responsável
5. **Histórico e virada mensal automática** — preservação do histórico de competências anteriores; virada sem exclusão de dados
6. **Permissões granulares** — perfis Administrador e Usuário Final, com liberação seletiva de departamentos e funcionalidades por usuário
7. **Painel administrativo** — configuração de departamentos, colunas, listas de opções, usuários e permissões

## Fora de escopo (o que explicitamente não entra)
- **Notificações automáticas** (e-mail, WhatsApp, push) — Marcos foi explícito: não precisa de notificações complexas nesta fase
- **Dashboards analíticos e relatórios gerenciais avançados** — evolução futura, orçável via OAE
- **Integrações com ERP** — a Contferr mantém seus sistemas atuais para isso
- **Guarda documental e certificados digitais** — ficam nos softwares próprios que ela já usa
- **Aplicativo mobile nativo** — plataforma responsiva via navegador; app nativo fora de escopo nesta versão

## Decisões-chave já tomadas
- Volume dimensionado para **até 30 usuários ativos** e **até 500 clientes cadastrados** (o número de usuários não se confunde com a carteira: os 27 colaboradores são usuários; os 400–500 empresas são registros na base de clientes)
- Armazenamento não tem número fixo contratado — vinculado à cláusula de reajuste por variação de infraestrutura (Cláusula 12, §3º, II do contrato)
- Um departamento (sob gestão de Priscilla) teve início atrasado por reestruturação interna do time do cliente — não é requisito funcional novo, apenas operacional; o sistema deve ser desenvolvido completo, e a ordem de onboarding é decisão do cliente
- A plataforma **substitui** passos manuais (não adiciona camada em cima deles) — esse posicionamento é crítico para adoção, deve estar claro nos textos de interface e no onboarding

## Pendências — ⚠️ A CONFIRMAR COM O CLIENTE
- **Número exato de clientes cadastrados atualmente:** usado "até 500" como estimativa a partir de "entre 400 e 500" mencionado em reunião. Se Patrick tiver o número real da carteira ativa, ajustar antes de fechar dimensionamento.
- **Prazo de entrega formal:** o compromisso de 20–30 dias foi verbal. O contrato não tinha essa informação explícita na versão analisada — confirmar se foi inserida em versão posterior.

## Referências
- Contrato: CONTRATO_Contferr_Innovation_v2_2.docx (Anexo I — Especificação Funcional preenchida)
- Ata de reunião de alinhamento inicial entre Patrick e Marcos
- Proposta comercial Apresentação_Innovation_2026_Sistema_-_Contfer_v4.pptx
- Conversa "In | PL | Criação/Análise de propostas | Projeto de plataformas" (avaliação, iterações e fechamento da proposta; preenchimento do Anexo I)
