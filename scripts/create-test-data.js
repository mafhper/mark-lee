import { writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = "D:\\mafhp\\Documents\\Mark-Lee-Diary";

const IMG_SOURCES = [
  { dir: "D:\\mafhp\\Pictures\\Screenshots", label: "screenshot" },
  { dir: "D:\\mafhp\\Pictures\\Posts", label: "post" },
  { dir: "D:\\mafhp\\Pictures\\Bikes", label: "bike" },
  { dir: "D:\\mafhp\\Pictures\\Ilustrações", label: "ilustracao" },
  { dir: "D:\\mafhp\\Pictures", label: "picture" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadAllImages() {
  const all = [];
  for (const source of IMG_SOURCES) {
    try {
      const files = await readdir(source.dir);
      for (const file of files) {
        if (/\.(png|jpg|jpeg|webp|avif|jfif|gif|svg)$/i.test(file)) {
          all.push({ path: join(source.dir, file), name: file, source });
        }
      }
    } catch {}
  }
  return all;
}

const manifest = {
  schema: "marklee-journal",
  schemaVersion: 1,
  id: "test-journal-001",
  name: "Meu Diário Pessoal",
  description: "Diário pessoal com anotações, ideias, poesias e análises",
  createdAt: new Date().toISOString(),
  entryDirectory: "entries",
  assetDirectory: "assets",
  defaultLanguage: "pt-BR",
  trackerDefinitions: [
    { id: "water", name: "Water intake", type: "number", unit: "cups", color: "#3b82f6" },
    { id: "sleep", name: "Sleep hours", type: "number", unit: "hours", color: "#8b5cf6" },
    { id: "mood-score", name: "Mood score", type: "number", unit: "/10", color: "#f59e0b" },
    { id: "exercise", name: "Exercise", type: "boolean", unit: "", color: "#10b981" },
    { id: "notes", name: "Daily notes", type: "string", unit: "", color: "#ec4899" },
  ],
  sections: [
    { id: "pessoal", name: "Pessoal", icon: "heart" },
    { id: "ideias", name: "Ideias", icon: "lightbulb" },
    { id: "compras", name: "Listas de Compras", icon: "shopping-cart" },
    { id: "poesia", name: "Poesias", icon: "feather" },
    { id: "analise", name: "Análises", icon: "search" },
  ],
};

function makeEntry(id, dateStr, title, bodyFn, extra = {}) {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const filename = `${y}-${m}-${d}--${hh}${mm}${ss}--${id}.md`;
  const path = `entries/${y}/${m}/${filename}`;
  return { id, title, dateStr, date, y, m, d, filename, path, dir: `entries/${y}/${m}`, bodyFn, extra };
}

function imagesRefsBlock(imgs, alt) {
  if (!imgs || imgs.length === 0) return "";
  const lines = imgs.map((img) => `![${alt}](${img.filename})`);
  return "\n" + lines.join("\n\n") + "\n";
}

const entryDefs = [
  makeEntry("pessoal-bem-vindo", "2026-06-20T08:00:00", "Primeiro dia no diário", (imgs) =>
`Começar um diário é sempre um passo importante. Aqui vou registrar meus pensamentos, ideias, listas de compras, poesias e análises de obras que me marcam.

---

## O que este diário vai conter

| Seção | Descrição |
|-------|-----------|
| **Pessoal** | Meu dia a dia e reflexões |
| **Ideias** | Conceitos e projetos que surgem |
| **Listas** | Compras, afazeres, desejos |
| **Poesias** | Versos e poemas originais |
| **Análises** | Estudos de quadros e obras |

> *"Escrever é uma forma de dar sentido ao caos."*

${imagesRefsBlock(imgs, "Momento do dia")}

## Links úteis

- [Markdown Guide](https://www.markdownguide.org)
- [Tauri Docs](https://v2.tauri.app)
- [React](https://react.dev)

## Checklist de início

- [x] Configurar diário
- [x] Escrever primeira entrada
- [ ] Explorar todas as seções
- [ ] Adicionar fotos aos posts
- [ ] Compartilhar com amigos`,
    { tags: ["pessoal", "inicio"], mood: "excited", favorite: true, trackers: { "mood-score": 9 }, imgCount: 3 }
  ),

  makeEntry("pessoal-parque", "2026-06-19T15:30:00", "Tarde no Parque Ibirapuera", (imgs) =>
`Hoje passei a tarde no **Parque Ibirapuera**. O dia estava perfeito, céu azul e uma brisa suave que tornava cada passo uma experiência agradável.

---

## O que fiz

1. **Caminhei ao redor do lago** — cerca de 5km no total
2. **Li um livro** — *"O Pequeno Príncipe"*, de Antoine de Saint-Exupéry
3. **Tomei sorvete com amigos** — sorveteria nova perto da marquise
4. **Fotografei o pôr do sol** — o céu ficou laranja e roxo

${imagesRefsBlock(imgs, "Parque Ibirapuera")}

> "O verdadeiro significado das coisas é encontrado quando nos permitimos senti-las, não apenas entendê-las."

## Reflexão do dia

Estou me sentindo muito grato por esses momentos simples. Muitas vezes nos perdemos na correria do dia a dia e esquecemos de apreciar o que realmente importa.

| Sentimento | Intensidade (1-10) |
|------------|--------------------|
| Gratidão   | 9 |
| Paz        | 8 |
| Energia    | 7 |
| Felicidade | 10 |

Hoje foi um daqueles dias que aquecem o coração. Que venham mais como este.`,
    { tags: ["pessoal", "natureza", "saude"], mood: "great", favorite: true,
      location: { label: "Parque Ibirapuera, São Paulo", latitude: -23.5874, longitude: -46.6576, source: "manual", city: "São Paulo", state: "SP", country: "Brasil", attraction: "Parque Ibirapuera" },
      trackers: { "mood-score": 8, exercise: true, sleep: 7 }, imgCount: 4 }
  ),

  makeEntry("pessoal-doente", "2026-06-13T10:00:00", "Dia difícil — doente", () =>
`Acordei com uma **dor de cabeça forte** hoje. Passei o dia na cama, tentando descansar e me recuperar.

---

## Sintomas

- Dor de cabeça intensa (escala 7/10)
- Fadiga muscular
- Febre leve (37.5°C)
- Falta de apetite

## O que fiz para melhorar

1. Tomei **chá de gengibre com limão** — ajuda na imunidade
2. Compressa fria na testa
3. **Remédio** — paracetamol 750mg
4. Dormi a tarde toda

## Horários

| Hora | Atividade |
|------|-----------|
| 08:00 | Acordei sentindo dor |
| 09:00 | Tomei remédio |
| 10:00 | Chá e descanso |
| 12:00 | Sopa leve |
| 14:00 | Soneca |
| 18:00 | Acordei melhor |
| 22:00 | Dormir |

Espero que amanhã seja melhor.`,
    { tags: ["pessoal", "saude"], mood: "sick", trackers: { water: 4, "mood-score": 3, exercise: false, notes: "Sick day" }, imgCount: 0 }
  ),

  makeEntry("pessoal-reflexao", "2026-06-11T23:00:00", "Pensamentos noturnos", (imgs) =>
`Não consigo dormir, então escrever ajuda.

Hoje foi um dia intenso. Passei horas pensando sobre o futuro, sobre as escolhas que fiz e as que ainda preciso fazer.

---

> "A melhor época para plantar uma árvore foi há 20 anos. A segunda melhor época é agora." — Provérbio chinês

Estou em um momento de transição na minha vida. Tantas coisas mudando ao mesmo tempo:

1. **Carreira** — novos projetos, novos desafios
2. **Relacionamentos** — pessoas que entram e saem
3. **Crescimento pessoal** — aprendendo a lidar com a ansiedade
4. **Saúde** — preciso me cuidar mais

${imagesRefsBlock(imgs, "Momento de reflexão")}

## Música para refletir

- *"Construção"* — Chico Buarque
- *"Como Nossos Pais"* — Elis Regina
- *"Tempo Rei"* — Gilberto Gil

Amanhã será um dia melhor. Tenho fé.`,
    { tags: ["pessoal", "reflexao"], mood: "anxious", trackers: { sleep: 4, "mood-score": 5 }, imgCount: 1 }
  ),

  makeEntry("ideias-app", "2026-06-18T22:00:00", "App de Hábitos — Documentação do Projeto", (imgs) =>
`Estou pensando em criar um **app de hábitos** para uso pessoal. Aqui vai a documentação inicial do projeto.

---

## Visão Geral

Um aplicativo simples e bonito para rastrear hábitos diários, com foco em **simplicidade** e **estatísticas visuais**.

## Funcionalidades Planejadas

### Core (v1.0)
- [x] Check-in diário — marcar hábitos concluídos
- [x] Streaks — sequência de dias consecutivos
- [ ] Estatísticas — gráficos de desempenho semanal/mensal
- [ ] Lembretes — notificações push personalizáveis

### Futuro (v2.0)
- [ ] Comunidade — grupos de apoio com amigos
- [ ] Metas compartilhadas — desafios em grupo
- [ ] Exportação de dados — CSV / JSON
- [ ] Integração com Google Fit / Apple Health

## Stack Tecnológica

| Componente | Tecnologia | Motivo |
|------------|------------|--------|
| **Frontend** | React Native | Cross-platform nativo |
| **Backend** | Node.js + Fastify | Performático e leve |
| **Database** | SQLite (local) | Sem dependência externa |
| **Auth** | Firebase Auth | Fácil integração |
| **Design** | TailwindCSS / NativeWind | Prototipação rápida |
| **Deploy** | Expo + EAS | Build simplificado |

## Arquitetura

\`\`\`
┌─────────────────────────────────────┐
│           Mobile App (RN)           │
├─────────────────────────────────────┤
│  Screens: Home → Habits → Stats    │
│  Navigation: Bottom Tabs + Stack    │
├─────────────────────────────────────┤
│         SQLite Local Storage         │
│         + Cloud Sync (opcional)      │
└─────────────────────────────────────┘
\`\`\`

${imagesRefsBlock(imgs, "Esboço do app")}

## Próximos passos

1. Finalizar protótipo no Figma
2. Configurar ambiente de desenvolvimento
3. Implementar CRUD de hábitos
4. Adicionar sistema de streaks
5. Testar com usuários reais

---

> *"We are what we repeatedly do. Excellence, then, is not an act, but a habit."* — Aristotle`,
    { tags: ["ideias", "dev", "projetos"], mood: "creative", favorite: true, trackers: { "mood-score": 8, notes: "Muitas ideias novas" }, imgCount: 2 }
  ),

  makeEntry("ideias-escrita", "2026-06-16T20:00:00", "Ideia de Conto — O Último Farol", (imgs) =>
`## Sinopse

> Num futuro onde o mar subiu e engoliu as cidades costeiras, um velho faroleiro mantém aceso o **último farol do mundo**. Ele não sabe se ainda há navios para guiar, mas acender a luz é tudo o que lhe resta.

---

## Temas Principais

1. **Solidão** — o isolamento do protagonista
2. **Esperança** — a luz como metáfora
3. **Resistência** — manter a rotina mesmo sem propósito aparente
4. **Memória** — flashbacks da vida antes da catástrofe

## Personagens

| Nome | Idade | Papel | Arco |
|------|-------|-------|------|
| **Miguel** | 70 anos | Faroleiro | Aceitar o passado |
| **O Mar** | — | Antagonista personificado | Força implacável |
| **Marina** | — | Memória da esposa falecida | Guia espiritual |
| **O Mensageiro** | — | Figura misteriosa | Catalisador da mudança |

${imagesRefsBlock(imgs, "Inspiração para o conto")}

## Estrutura do Conto

### Ato I — A Rotina
- Miguel acende o farol ao entardecer
- Flashback: o grande dilúvio, 30 anos atrás
- Estabelece a solidão e a rotina

### Ato II — A Chegada
- Um barco aparece no horizonte (primeiro em anos)
- Tripulante misterioso desembarca
- Revelações sobre o mundo exterior

### Ato III — A Escolha
- Miguel precisa decidir: ficar ou partir
- Clímax emocional com o fantasma de Marina
- Final aberto, poético

## Notas de Escrita

- Usar **prosa poética** para descrever o mar
- Diálogos mínimos, muita introspecção
- Inspiração visual em *"The Lighthouse"* (2019) e *"A Última Onda"*

Estou animado com este projeto! Preciso sentar e escrever o primeiro rascunho ainda esta semana.`,
    { tags: ["ideias", "escrita", "criativo"], mood: "creative", trackers: { "mood-score": 7, notes: "Conto em desenvolvimento" }, imgCount: 1 }
  ),

  makeEntry("compras-semanal", "2026-06-17T14:00:00", "Lista de Compras — Semana 25", () =>
`## Supermercado

### Hortifrúti
- [ ] Banana (cacho)
- [ ] Maçã (5 unidades)
- [ ] Laranja (5 unidades)
- [ ] Alface crespa
- [ ] Tomate
- [ ] Cebola
- [x] Batata (1kg)

### Padaria
- [x] Pão integral (pacote)
- [ ] Pão francês (6 unidades)
- [ ] Bolo de cenoura (para o café)

### Frios & Laticínios
- [x] Leite (3L)
- [x] Ovos (2 dúzias)
- [ ] Queijo muçarela (300g)
- [ ] Presunto (200g)
- [ ] Iogurte natural (pote grande)

### Secos
- [ ] Arroz (5kg)
- [ ] Feijão carioca (1kg)
- [ ] Macarrão (3 pacotes)
- [x] Café torrado (500g)
- [ ] Açúcar (1kg)
- [ ] Óleo de cozinha

### Limpeza
- [ ] Detergente
- [x] Sabão em pó
- [ ] Desinfetante
- [x] Papel higiênico (pacote 12)

---

## Farmácia

- [x] Vitamina C (efervescente)
- [ ] Protetor solar FPS 50
- [x] Curativos
- [ ] Soro fisiológico

## Orçamento

| Categoria | Estimativa | Real |
|-----------|------------|------|
| Supermercado | R$ 280,00 | — |
| Farmácia | R$ 70,00 | — |
| **Total** | **R$ 350,00** | — |

Obs: levar sacolas reutilizáveis!`,
    { tags: ["compras", "casa"], mood: "neutral", trackers: { "mood-score": 6 } }
  ),

  makeEntry("compras-presente", "2026-06-15T09:00:00", "Planejamento — Aniversário da Mãe", (imgs) =>
`O aniversário da minha mãe é daqui 3 semanas! Preciso me planejar.

---

## Sugestões de Presente

| # | Ideia | Estimativa | Prioridade |
|---|-------|------------|------------|
| 1 | **Livro** — "A Biblioteca da Meia-Noite" (ela ama livros) | R$ 60,00 | Alta |
| 2 | **Jantar** — Levar ao restaurante italiano favorito dela | R$ 150,00 | Alta |
| 3 | **Álbum de Fotos** — Personalizado com fotos da família | R$ 80,00 | Média |
| 4 | **Curso de Aquarela** — Ela sempre quis aprender | R$ 200,00 | Baixa |
| 5 | **Vale-presente** — Loja de artesanato | R$ 100,00 | Baixa |

${imagesRefsBlock(imgs, "Inspiração de presente")}

## Cronograma

- [ ] **15/jun** — Decidir presente principal
- [x] **14/jun** — Pesquisar opções online
- [ ] **20/jun** — Comprar presente (se for online, prazo de entrega)
- [ ] **25/jun** — Preparar cartão escrito à mão
- [ ] **27/jun** — Reservar restaurante
- [ ] **05/jul** — **ANIVERSÁRIO!**

## Ideia do Cartão

> "Mãe, você é a razão de eu ser quem sou. Cada memória feliz que tenho começa e termina com você. Te amo mais do que palavras podem expressar."

## Orçamento Total

| Item | Custo |
|------|-------|
| Livro | R$ 60,00 |
| Jantar (2 pessoas) | R$ 150,00 |
| Álbum de fotos | R$ 80,00 |
| Cartão + embalagem | R$ 20,00 |
| **Total estimado** | **R$ 310,00** |

Ela merece tudo isso e muito mais. Mal posso esperar para ver o sorriso no rosto dela!`,
    { tags: ["compras", "familia", "presentes"], mood: "good", favorite: true, trackers: { "mood-score": 7 }, imgCount: 1 }
  ),

  makeEntry("poesia-vento", "2026-06-14T12:00:00", "O Vento Leva", (imgs) =>
`O vento leva folhas secas,
leva dias, leva histórias.
Leva nomes que não lembro,
deixa apenas memórias.

---

O tempo passa na janela,
em silêncio, sem parar.
Cada dia é uma página
que o vento vai levar.

---

Mas enquanto sopra o vento,
enquanto o tempo passar,
cada linha que eu escrevo
é um jeito de ficar.

${imagesRefsBlock(imgs, "Poesia")}

> *Poesia escrita em 14 de junho de 2026, ouvindo o vento na janela.*`,
    { tags: ["poesia", "criativo"], mood: "loved", favorite: true, trackers: { "mood-score": 8 }, imgCount: 1 }
  ),

  makeEntry("poesia-mar", "2026-06-12T16:00:00", "Mar de Inside", (imgs) =>
`O mar não pergunta o caminho,
apenas segue seu destino.
Assim somos nós, navegantes,
entre o porto e o indefinido.

---

Há ondas que nos levantam,
há ondas que nos derrubam.
Mas o barco segue em frente,
mesmo quando as velas tombam.

---

Não há mapa para a alma,
nem bússola para o sentir.
O que importa é a jornada,
e a coragem de partir.

${imagesRefsBlock(imgs, "Mar")}

> *Inspirado por uma tarde na praia, vendo as ondas quebrarem sem pressa.*`,
    { tags: ["poesia", "reflexao"], mood: "creative", imgCount: 1 }
  ),

  makeEntry("analise-noite-estrelada", "2026-06-10T15:00:00", "Análise: A Noite Estrelada — Van Gogh", (imgs) =>
`## Ficha Técnica

| Atributo | Detalhe |
|----------|---------|
| **Obra** | A Noite Estrelada (The Starry Night) |
| **Artista** | Vincent van Gogh |
| **Ano** | 1889 |
| **Técnica** | Óleo sobre tela |
| **Dimensões** | 73.7 × 92.1 cm |
| **Localização** | MoMA, Nova York |
| **Período** | Pós-Impressionismo |

---

## Contexto Histórico

Van Gogh pintou *A Noite Estrelada* enquanto estava internado no **asilo de Saint-Rémy-de-Provence**, no sul da França. Este foi um período paradoxal: apesar de suas crises de saúde mental, ele produziu algumas de suas obras mais brilhantes.

> *"Looking at the stars always makes me dream."* — Vincent van Gogh

## Análise Visual

A pintura retrata a vista da janela do quarto de Van Gogh no asilo — mas pintada **durante o dia**, a partir da memória e imaginação.

### Elementos Chave

1. **O Céu** — pinceladas curvas e turbulentas que expressam intensidade emocional
2. **As Estrelas** — halos luminosos que criam uma sensação de movimento e vibração
3. **O Vilarejo** — pacato e em harmonia, contrasta com o céu agitado
4. **O Cipreste** — vertical e escuro, conecta a terra ao céu, simbolizando a ponte entre a vida e a morte
5. **A Lua** — representada como um sol à noite, iluminando o cenário

### Paleta de Cores

| Cor | Uso | Efeito |
|-----|-----|--------|
| Azul escuro | Céu | Melancolia, profundidade |
| Amarelo | Estrelas/lua | Esperança, luz |
| Verde escuro | Cipreste | Terra, estabilidade |
| Azul claro | Vilarejo | Paz, normalidade |

## Interpretação Pessoal

Para mim, esta obra representa a **dualidade** entre a turbulência interior e a calma aparente do mundo. Van Gogh conseguiu transformar sua angústia em beleza eterna. O céu agitado contrasta com o vilarejo tranquilo — como se ele estivesse mostrando que, por mais caótico que seja nosso interior, o mundo continua girando em paz.

${imagesRefsBlock(imgs, "A Noite Estrelada / Pinceladas")}

## Referências

- [MoMA — The Starry Night](https://www.moma.org/collection/works/79802)
- [Van Gogh Museum](https://www.vangoghmuseum.nl)
- *"Van Gogh: The Life"* — Steven Naifeh & Gregory White Smith`,
    { tags: ["analise", "arte", "van-gogh"], mood: "loved", favorite: true,
      location: { label: "MoMA, Nova York", latitude: 40.7614, longitude: -73.9776, source: "manual", city: "New York", state: "NY", country: "EUA", attraction: "Museu de Arte Moderna (MoMA)" },
      trackers: { "mood-score": 9, notes: "Análise detalhada" }, imgCount: 2 }
  ),

  makeEntry("analise-monalisa", "2026-06-08T10:00:00", "Análise: Mona Lisa — Leonardo da Vinci", (imgs) =>
`## Ficha Técnica

| Atributo | Detalhe |
|----------|---------|
| **Obra** | Mona Lisa (La Gioconda) |
| **Artista** | Leonardo da Vinci |
| **Ano** | 1503–1519 |
| **Técnica** | Óleo sobre madeira de álamo |
| **Dimensões** | 77 × 53 cm |
| **Local** | Museu do Louvre, Paris |
| **Período** | Renascença Italiana |

---

## O Sorriso Enigmático

O que torna a Mona Lisa tão fascinante é seu **sorriso ambíguo**. Da Vinci usou a técnica do *sfumato* — transições suaves entre cores e tons, sem linhas nítidas — para criar uma expressão que parece mudar dependendo do ângulo de observação.

> *"A arte nunca termina, apenas abandona."* — Leonardo da Vinci

### O que o sorriso significa?

| Interpretação | Teoria |
|---------------|--------|
| **Felicidade** | A expressão serena de uma mulher satisfeita |
| **Ironia** | Um sorriso de superioridade, quase zombeteiro |
| **Mistério** | Da Vinci propositalmente ambíguo, sem resposta definida |
| **Doença** | Teoria de que ela tinha um problema muscular |

## Técnica

Da Vinci aplicou **camadas finíssimas de tinta** (até 30 camadas em algumas áreas), criando profundidade e luminosidade incomparáveis. A paisagem ao fundo é um exemplo perfeito de **perspectiva atmosférica**.

### Inovações Técnicas

1. **Sfumato** — névoa sutil que envolve as formas
2. **Perspectiva atmosférica** — cores mais frias e menos nítidas no fundo
3. **Chiascuro** — contraste entre luz e sombra para volume
4. **Composição triangular** — estabilidade e harmonia visual

## Impacto Cultural

Nenhuma outra pintura na história gerou tanta especulação, estudo e admiração. A Mona Lisa **não é apenas um retrato** — é um fenômeno cultural.

${imagesRefsBlock(imgs, "Mona Lisa / Louvre")}

## Curiosidades

- Foi roubada do Louvre em **1911** e ficou desaparecida por 2 anos
- O quadro mede apenas **77 × 53 cm** — menor do que muitos imaginam
- Está protegida por uma caixa de vidro à prova de balas
- Recebe mais de **6 milhões de visitantes** por ano

## Conclusão

A Mona Lisa permanece relevante porque nos convida a **olhar além do óbvio**. O sorriso que nunca se revela completamente é um convite à contemplação — e talvez seja isso que a torna eterna.`,
    { tags: ["analise", "arte", "renascenca"], mood: "good",
      location: { label: "Museu do Louvre, Paris", latitude: 48.8606, longitude: 2.3376, source: "manual", city: "Paris", state: "Île-de-France", country: "França", attraction: "Museu do Louvre" },
      trackers: { "mood-score": 8 }, imgCount: 1 }
  ),

  makeEntry("maio-reflexao", "2026-05-25T20:00:00", "Revisão do Mês — Maio 2026", (imgs) =>
`Maio foi um mês intenso e produtivo. Vamos aos números:

---

## Maio em Números

| Métrica | Valor | Meta | ✅ |
|---------|-------|------|----|
| Dias de exercício | 18 | 20 | ❌ |
| Livros lidos | 2 | 3 | ❌ |
| Novos contatos | 5 | 5 | ✅ |
| Dias produtivos | 22 | 25 | ❌ |
| Meditação (dias) | 12 | 20 | ❌ |
| Economia (%) | 15% | 20% | ❌ |

## O Melhor Momento

O **fim de semana na praia** foi incrível. Ver o nascer do sol na areia, com os pés na água fria, é algo que todo mundo deveria experimentar pelo menos uma vez na vida.

> *"O sol nasce para todos, mas só alguns estão acordados para ver."*

${imagesRefsBlock(imgs, "Melhores momentos de maio")}

## Desafios e Aprendizados

### O que não funcionou
- Alimentação não foi tão saudável quanto eu gostaria
- Prazos apertados no trabalho causaram estresse
- Meditação — falhei em criar consistência

### Lições aprendidas
1. Preciso de **rotina matinal** mais estruturada
2. **Dormir cedo** é essencial para a produtividade
3. Não adianta planejar 20 metas — focar em **3 prioridades**

## Metas para Junho

- [ ] **Meditação** — 20 dias (mínimo 10 minutos)
- [ ] **Leitura** — 3 livros ("1984", "O Poder do Hábito", "A Sutil Arte de Ligar o F*")
- [ ] **Finanças** — economizar 20% do salário
- [ ] **Exercício** — 20 dias de atividade
- [ ] **Escrita** — 1 conto finalizado

Junho vai ser o mês da virada!`,
    { tags: ["pessoal", "revisao", "metas"], mood: "good",
      trackers: { "mood-score": 7, exercise: true, water: 5, notes: "Mês produtivo" }, imgCount: 3 }
  ),

  makeEntry("maio-receita", "2026-05-20T14:00:00", "Nova Receita: Risoto de Limão Siciliano", (imgs) =>
`Testei uma receita nova hoje — **Risoto de Limão Siciliano com Parmesão** — e ficou maravilhosa!

---

## Ingredientes

| Ingrediente | Quantidade |
|-------------|------------|
| Arroz arbóreo | 1 xícara |
| Limão siciliano | 1 unidade (suco + raspas) |
| Vinho branco seco | 1/2 xícara |
| Caldo de legumes | 3 xícaras |
| Manteiga | 2 colheres (sopa) |
| Parmesão ralado | 1/2 xícara |
| Cebola picada | 1/2 unidade |
| Sal e pimenta | A gosto |
| Salsinha picada | Para finalizar |

## Modo de Preparo

### Passo 1 — Base
1. Refogue a cebola na manteiga até dourar
2. Adicione o arroz e refogue por 2 minutos
3. Tempere com sal e pimenta

### Passo 2 — Cozimento
1. Adicione o vinho e mexa até evaporar completamente
2. Vá adicionando o caldo quente aos poucos (1 concha por vez)
3. Mexa sempre, por cerca de 18-20 minutos

### Passo 3 — Finalização
1. Quando o arroz estiver al dente, retire do fogo
2. Adicione as raspas e o suco do limão
3. Misture o parmesão e a manteiga restante
4. Ajuste o sal e finalize com salsinha

## Dicas do Chef

> *"Risoto não se prepara com pressa. Cada concha de caldo é uma conversa entre o cozinheiro e o arroz."*

- O **caldo deve estar sempre quente** — isso evita que o cozimento pare
- Mexa **sempre** na mesma direção para liberar o amido
- O ponto ideal é **al dente**: macio por fora, firme no centro
- Sirva **imediatamente** — risoto não espera!

${imagesRefsBlock(imgs, "Risoto finalizado")}

## Harmonização

| Bebida | Tipo |
|--------|------|
| Vinho branco seco (Sauvignon Blanc) | 🍷 |
| Água com gás e limão | 🥤 |
| Cerveja pilsen leve | 🍺 |

**Tempo total:** 25 minutos
**Dificuldade:** Médio
**Serve:** 2 pessoas

Nota mental: fazer de novo no próximo jantar com os amigos!`,
    { tags: ["ideias", "culinaria", "receitas"], mood: "excited", favorite: true,
      trackers: { "mood-score": 9, notes: "Nova receita testada e aprovada" }, imgCount: 2 }
  ),

  makeEntry("maio-poesia-primavera", "2026-05-15T09:00:00", "Primavera no Asfalto", (imgs) =>
`Entre o concreto e o céu cinzento,
uma flor rompeu o chão.
Não pediu licença, não pediu permissão,
apenas teimou em ser primavera.

---

O vento frio não a matou,
a pressa dos passos não a esmagou.
Ela brotou porque era tempo,
porque a vida sempre encontra um jeito.

---

Que eu possa ser como essa flor:
delicada e teimosa,
crescendo onde ninguém espera.

---

E quando o inverno vier,
com suas noites longas e dias cinzas,
que eu lembre da flor no asfalto:
a prova de que a vida vence o concreto.

${imagesRefsBlock(imgs, "Primavera")}

> *15 de maio de 2026 — Uma flor nasceu na calçada em frente ao escritório. Peguei como sinal.*`,
    { tags: ["poesia", "primavera"], mood: "creative", favorite: true, trackers: { "mood-score": 8 }, imgCount: 1 }
  ),
];

async function main() {
  const allImages = await loadAllImages();
  const shuffled = shuffle(allImages);
  let imgIndex = 0;

  console.log(`Found ${allImages.length} images across all sources`);

  const dirs = new Set(entryDefs.map((e) => e.dir));
  for (const dir of dirs) {
    await mkdir(join(ROOT, dir), { recursive: true });
  }

  await mkdir(join(ROOT, ".marklee"), { recursive: true });
  await writeFile(join(ROOT, ".marklee", "journal.json"), JSON.stringify(manifest, null, 2), "utf-8");

  for (const def of entryDefs) {
    const imgs = [];
    const count = def.extra.imgCount || 0;
    for (let i = 0; i < count && imgIndex < shuffled.length; i++, imgIndex++) {
      const src = shuffled[imgIndex];
      const ext = extname(src.name);
      const filename = `img_${def.id}_${i}${ext}`;
      imgs.push({ filename, sourcePath: src.path });
    }

    const body = def.bodyFn(imgs);
    const coverFilename = imgs.length > 0 ? imgs[0].filename : "";

    const frontmatter = {
      schema: "marklee-entry",
      schemaVersion: 1,
      id: def.id,
      date: new Date(def.dateStr).toISOString(),
      title: def.title,
      tags: def.extra.tags ?? [],
      mood: def.extra.mood ?? "",
      favorite: def.extra.favorite ?? false,
      trackers: def.extra.trackers ?? {},
      cover: coverFilename,
      location: def.extra.location ?? undefined,
      createdAt: new Date(def.dateStr).toISOString(),
      updatedAt: new Date(def.dateStr).toISOString(),
    };

    const yaml = Object.entries(frontmatter)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        if (Array.isArray(v)) return `${k}:\n${v.map((vi) => `  - "${vi}"`).join("\n")}`;
        if (typeof v === "object" && v !== null) {
          const entries = Object.entries(v).filter(([, vv]) => vv !== undefined && vv !== null && vv !== "");
          if (entries.length === 0) return `${k}: {}`;
          return `${k}:\n${entries.map(([kk, vv]) => `  ${kk}: ${typeof vv === "string" ? `"${vv}"` : vv}`).join("\n")}`;
        }
        if (typeof v === "boolean") return `${k}: ${v}`;
        if (typeof v === "number") return `${k}: ${v}`;
        if (v === "") return `${k}: ""`;
        return `${k}: "${v}"`;
      })
      .join("\n");

    const content = `---\n${yaml}\n---\n\n${body}\n`;
    await writeFile(join(ROOT, def.path), content, "utf-8");

    // Copy images
    for (const img of imgs) {
      try {
        await cp(img.sourcePath, join(ROOT, def.dir, img.filename));
      } catch (e) {
        console.log(`Warning: could not copy ${img.sourcePath}`);
      }
    }
  }

  console.log(`✓ Created ${entryDefs.length} entries in ${ROOT}`);
}

main().catch(console.error);
