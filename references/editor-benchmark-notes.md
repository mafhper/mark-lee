# Benchmark notes for editor UX

Objetivo: registrar os recursos e padroes mais promissores observados nas referencias pedidas para futuras fases do Mark-Lee.

## Referencias observadas

- [PlateJS](https://platejs.org/)
- [StackEdit](https://stackedit.io/)
- [Typora: Focus and Typewriter Mode](https://support.typora.io/Focus-and-Typewriter-Mode/)
- [Typora: About Themes](https://support.typora.io/About-Themes/)
- [Calmly Writer](https://calmlywriter.com/)
- [Caret](https://caret.io/)
- [Ferrite Features](https://getferrite.dev/features)
- [Kindling Writer](https://kindlingwriter.com/)

## Oportunidades mais fortes

### 1. Toolbar e command surface

Inspiração principal: PlateJS.

Aplicar no Mark-Lee:

- grupos mais claros de acoes
- hints compactos de atalho na propria toolbar
- hotzones previsiveis para hover/popover
- overflow mais editorial, menos “menu tecnico”

Status desta fase:

- estrutura de categorias ficou mais clara
- atalhos compactos foram encurtados
- icones ganharam camada duotone

### 2. Focus mode / typewriter mode

Inspiração principal: Typora e Calmly Writer.

Aplicar no Mark-Lee:

- modo de foco mais forte na linha/paragrafo ativo
- opcao de alinhar o bloco ativo em uma faixa vertical estavel
- opcao de reduzir chrome automaticamente em escrita longa

### 3. Tema e estilo publicados

Inspiração principal: Typora.

Aplicar no Mark-Lee:

- temas de publicacao com tokens completos
- preview e export compartilhando a mesma base visual
- presets mais flexiveis sem expor CSS bruto ao usuario

Status desta fase:

- o schema de publication presets foi expandido
- preview e export HTML passaram a compartilhar a mesma base

### 4. Sync e cloud ergonomics

Inspiração principal: StackEdit.

Aplicar no Mark-Lee:

- importacao/exportacao com Google Drive em fluxo claro
- estados explicitos de sync
- acoes locais primeiro, remoto em segundo plano

### 5. Mobile / touch patterns

Inspiração principal: Ferrite.

Aplicar no Mark-Lee:

- toolbar com melhor densidade para largura menor
- gestos/targets maiores em janelas compactas
- modos de escrita que aguentem halfscreen sem colapsar a UX

### 6. Project/workspace writing flow

Inspiração principal: Kindling Writer.

Aplicar no Mark-Lee:

- relacao mais clara entre notas, snippets e documentos do workspace
- painéis contextuais de apoio sem roubar a area principal de escrita
- possibilidades futuras de board/mapa de ideias sem romper a simplicidade atual

## Prioridade sugerida

1. Refinar toolbar + microinteracoes.
2. Fortalecer focus/typewriter mode.
3. Evoluir presets e preview/export.
4. Planejar Drive MVP manual.
5. Estudar modos compactos/touch inspirados em Ferrite.
