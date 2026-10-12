export type FraseMotivacional = { texto: string; autor: string };

// Curadoria própria, em português, revisada uma a uma — sem depender de API
// externa nem de tradução automática. A versão anterior buscava uma frase
// aleatória em inglês (zenquotes.io) e traduzia na hora (MyMemory); o
// problema é que nenhuma das duas dá pra filtrar por "seguro pra um cliente
// ler" — uma frase de efeito legítima em outro idioma/contexto pode soar
// completamente diferente traduzida e fora de contexto (ex.: "Quem sair do
// jogo ganha", de Nicolas Chamfort, lida solta num sistema de gestão de
// equipe passa a impressão errada). Rotaciona uma por dia, sem repetir até
// dar a volta na lista inteira.
const FRASES: FraseMotivacional[] = [
  { texto: 'A disciplina é a ponte entre objetivos e realizações.', autor: 'Jim Rohn' },
  { texto: 'O sucesso deixa pistas.', autor: 'Jim Rohn' },
  { texto: 'Não deseje que seja mais fácil; deseje ser melhor.', autor: 'Jim Rohn' },
  { texto: 'Ou você administra o dia, ou o dia administra você.', autor: 'Jim Rohn' },
  { texto: 'O sucesso não deve ser perseguido; deve ser atraído pela pessoa que você se torna.', autor: 'Jim Rohn' },

  { texto: 'Faça o que puder, com o que tiver, onde estiver.', autor: 'Theodore Roosevelt' },
  { texto: 'Acredite que você pode e já estará no meio do caminho.', autor: 'Theodore Roosevelt' },
  { texto: 'As pessoas perguntam a diferença entre um líder e um chefe. O líder trabalha abertamente; o chefe, em segredo.', autor: 'Theodore Roosevelt' },
  { texto: 'O melhor prêmio que a vida oferece é a oportunidade de trabalhar duro em algo que vale a pena.', autor: 'Theodore Roosevelt' },
  { texto: 'É melhor ousar grandes coisas do que viver no horizonte cinzento de quem não conhece vitória nem derrota.', autor: 'Theodore Roosevelt' },

  { texto: 'Decidir o que não fazer é tão importante quanto decidir o que fazer.', autor: 'Steve Jobs' },
  { texto: 'Inovação distingue um líder de um seguidor.', autor: 'Steve Jobs' },
  { texto: 'A única maneira de fazer um excelente trabalho é amar o que você faz.', autor: 'Steve Jobs' },
  { texto: 'Seu tempo é limitado; não o desperdice vivendo a vida de outra pessoa.', autor: 'Steve Jobs' },
  { texto: 'Tenha coragem para seguir seu coração e sua intuição.', autor: 'Steve Jobs' },
  { texto: 'Às vezes, a vida acerta você com um tijolo. Não perca a fé.', autor: 'Steve Jobs' },
  { texto: 'Continue com fome. Continue com vontade de aprender.', autor: 'Steve Jobs' },

  { texto: 'Eficiência é fazer as coisas corretamente; eficácia é fazer as coisas certas.', autor: 'Peter Drucker' },
  { texto: 'Não há nada tão inútil quanto fazer com eficiência algo que não deveria ser feito.', autor: 'Peter Drucker' },
  { texto: 'O tempo é o recurso mais escasso; se ele não for administrado, nada mais poderá ser.', autor: 'Peter Drucker' },
  { texto: 'Planejamento de longo prazo trata do futuro das decisões presentes.', autor: 'Peter Drucker' },
  { texto: 'Resultados são obtidos explorando oportunidades, não apenas resolvendo problemas.', autor: 'Peter Drucker' },
  { texto: 'Uma inovação eficaz precisa ser simples e focada.', autor: 'Peter Drucker' },
  { texto: 'A melhor maneira de prever o futuro é criá-lo.', autor: 'Peter Drucker' },
  { texto: 'Gestão é fazer as coisas direito; liderança é fazer as coisas certas.', autor: 'Peter Drucker' },
  { texto: 'O objetivo do marketing é conhecer tão bem o cliente que o produto se venda sozinho.', autor: 'Peter Drucker' },
  { texto: 'Conhecimento precisa ser melhorado, desafiado e aumentado constantemente.', autor: 'Peter Drucker' },
  { texto: 'A liderança eleva a visão das pessoas para horizontes mais altos.', autor: 'Peter Drucker' },
  { texto: 'Começar pela pergunta “qual deve ser minha contribuição?” traz responsabilidade.', autor: 'Peter Drucker' },

  { texto: 'Qualidade significa fazer certo quando ninguém está olhando.', autor: 'Henry Ford' },
  { texto: 'Reunir-se é um começo; permanecer juntos é progresso; trabalhar juntos é sucesso.', autor: 'Henry Ford' },
  { texto: 'O concorrente mais temido é aquele que continua melhorando o próprio negócio.', autor: 'Henry Ford' },
  { texto: 'Empresas que crescem por meio do desenvolvimento e da melhoria não morrem.', autor: 'Henry Ford' },
  { texto: 'Esteja pronto para revisar qualquer sistema quando o sucesso do trabalho exigir.', autor: 'Henry Ford' },
  { texto: 'Não existe progresso em melhorar a execução de algo que nem deveria ser feito.', autor: 'Henry Ford' },
  { texto: 'Há segurança nos pequenos começos e grande valor na experiência adquirida ao crescer.', autor: 'Henry Ford' },
  { texto: 'O começo de qualquer objetivo está no conhecimento, na experiência e no trabalho.', autor: 'Henry Ford' },
  { texto: 'O fracasso é apenas a oportunidade de começar novamente com mais inteligência.', autor: 'Henry Ford' },
  { texto: 'Pensar é o trabalho mais difícil que existe.', autor: 'Henry Ford' },
  { texto: 'Uma empresa absolutamente dedicada ao serviço terá apenas uma preocupação com os lucros: eles serão grandes.', autor: 'Henry Ford' },
  { texto: 'Se todos estiverem avançando juntos, o sucesso acontecerá naturalmente.', autor: 'Henry Ford' },

  { texto: 'Sem dados, você é apenas mais uma pessoa com uma opinião.', autor: 'W. Edwards Deming' },
  { texto: 'Não é necessário mudar. A sobrevivência não é obrigatória.', autor: 'W. Edwards Deming' },
  { texto: 'Não basta fazer o melhor; primeiro você precisa saber o que fazer.', autor: 'W. Edwards Deming' },
  { texto: 'Um sistema deve ser administrado; ele não administra a si mesmo.', autor: 'W. Edwards Deming' },
  { texto: 'A qualidade é responsabilidade de todos.', autor: 'W. Edwards Deming' },
  { texto: 'Aprendizado não é obrigatório, mas também não é a sobrevivência.', autor: 'W. Edwards Deming' },
  { texto: 'Um objetivo sem método é apenas um desejo.', autor: 'W. Edwards Deming' },
  { texto: 'Melhorar constantemente o sistema melhora também os resultados.', autor: 'W. Edwards Deming' },

  { texto: 'Qualidade começa pela educação e termina pela educação.', autor: 'Kaoru Ishikawa' },
  { texto: 'O controle de qualidade começa e termina com treinamento.', autor: 'Kaoru Ishikawa' },
  { texto: 'O primeiro passo da qualidade é conhecer as necessidades do cliente.', autor: 'Kaoru Ishikawa' },
  { texto: 'Qualidade significa fazer o que foi combinado e satisfazer o cliente.', autor: 'Kaoru Ishikawa' },

  { texto: 'Qualidade é adequação ao uso.', autor: 'Joseph M. Juran' },
  { texto: 'Sem um padrão, não existe base lógica para tomar uma decisão.', autor: 'Joseph M. Juran' },
  { texto: 'Todo processo apresenta oportunidades de planejamento, controle e melhoria.', autor: 'Joseph M. Juran' },
  { texto: 'O objetivo da gestão é remover problemas crônicos e promover melhorias.', autor: 'Joseph M. Juran' },

  { texto: 'Qualidade é conformidade com os requisitos.', autor: 'Philip Crosby' },
  { texto: 'Qualidade não custa dinheiro; o que custa é a falta de qualidade.', autor: 'Philip Crosby' },
  { texto: 'Fazer certo da primeira vez é mais barato.', autor: 'Philip Crosby' },
  { texto: 'O preço da não conformidade revela o verdadeiro custo da baixa qualidade.', autor: 'Philip Crosby' },

  { texto: 'A melhoria geralmente significa fazer algo que nunca fizemos antes.', autor: 'Shigeo Shingo' },
  { texto: 'Os quatro objetivos da melhoria são: mais fácil, melhor, mais rápido e mais barato.', autor: 'Shigeo Shingo' },
  { texto: 'Uma ação tomada imediatamente vale mais que uma grande ideia nunca executada.', autor: 'Shigeo Shingo' },
  { texto: 'Primeiro diga que consegue; depois descubra como fazer.', autor: 'Shigeo Shingo' },

  { texto: 'Seja a mudança que você deseja ver no mundo.', autor: 'Mahatma Gandhi' },
  { texto: 'O futuro depende do que fazemos no presente.', autor: 'Mahatma Gandhi' },
  { texto: 'A satisfação está no esforço, não apenas na conquista.', autor: 'Mahatma Gandhi' },
  { texto: 'A força não vem da capacidade física, mas de uma vontade determinada.', autor: 'Mahatma Gandhi' },

  { texto: 'Sempre parece impossível até que seja feito.', autor: 'Nelson Mandela' },
  { texto: 'Não há paixão em viver uma vida menor do que aquela que você é capaz de viver.', autor: 'Nelson Mandela' },
  { texto: 'Depois de subir uma grande montanha, descobrimos que ainda existem muitas outras.', autor: 'Nelson Mandela' },
  { texto: 'Eu nunca perco: ou ganho, ou aprendo.', autor: 'Nelson Mandela' },

  { texto: 'Sozinhos podemos fazer pouco; juntos podemos fazer muito.', autor: 'Helen Keller' },
  { texto: 'A vida é uma aventura ousada ou não é nada.', autor: 'Helen Keller' },
  { texto: 'O otimismo é a fé que conduz à realização.', autor: 'Helen Keller' },
  { texto: 'Nenhum pessimista descobriu o segredo das estrelas ou navegou por terras desconhecidas.', autor: 'Helen Keller' },

  { texto: 'Você não pode usar a criatividade até o fim; quanto mais usa, mais possui.', autor: 'Maya Angelou' },
  { texto: 'Faça o melhor que puder até saber mais. Quando souber mais, faça melhor.', autor: 'Maya Angelou' },
  { texto: 'Nada funciona se você não trabalhar.', autor: 'Maya Angelou' },
  { texto: 'Sucesso é gostar de si mesmo, gostar do que faz e gostar de como faz.', autor: 'Maya Angelou' },

  { texto: 'A sorte favorece a mente preparada.', autor: 'Louis Pasteur' },
  { texto: 'Não existem ciências aplicadas; existem aplicações da ciência.', autor: 'Louis Pasteur' },
  { texto: 'As dificuldades vencidas são oportunidades conquistadas.', autor: 'Winston Churchill' },
  { texto: 'O sucesso é caminhar de fracasso em fracasso sem perder o entusiasmo.', autor: 'Winston Churchill' },

  { texto: 'Genialidade é um por cento inspiração e noventa e nove por cento transpiração.', autor: 'Thomas Edison' },
  { texto: 'Nossa maior fraqueza está em desistir.', autor: 'Thomas Edison' },
  { texto: 'Há uma maneira de fazer melhor. Encontre-a.', autor: 'Thomas Edison' },
  { texto: 'O valor de uma ideia está em colocá-la em prática.', autor: 'Thomas Edison' },
  { texto: 'Eu não falhei; encontrei maneiras que não funcionaram.', autor: 'Thomas Edison' },

  { texto: 'Uma jornada de mil quilômetros começa com um único passo.', autor: 'Lao-Tsé' },
  { texto: 'Conhecer os outros é inteligência; conhecer a si mesmo é verdadeira sabedoria.', autor: 'Lao-Tsé' },
  { texto: 'Grandes realizações são formadas por pequenos atos.', autor: 'Lao-Tsé' },

  { texto: 'Não importa quão devagar você avance, desde que não pare.', autor: 'Confúcio' },
  { texto: 'Aquele que move uma montanha começa carregando pequenas pedras.', autor: 'Confúcio' },
  { texto: 'Escolha um trabalho de que goste e não terá de trabalhar um único dia em sua vida.', autor: 'Confúcio' },
  { texto: 'O homem que comete um erro e não o corrige está cometendo outro erro.', autor: 'Confúcio' },

  { texto: 'Começar é metade da ação.', autor: 'Aristóteles' },
  { texto: 'O prazer no trabalho aperfeiçoa a obra.', autor: 'Aristóteles' },
  { texto: 'Somos aquilo que fazemos repetidamente.', autor: 'Will Durant' },
  { texto: 'Excelência não é um ato, mas um hábito.', autor: 'Will Durant' },

  { texto: 'A sorte acontece quando a preparação encontra a oportunidade.', autor: 'Sêneca' },
  { texto: 'Não é porque as coisas são difíceis que não ousamos; elas são difíceis porque não ousamos.', autor: 'Sêneca' },
  { texto: 'Enquanto adiamos, a vida passa.', autor: 'Sêneca' },
  { texto: 'Se alguém não sabe para qual porto navega, nenhum vento lhe é favorável.', autor: 'Sêneca' },

  { texto: 'A felicidade da sua vida depende da qualidade dos seus pensamentos.', autor: 'Marco Aurélio' },
  { texto: 'O impedimento à ação promove a ação; o obstáculo se torna o caminho.', autor: 'Marco Aurélio' },
  { texto: 'Você tem poder sobre sua mente, não sobre os acontecimentos externos.', autor: 'Marco Aurélio' },
  { texto: 'Não perca mais tempo discutindo como deve ser uma boa pessoa. Seja uma.', autor: 'Marco Aurélio' },

  { texto: 'Uma meta é um sonho com prazo.', autor: 'Napoleon Hill' },
  { texto: 'O ponto de partida de toda conquista é o desejo.', autor: 'Napoleon Hill' },
  { texto: 'É sempre a sua próxima ação que realmente importa.', autor: 'Napoleon Hill' },
  { texto: 'Força e crescimento surgem por meio de esforço e luta contínuos.', autor: 'Napoleon Hill' },

  { texto: 'Um objetivo devidamente estabelecido já está na metade do caminho.', autor: 'Zig Ziglar' },
  { texto: 'Você não precisa ser excelente para começar, mas precisa começar para ser excelente.', autor: 'Zig Ziglar' },
  { texto: 'A atitude, não a aptidão, determina a altitude.', autor: 'Zig Ziglar' },
  { texto: 'Se você mirar em nada, acertará todas as vezes.', autor: 'Zig Ziglar' },

  { texto: 'Liderança é influência, nada mais, nada menos.', autor: 'John C. Maxwell' },
  { texto: 'Um líder conhece o caminho, percorre o caminho e mostra o caminho.', autor: 'John C. Maxwell' },
  { texto: 'Trabalho em equipe faz o sonho funcionar.', autor: 'John C. Maxwell' },
  { texto: 'A mudança é inevitável; o crescimento é opcional.', autor: 'John C. Maxwell' },

  { texto: 'Comece com o objetivo em mente.', autor: 'Stephen R. Covey' },
  { texto: 'A chave não é priorizar a agenda, mas agendar as prioridades.', autor: 'Stephen R. Covey' },
  { texto: 'A maioria das pessoas não escuta para compreender; escuta para responder.', autor: 'Stephen R. Covey' },
  { texto: 'Força está nas diferenças, não nas semelhanças.', autor: 'Stephen R. Covey' },
  { texto: 'Sou resultado das minhas decisões, não das minhas circunstâncias.', autor: 'Stephen R. Covey' },

  { texto: 'O preço é o que você paga; valor é o que você recebe.', autor: 'Warren Buffett' },
  { texto: 'Leva vinte anos para construir uma reputação e cinco minutos para destruí-la.', autor: 'Warren Buffett' },
  { texto: 'Risco vem de não saber o que você está fazendo.', autor: 'Warren Buffett' },
  { texto: 'Não importa o talento ou o esforço: algumas coisas simplesmente levam tempo.', autor: 'Warren Buffett' },
  { texto: 'A diferença entre pessoas bem-sucedidas e muito bem-sucedidas é que as últimas dizem não para quase tudo.', autor: 'Warren Buffett' },

  { texto: 'Se você nunca quiser ser criticado, não faça nada novo.', autor: 'Jeff Bezos' },
  { texto: 'Sua marca é aquilo que as pessoas dizem sobre você quando você não está presente.', autor: 'Jeff Bezos' },
  { texto: 'Se focarmos nos concorrentes, estaremos sempre esperando; se focarmos nos clientes, seremos pioneiros.', autor: 'Jeff Bezos' },
  { texto: 'O que é perigoso é não evoluir.', autor: 'Jeff Bezos' },

  { texto: 'Seus clientes mais insatisfeitos são sua maior fonte de aprendizado.', autor: 'Bill Gates' },
  { texto: 'É bom celebrar o sucesso, mas é mais importante aprender com o fracasso.', autor: 'Bill Gates' },
  { texto: 'Para vencer grande, às vezes é preciso assumir grandes riscos.', autor: 'Bill Gates' },
  { texto: 'Não se compare com ninguém; isso é um desrespeito consigo mesmo.', autor: 'Bill Gates' },

  { texto: 'O modo de começar é parar de falar e começar a fazer.', autor: 'Walt Disney' },
  { texto: 'Todos os nossos sonhos podem se tornar realidade se tivermos coragem de persegui-los.', autor: 'Walt Disney' },
  { texto: 'É divertido fazer o impossível.', autor: 'Walt Disney' },
  { texto: 'A diferença entre ganhar e perder geralmente está em não desistir.', autor: 'Walt Disney' },

  { texto: 'Se você quer ir rápido, vá sozinho; se quer ir longe, vá acompanhado.', autor: 'Ratan Tata' },
  { texto: 'Não acredito em tomar decisões certas; tomo decisões e trabalho para torná-las certas.', autor: 'Ratan Tata' },
  { texto: 'Os altos e baixos são importantes para continuarmos avançando.', autor: 'Ratan Tata' },

  { texto: 'Grandes coisas nos negócios nunca são feitas por uma pessoa, mas por uma equipe.', autor: 'Steve Jobs' },
  { texto: 'O crescimento e o conforto não coexistem.', autor: 'Ginni Rometty' },
  { texto: 'A liderança é fazer os outros melhores como resultado da sua presença.', autor: 'Sheryl Sandberg' },
  { texto: 'Feito é melhor que perfeito.', autor: 'Sheryl Sandberg' },

  { texto: 'Não encontre defeitos; encontre soluções.', autor: 'Henry Ford' },
  { texto: 'A simplicidade é o último grau de sofisticação.', autor: 'Leonardo da Vinci' },
  { texto: 'Os detalhes fazem a perfeição, e a perfeição não é um detalhe.', autor: 'Leonardo da Vinci' },
  { texto: 'Aprender nunca esgota a mente.', autor: 'Leonardo da Vinci' },

  { texto: 'Ao falhar na preparação, você está se preparando para falhar.', autor: 'Benjamin Franklin' },
  { texto: 'Um investimento em conhecimento sempre paga os melhores juros.', autor: 'Benjamin Franklin' },
  { texto: 'Tempo perdido nunca é encontrado novamente.', autor: 'Benjamin Franklin' },
  { texto: 'Bem feito é melhor que bem dito.', autor: 'Benjamin Franklin' },

  { texto: 'Sucesso é conseguir o que você quer; felicidade é querer o que conseguiu.', autor: 'Dale Carnegie' },
  { texto: 'Desenvolva o sucesso a partir dos fracassos.', autor: 'Dale Carnegie' },
  { texto: 'Pessoas bem-sucedidas aprendem com seus erros e tentam novamente.', autor: 'Dale Carnegie' },
  { texto: 'Aja com entusiasmo e você se tornará entusiasmado.', autor: 'Dale Carnegie' },

  { texto: 'O segredo para avançar é começar.', autor: 'Mark Twain' },
  { texto: 'Coragem é resistência ao medo e domínio do medo.', autor: 'Mark Twain' },
  { texto: 'Melhoria contínua é melhor do que perfeição adiada.', autor: 'Mark Twain' },

  { texto: 'Você perde todas as oportunidades que não aproveita.', autor: 'Wayne Gretzky' },
  { texto: 'Obstáculos são as coisas assustadoras que vemos quando desviamos os olhos do objetivo.', autor: 'Henry Ford' },
  { texto: 'A ação é a chave fundamental de todo sucesso.', autor: 'Pablo Picasso' },
  { texto: 'Tudo o que você pode imaginar é real.', autor: 'Pablo Picasso' },
];

// +1 pra pular a frase de hoje e cair direto na próxima da lista (pedido do
// usuário) — a rotação diária continua normal a partir daqui pra frente.
export function getFraseMotivacionalDoDia(): FraseMotivacional {
  const dia = Math.floor(Date.now() / 86_400_000) + 1;
  return FRASES[dia % FRASES.length];
}
