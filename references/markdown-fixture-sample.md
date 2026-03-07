# Fixture oficial de Markdown

Este arquivo deriva de `C:\Users\mafhp\Documents\Markdown\docs\sample.md` e foi reorganizado
para separar o que entra na baseline desta fase do que fica explicitamente fora de escopo.

## Suportado nesta fase (CommonMark + GFM forte)

An h1 header
============

Paragraphs are separated by a blank line.

2nd paragraph. *Italic*, **bold**, and `monospace`.

> Block quotes are written like so.
>
> They can span multiple paragraphs, if you like.

### Listas

* this one
* that one
* the other one

1. first item
2. second item
3. third item

### Code blocks

    # Let me re-iterate ...
    for i in 1 .. 10 { do-something(i) }

~~~python
import time
for i in range(3):
    time.sleep(0.5)
    print(i)
~~~

### Links e footnotes

Here's a link to [a website](http://foo.bar), a [local doc](local-doc.html), and a footnote [^1].

[^1]: Footnote text goes here.

### Tabela GFM

| size | material | color |
| --- | --- | --- |
| 9 | leather | brown |
| 10 | hemp canvas | natural |
| 11 | glass | transparent |

### Horizontal rule

***

### Imagem

![example image](example-image.jpg "An exemplary image")

## Fora do escopo imediato

Os blocos abaixo permanecem como referência do fixture original, mas nao entram como obrigatorios
na baseline desta fase porque exigem extensoes fora de `remark-gfm` ou tratamentos adicionais.

### Tabelas estilo Pandoc

size  material      color
----  ------------  ------------
9     leather       brown
10    hemp canvas   natural
11    glass         transparent

Table: Shoes, their sizes, and what they're made of

--------  -----------------------
keyword   text
--------  -----------------------
red       Sunsets, apples, and
          other red or reddish
          things.

green     Leaves, grass, frogs
          and other things it's
          not easy being.
--------  -----------------------

### Definition list

apples
  : Good for making applesauce.
oranges
  : Citrus!

### Line block

| Line one
|   Line two
| Line three

### Math

Inline math equations go in like so: $\omega = d\phi / dt$.

$$I = \int \rho R^{2} dV$$
