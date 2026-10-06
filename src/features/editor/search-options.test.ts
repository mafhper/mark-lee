import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  opcoesDaConsulta,
  consultaDasOpcoes,
  proximasOpcoes,
} from "./search-options.ts";

/**
 * Vocabulário das opções de busca.
 *
 * **Duas línguas para a mesma coisa.** O painel do CodeMirror chama a opção de
 * regex de `regexp`; a configuração gravada do projeto chama de `useRegex`. São
 * dois nomes para um interruptor só, e a troca silenciosa não dá erro nenhum: o
 * interruptor simplesmente volta desligado. A primeira asserção existe para
 * travar essa ponte nos dois sentidos.
 *
 * **`proximasOpcoes` devolve `null` quando nada mudou, e isso é a asserção que
 * segura o design.** O painel despacha a consulta a **cada tecla** — no termo e
 * no texto de substituição. Se a cada uma delas gravássemos em `localStorage`,
 * o `updateSettings` re-renderizaria o App inteiro enquanto a pessoa digita. O
 * que se guarda são só os três interruptores, e só quando um deles muda.
 */
describe("opcoesDaConsulta", () => {
  it("traduz `regexp` do painel para `useRegex` gravado", () => {
    assert.deepEqual(
      opcoesDaConsulta({ caseSensitive: true, wholeWord: false, regexp: true }),
      { caseSensitive: true, wholeWord: false, useRegex: true },
    );
  });

  it("traduz `useRegex` gravado para `regexp` do painel", () => {
    assert.deepEqual(
      consultaDasOpcoes({ caseSensitive: false, wholeWord: true, useRegex: true }),
      { caseSensitive: false, wholeWord: true, regexp: true },
    );
  });

  it("sobrevive a ida e volta nas oito combinacoes", () => {
    for (const caseSensitive of [true, false]) {
      for (const wholeWord of [true, false]) {
        for (const regexp of [true, false]) {
          const consulta = { caseSensitive, wholeWord, regexp };
          assert.deepEqual(consultaDasOpcoes(opcoesDaConsulta(consulta)), consulta);
        }
      }
    }
  });

  it("nao inventa campo: a traducao tem exatamente as tres opcoes", () => {
    // `search` e `replace` tambem existem na consulta do painel. Se a traducao
    // vazasse um deles para o objeto gravado, ele passaria a `settings` e de la
    // para o `localStorage` inteiro, a cada tecla.
    const traduzida = opcoesDaConsulta({
      caseSensitive: false,
      wholeWord: false,
      regexp: false,
    });
    assert.deepEqual(Object.keys(traduzida).sort(), ["caseSensitive", "useRegex", "wholeWord"]);
  });
});

describe("proximasOpcoes", () => {
  const base = { caseSensitive: false, wholeWord: false, useRegex: false };

  it("devolve null quando os tres interruptores seguem iguais", () => {
    assert.equal(proximasOpcoes(base, { caseSensitive: false, wholeWord: false, regexp: false }), null);
  });

  it("devolve as opcoes novas quando so um interruptor muda", () => {
    assert.deepEqual(proximasOpcoes(base, { caseSensitive: false, wholeWord: false, regexp: true }), {
      ...base,
      useRegex: true,
    });
  });

  it("nao grava quando o texto do termo muda e os interruptores nao", () => {
    // Este e o caso que happens a cada tecla digitada no painel. `proximasOpcoes`
    // recebe so os interruptores, entao a resposta correta e `null`: nao ha
    // informacao nova para gravar.
    assert.equal(proximasOpcoes(base, { caseSensitive: false, wholeWord: false, regexp: false }), null);
  });

  it("percebe cada interruptor isoladamente", () => {
    assert.deepEqual(proximasOpcoes(base, { caseSensitive: true, wholeWord: false, regexp: false }), {
      ...base,
      caseSensitive: true,
    });
    assert.deepEqual(proximasOpcoes(base, { caseSensitive: false, wholeWord: true, regexp: false }), {
      ...base,
      wholeWord: true,
    });
    assert.deepEqual(proximasOpcoes(base, { caseSensitive: true, wholeWord: true, regexp: true }), {
      caseSensitive: true,
      wholeWord: true,
      useRegex: true,
    });
  });
});
