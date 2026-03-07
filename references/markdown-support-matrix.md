# Markdown support matrix

Baseline desta fase: `CommonMark + GFM forte` usando a stack atual de preview/export.

| Sintaxe | Suporte atual | Decisao desta fase | Observacoes |
| --- | --- | --- | --- |
| ATX headings (`#`) | Sim | Baseline | Ja suportado. |
| Setext headings (`===`, `---`) | Sim | Baseline | Coberto no fixture. |
| Italico / negrito / code inline | Sim | Baseline | Estilos agora dirigidos por preset. |
| Blockquote | Sim | Baseline | Com token proprio de padding/radius/tone. |
| Listas UL/OL | Sim | Baseline | Marker e espacamento controlados por preset. |
| Task list | Sim | Baseline | Via GFM. |
| Code fence | Sim | Baseline | Coberto no fixture. |
| Indented code block | Sim | Baseline | Coberto no fixture. |
| Links | Sim | Baseline | Peso e underline controlados por preset. |
| Imagens | Sim | Baseline | Radius/borda/sombra por preset. |
| Tabelas GFM com pipes | Sim | Baseline | Cobertas no fixture oficial. |
| Footnotes | Sim | Baseline | Mantidas com estilo dedicado no preview. |
| Horizontal rule | Sim | Baseline | Espessura/opacidade por preset. |
| Table caption HTML | Parcial | Aceito | O CSS cobre `<caption>`, mas o parser atual nao gera captions estilo Pandoc. |
| Tabelas simples estilo Pandoc | Nao | Fora do escopo imediato | Exigem extensao/parser adicional. |
| Tabelas multiline estilo Pandoc | Nao | Fora do escopo imediato | Exigem parser adicional. |
| Definition lists | Nao | Fora do escopo imediato | Nao entram em `remark-gfm`. |
| Line blocks | Nao | Fora do escopo imediato | Nao entram em `remark-gfm`. |
| Math inline/display | Nao | Fora do escopo imediato | Exigiria plugin dedicado (`remark-math`/`rehype-katex`). |

## Criterio operacional

- O arquivo [markdown-fixture-sample.md](C:\Users\mafhp\Documents\GitHub\mark-lee\references\markdown-fixture-sample.md) vira a base de smoke visual.
- O que estiver na coluna `Baseline` precisa renderizar de forma coerente em todos os presets padrão.
- O que estiver `Fora do escopo imediato` nao deve travar nem quebrar a preview, mas tambem nao e tratado como requisito de fidelidade nesta fase.
