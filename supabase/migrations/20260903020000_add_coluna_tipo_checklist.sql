-- Novo tipo de coluna "checklist": três estados fixos com ícone (Pendente /
-- Feito / Não se aplica), pra conferência de etapas — inspirado no padrão
-- que o cliente já usa numa ferramenta paralela. Não precisa de opções
-- configuráveis (os três estados são fixos), então continua fora de
-- COLUNA_TIPOS_COM_OPCOES no código.
alter type public.coluna_tipo add value 'checklist';
