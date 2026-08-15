# Notas Técnicas — Contferr

---

## Stack

Stack padrão da Innovation: **Next.js + Supabase (Postgres) + Vercel**.

**Desenvolvimento e validação funcional acontecem primeiro em ambiente local** — Supabase local via CLI (ou equivalente) e Next.js rodando localmente. Supabase Cloud e Vercel entram somente na Fase 6 (deploy). Isso reduz custo de erro nas iterações e elimina dependência de credenciais de produção durante o desenvolvimento.

Específico deste projeto:

- **Sem realtime crítico:** a tabela de tarefas não precisa de sincronização em tempo real entre usuários simultâneos (o volume de 27 colaboradores não justifica WebSocket/Supabase Realtime obrigatório nesta fase). Atualização por polling ou refresh manual é aceitável. O comportamento de edição simultânea (ver Módulo 3, caso de borda) é a única exceção a avaliar.
- **Sem storage de arquivos:** nenhum módulo do escopo aprovado prevê upload de arquivos — não provisionar Supabase Storage.
- **Sem jobs agendados externos:** a virada mensal automática (Módulo 4) pode ser implementada como função disparada via cron job. No Supabase, isso pode ser feito via `pg_cron` (extensão nativa do Postgres) — avaliar durante o desenvolvimento se pg_cron é suficiente ou se um job externo (ex.: Vercel Cron) é mais adequado para o padrão da Innovation.

---

## Integrações necessárias

**Nenhuma integração externa nesta versão.**

Certificados digitais, guarda documental e ERP permanecem nos sistemas próprios da Contferr. A plataforma não se comunica com nenhum sistema externo.

---

## Requisitos não-funcionais

**Performance:**
- Até 30 usuários simultâneos
- Base de até 500 clientes cadastrados
- Nenhum requisito de performance específico foi declarado pelo cliente além do "não travar" — o volume é compatível com o plano Supabase Pro padrão sem otimizações especiais

**Dados sensíveis / LGPD:**
- A plataforma armazena razão social, nome fantasia e CNPJ das empresas-clientes da Contferr — dados cadastrais de pessoa jurídica, não dados sensíveis de pessoa física
- Não há armazenamento de dados pessoais de clientes finais das empresas-clientes
- Sinalizar na entrega ao cliente que o operador de dados é a Innovation (que controla a infraestrutura) e o controlador é a Contferr — conforme estrutura já definida no contrato

**Backup e disponibilidade:**
- Nada além do padrão da Innovation foi prometido contratualmente
- Disponibilidade alvo de 99,5% e resposta a chamados em 1 dia útil foram mencionados na proposta comercial (slide de investimento) — não há SLA diferenciado no contrato

---

## Restrições explícitas

- **Sem app mobile nativo** nesta fase — a plataforma deve ser responsiva via navegador (mobile-friendly), mas não há app dedicado
- **Sem notificações automáticas** (e-mail, WhatsApp, push) — o cliente foi explícito que não quer isso nesta versão; não implementar nem deixar preparado de forma visível na interface
- **Histórico de competências é somente-leitura** — nenhum perfil de usuário pode editar dados de meses anteriores; a restrição é de negócio (auditoria), não só de UX
- **Desativação, não exclusão** — entidades com dados históricos vinculados (clientes, departamentos, colunas, usuários) nunca são excluídas fisicamente; apenas marcadas como inativas

---

## Fora deste documento

Este documento não inclui desenho de schema de banco de dados nem DDL — essa etapa acontece durante o desenvolvimento real no Antigravity, com base na especificação funcional acima.
