# Google Drive roadmap (pesquisa desta fase)

## Veredito

Sim, a integracao com Google Drive e viavel no app desktop. O custo principal nao esta no uso basico da API, e sim em:

- fluxo de OAuth e consentimento
- modelo de sincronizacao
- resolucao de conflitos
- UX de offline-first, recovery e estados de erro
- suporte operacional quando o token expira ou a pasta remota muda

A recomendacao desta fase continua sendo: **MVP manual antes de sync continuo**.

## O que a documentacao oficial sugere

### 1. Autenticacao em app desktop

A documentacao de OAuth para apps desktop recomenda o fluxo de `Desktop app` com redirecionamento via loopback IP (`127.0.0.1` ou `[::1]`) para Windows/macOS/Linux desktop.  
Fonte: [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)

Implicacao pratica para o Mark-Lee:

- abrir o navegador padrao
- capturar o callback local em uma porta aleatoria
- trocar o code por token
- armazenar refresh token com seguranca no desktop

### 2. Picker / escolha de arquivos

O Google Picker para desktop existe, mas a documentacao atual o marca como **beta** e descreve o fluxo abrindo uma nova aba no navegador padrao para que o usuario selecione ou envie arquivos.  
Fonte: [Overview of desktop apps](https://developers.google.com/workspace/drive/picker/guides/overview-desktop)

Implicacao pratica:

- o Picker e util para `abrir/importar` e eventualmente `escolher pasta/alvo`
- ele **nao** resolve sozinho organizacao, mover ou copiar entre pastas
- para isso, o app precisa do Drive API normal

### 3. Limites / custos operacionais

A pagina oficial de limites informa uma cortesia de `12.000 queries por 60 segundos` e `12.000 queries por 60 segundos por usuario`, sem limite diario desde que fique dentro dessas cotas por minuto.  
Fonte: [Drive API usage limits](https://developers.google.com/drive/api/guides/limits)

Implicacao pratica:

- para um editor individual, o gargalo raramente sera custo financeiro direto de API
- o risco real e desenho ruim de polling/sync gerar excesso de requests
- qualquer sync real precisa usar retry com exponential backoff

## Estrategias de produto

### Opcao A. MVP manual

Fluxo:

1. Conectar conta Google.
2. Escolher uma pasta raiz do Drive.
3. Abrir/salvar manualmente arquivos `.md`.
4. Exibir status local simples: `Conectado`, `Sincronizando`, `Erro`.

Vantagens:

- menor risco
- menor custo de suporte
- entrega rapida

Limites:

- sem sync continuo
- sem merge automatico

### Opcao B. Workspace espelhado

Fluxo:

1. Vincular uma pasta local do workspace a uma pasta do Drive.
2. Salvar sempre localmente primeiro.
3. Sincronizar em segundo plano de forma assíncrona.

Vantagens:

- respeita melhor o modelo atual do app
- permite offline-first

Riscos:

- precisa de fila de sync
- precisa de estados visiveis no workspace
- exige estrategia de conflito

### Opcao C. Hibrido com picker + pasta fixa

Fluxo:

- picker para importacao pontual
- pasta fixa para projeto principal

Vantagens:

- combina descoberta com previsibilidade
- evita obrigar o usuario a navegar o Drive em toda operacao

## UX recomendada para o Mark-Lee

### Onde encaixar no app

- criar um painel opcional na base da sidebar/workspace
- estados minimos:
  - `Nao conectado`
  - `Conectado`
  - `Sincronizando`
  - `Conflito`
  - `Erro`

### Estados que precisam existir

- `ultimo sync`
- `arquivo local alterado`
- `arquivo remoto alterado`
- `fila pendente`
- `token expirado`

### Autosave

Autosave deve continuar sendo local. O sync remoto precisa ser desacoplado.  
Motivo: salvar local e barato e previsivel; sync remoto depende de rede, token e quota.

## Recomendacao de implementacao

### Fase 2 sugerida

1. Conectar/desconectar Google Drive.
2. Selecionar pasta alvo.
3. Abrir arquivo do Drive para copia/local mirror.
4. Salvar manualmente no Drive.

### Fase 3 sugerida

1. Fila de sync por arquivo.
2. Estado visual de upload pendente.
3. Refresh token + retry.
4. Resolucao basica de conflito (`manter local`, `manter remoto`, `duplicar`).

### Nao fazer no primeiro corte

- sync bidirecional agressivo
- merge automatico complexo
- polling frequente sem observer/estrategia de backoff

## Fontes

- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Drive API usage limits](https://developers.google.com/drive/api/guides/limits)
- [Google Picker overview for web apps](https://developers.google.com/drive/picker/guides/overview)
- [Google Picker overview for desktop apps](https://developers.google.com/workspace/drive/picker/guides/overview-desktop)
