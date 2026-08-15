# Padrão de Engenharia e Segurança do Projeto

> Documento de referência criado a partir do material de estudo reunido na pasta `Estudo`.
> Serve como checklist e guia de boas práticas a serem seguidas ao longo de todo o desenvolvimento deste projeto — do planejamento ao deploy em produção.

---

## 1. Planejamento e Arquitetura

### 1.1 PRD — Documento de Requisitos do Produto
Antes de abrir o editor de código, o time escreve o que o sistema precisa entregar.
- Evita o padrão "vamos fazendo e depois a gente vê".
- É o documento que impede a equipe de descobrir no fim que construiu a coisa errada.
- **Ação:** todo módulo/funcionalidade nova deve ter um PRD mínimo (objetivo, escopo, regras de negócio, critérios de aceite) antes da implementação.

### 1.2 Mapa do Sistema — Diagramas UML
Diagrama de classes e de sequência mostrando quem conversa com quem dentro do sistema.
- Mapeia qual classe chama qual, por onde o dado passa, o que acontece em cada ação do usuário.
- Sem esse mapa, o sistema "funciona por milagre" — e milagre em produção costuma dar ruim.
- **Ação:** manter diagramas atualizados para os fluxos críticos do sistema.

### 1.3 Catálogo de Funcionalidades — Arquitetura Modular
Cada parte do sistema deve ser um módulo independente, que liga e desliga (feature flags).
- Evita o "Frankenstein" de funcionalidades empilhadas que ninguém pediu, ninguém usa, e o time fica pagando manutenção para sempre.
- **Ação:** organizar o sistema em módulos/apps desacoplados, cada um ativável conforme a necessidade do cliente.

---

## 2. Controle de Acesso e Dados

### 2.1 RBAC — Matriz de Níveis de Acesso
Tabela documentando quem pode fazer o quê no sistema (ex.: Dono vê tudo, Admin vê quase tudo, Gerente vê o que é dele, Cliente vê só o próprio cadastro).
- Cada papel (role) ganha uma linha na tabela com as permissões exatas.
- Se houver célula em branco, alguém vai acessar o que não deveria — deixar tudo documentado.

### 2.2 Multi-tenancy — Separação de Clientes
Isolamento de dados por `tenant_id` quando o sistema atende mais de uma empresa/cliente.
- Cada cliente vive em um compartimento separado.
- O `tenant_id` é a chave que garante que o dado do Cliente A nunca se mistura com o do Cliente B.

### 2.3 RLS — Row Level Security (Trava dentro do banco)
A trava de acesso mora no banco de dados, não só na aplicação.
- Mesmo que alguém burle a interface, o banco se recusa a entregar linhas que não pertencem àquele usuário.
- **Ação:** aplicar políticas de RLS no banco como camada extra de defesa, além da autorização na aplicação.

### 2.4 Secrets Management — Nenhuma Senha no Código
Chaves de API, senhas de banco e tokens **nunca** podem ficar no código-fonte.
- Usar variáveis de ambiente (`.env`) e gerenciadores de segredos.
- Regra fixa do projeto: nenhum segredo é versionado no repositório.

---

## 3. Qualidade e Confiabilidade

### 3.1 Testes Automáticos
Testes unitários, de integração e E2E (ponta a ponta) rodando a cada alteração no código.
- Testa função por função, a comunicação entre elas, e o fluxo completo do usuário.
- Se algo quebrar, o "robô" (CI) grita antes do cliente perceber.
- O custo de não ter isso é o cliente descobrir o bug antes da equipe.

### 3.2 Botão de Reportar Erro — Error Reporting
Componente visível em toda tela (sem esconder em menu) para reporte de erros.
- Usa error boundary + captura de logs.
- Tira print da tela automaticamente, captura o log do erro e joga numa fila.
- Evita que o cliente abra chamado sem detalhe técnico e a equipe perca 40 minutos tentando reproduzir um problema que nem sabe qual foi.

### 3.3 Auditoria de Segurança — Gate de Deploy
Security audit feito por alguém do time antes de toda publicação.
- Pente-fino procurando vulnerabilidades: dependência desatualizada, rota exposta, permissão frouxa.
- Se a auditoria reprovar, o deploy trava. Não se publica com pendência de segurança conhecida.

---

## 4. Proteção em Produção

### 4.1 Escudo na Frente do Site — WAF + Rate Limiting
Firewall de aplicação (WAF) + Bot Fight Mode + limite de requisições por IP.
- Filtra tráfego suspeito antes de bater no servidor.
- Sem isso, o sistema recebe visita de robô o dia inteiro até alguém achar a porta aberta.

### 4.2 HTTPS e Cadeado Verde
TLS/SSL + HSTS configurado em modo **Full (Strict)**.
- Garante criptografia de ponta a ponta entre o navegador e o servidor.
- Requisito mínimo e não negociável para qualquer ambiente exposto à internet.

---

## Checklist Resumido

| # | Item | Categoria |
|---|------|-----------|
| 1 | PRD escrito antes de codar | Planejamento |
| 2 | Diagramas UML atualizados | Planejamento |
| 3 | Arquitetura modular / feature flags | Planejamento |
| 4 | Matriz RBAC documentada | Acesso |
| 5 | Multi-tenancy por `tenant_id` | Dados |
| 6 | RLS ativo no banco | Dados |
| 7 | Nenhum segredo no código (.env) | Dados |
| 8 | Testes unitários/integração/E2E | Qualidade |
| 9 | Botão de reportar erro | Qualidade |
| 10 | Auditoria de segurança antes do deploy | Qualidade |
| 11 | WAF + Rate Limiting ativos | Produção |
| 12 | HTTPS/TLS Full (Strict) | Produção |

---

*Documento gerado a partir da análise do material de estudo em `Estudo/`. Deve ser revisado e complementado pelo time conforme o projeto evolui.*
