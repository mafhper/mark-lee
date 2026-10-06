/**
 * As três opções de busca, e a ponte entre os dois vocabulários.
 *
 * **Por que este arquivo não importa nada.** É o mesmo motivo de os arquivos de
 * domínio em `features/journal/domain` serem TS puro: a decisão precisa ser
 * testável sem navegador e sem editor. `search-panel.ts` é a metade que fala com
 * o CodeMirror; esta é a que decide.
 *
 * **Duas línguas para a mesma coisa.** O painel do CodeMirror chama a opção de
 * regex de `regexp`; a configuração gravada do projeto chama de `useRegex`. São
 * dois nomes para um interruptor só, e a troca silenciosa não dá erro nenhum: o
 * interruptor simplesmente volta desligado. É por isso que a tradução é uma
 * função nomeada, testada nos dois sentidos, e não uma atribuição espalhada.
 */

/** As três opções, no vocabulário do **painel**. */
export interface ConsultaPainel {
  caseSensitive: boolean;
  wholeWord: boolean;
  regexp: boolean;
}

/** As mesmas três, no vocabulário do **projeto** (o que vai para `localStorage`). */
export interface OpcoesBusca {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

/**
 * Painel → configuração gravada.
 *
 * `regexp` vira `useRegex`, e só isso: o campo `search` (o termo) e o `replace`
 * (o texto de substituição) **não** entram. Eles mudam a cada tecla, e a
 * configuração é um objeto persistido — gravá-los transformaria digitar em
 * escrita em disco.
 */
export function opcoesDaConsulta(consulta: ConsultaPainel): OpcoesBusca {
  return {
    caseSensitive: consulta.caseSensitive,
    wholeWord: consulta.wholeWord,
    useRegex: consulta.regexp,
  };
}

/** Configuração gravada → painel. Sentido inverso de {@link opcoesDaConsulta}. */
export function consultaDasOpcoes(opcoes: OpcoesBusca): ConsultaPainel {
  return {
    caseSensitive: opcoes.caseSensitive,
    wholeWord: opcoes.wholeWord,
    regexp: opcoes.useRegex,
  };
}

/** As duas listas dizem a mesma coisa? (vocabulário do painel) */
export function mesmasOpcoes(a: ConsultaPainel, b: ConsultaPainel): boolean {
  return (
    a.caseSensitive === b.caseSensitive && a.wholeWord === b.wholeWord && a.regexp === b.regexp
  );
}

/** As duas configurações dizem a mesma coisa? (vocabulário gravado) */
export function opcoesIguais(a: OpcoesBusca, b: OpcoesBusca): boolean {
  return (
    a.caseSensitive === b.caseSensitive && a.wholeWord === b.wholeWord && a.useRegex === b.useRegex
  );
}

/**
 * As opções novas, ou `null` se nada mudou.
 *
 * `null` é a resposta que importa: o painel despacha uma consulta a cada tecla,
 * e gravar a cada uma delas re-renderizaria o App inteiro enquanto a pessoa
 * digita. Só um interruptor que realmente mudou justifica escrever — e o teste
 * desse `null` é o que segura o desenho.
 *
 * **A comparação é em `OpcoesBusca` dos dois lados, e não "um de cada".** A
 * primeira versão passava a consulta pelo painel e as opções gravadas por
 * `mesmasOpcoes`, que só conhece o vocabulário do painel: `regexp` era
 * comparado com `useRegex`, dava sempre diferente, e o `null` — que é o ponto
 * inteiro desta função — nunca chegava.
 */
export function proximasOpcoes(atuais: OpcoesBusca, consulta: ConsultaPainel): OpcoesBusca | null {
  const proximas = opcoesDaConsulta(consulta);
  return opcoesIguais(atuais, proximas) ? null : proximas;
}
