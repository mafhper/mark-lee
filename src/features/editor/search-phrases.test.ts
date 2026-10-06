import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EditorState, StateField } from "@codemirror/state";
import { TRANSLATIONS } from "../../translations.ts";
import {
  CHAVES_USADAS,
  FRASES_DA_BUSCA,
  efeitoTrocarRotulos,
  frasesDaBusca,
  rotulosDaBusca,
} from "./search-phrases.ts";

/**
 * O painel de busca em português.
 *
 * **O defeito que este arquivo existe para segurar:** o `@codemirror/search`
 * desenha o painel com os rótulos da própria biblioteca, em inglês, hard-coded no
 * pacote. Num app cujo idioma padrão é pt-BR, `Ctrl+F` abre uma caixa que fala
 * outra língua — e nenhuma asserção de build, typecheck ou `contrast:check`
 * percebe, porque nada está quebrado: está apenas **errado**.
 *
 * **Três invariantes, e cada uma pega uma classe diferente de erro:**
 *
 * 1. *Completude* — o dicionário tem exatamente as frases que a biblioteca pede.
 *    Falta uma, o painel mostra inglês naquela botão e ninguém vê, porque metade
 *    traduzida parece traduzida.
 * 2. *Não-inglês* — nenhuma tradução pt-BR/es-ES pode coincidir com a fonte
 *    inglesa. `Regex` é a exceção legítima (é o mesmo termo nos três idiomas), e
 *    por isso a lista de exceções é explícita e testada, e não implícita.
 * 3. *Placeholders* — as duas frases com `$` precisam **continuar** com `$`. É o
 *    marcador que o CodeMirror substitui pelo número; traduzir e perdê-lo quebra
 *    o anúncio do leitor de tela sem erro nenhum.
 */
const EXCECOES_IGUAIS_EM_INGLES = ["Regex"];

describe("frasesDaBusca", () => {
  for (const idioma of ["pt-BR", "en-US", "es-ES"] as const) {
    describe(idioma, () => {
      const dict = frasesDaBusca(TRANSLATIONS[idioma] as Record<string, string>);

      it("traduz todas as frases que a biblioteca pede, e nenhuma a mais", () => {
        assert.deepEqual(Object.keys(dict).sort(), [...FRASES_DA_BUSCA].sort());
      });

      it("não deixa nenhum rótulo vazio", () => {
        for (const [chave, valor] of Object.entries(dict)) {
          assert.ok(valor && valor.trim().length > 0, `"${chave}" traduziu para vazio`);
        }
      });

      it("preserva o marcador $ das duas frases parametrizadas", () => {
        assert.match(dict["replaced match on line $"], /\$$/);
        assert.match(dict["replaced $ matches"], /\$/);
      });
    });
  }

  it("nenhuma traducao de pt-BR ou es-ES fica em ingles (fora as excecoes)", () => {
    const ingles = frasesDaBusca(TRANSLATIONS["en-US"] as Record<string, string>);
    for (const idioma of ["pt-BR", "es-ES"] as const) {
      const local = frasesDaBusca(TRANSLATIONS[idioma] as Record<string, string>);
      for (const chave of FRASES_DA_BUSCA) {
        if (EXCECOES_IGUAIS_EM_INGLES.includes(ingles[chave])) continue;
        assert.notEqual(
          local[chave],
          ingles[chave],
          `"${chave}" ficou em ingles no ${idioma}: "${local[chave]}"`
        );
      }
    }
  });

  it("toda chave usada existe no dicionario dos TRES idiomas", () => {
    // Esta e' a asercao que pega chave faltante no **pt-BR** (objeto proprio:
    // `undefined` cai no identificador da biblioteca). Para o **es-ES** ela e'
    // vacuidade — `esES` e' `{ ...enUS, ... }`, entao o spread ja copiou a chave
    // e `hasOwnProperty` e' sempre verdadeiro. Quem cobre o espanhol e' a
    // asercao de "nao ficou igual ao en-US", acima. Ver `CHAVES_USADAS`.
    for (const idioma of ["pt-BR", "en-US", "es-ES"] as const) {
      const dicionario = TRANSLATIONS[idioma] as Record<string, string>;
      for (const chave of CHAVES_USADAS) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(dicionario, chave),
          `o dicionario ${idioma} nao tem "${chave}" — o painel cairia no ingles`
        );
      }
    }
  });

  it("as duas tradicoes de Regex sao iguais de proposito", () => {
    // "Regex" e o mesmo termo nos tres idiomas. Se a lista de excecoes crescer sem
    // que ninguem perceba, o teste acima deixa de proteger as outras 16.
    const ingles = frasesDaBusca(TRANSLATIONS["en-US"] as Record<string, string>);
    for (const idioma of ["pt-BR", "es-ES"] as const) {
      assert.equal(
        frasesDaBusca(TRANSLATIONS[idioma] as Record<string, string>).regexp,
        ingles.regexp
      );
    }
  });
});

/**
 * O mecanismo, e não só a tabela.
 *
 * As asserções acima provam que o **dicionário** está certo. Estas provam que o
 * CodeMirror **consulta** esse dicionário — que é a parte que falha em silêncio
 * se o nome do facet estiver errado, se a extensão não for montada no editor, ou
 * se o `Compartment` não estiver no lugar.
 *
 * `EditorState` funciona sem DOM, então isto roda no runner do Node em
 * milissegundos — sem navegador e sem servidor.
 */
describe("o painel consulta o dicionario", () => {
  const ptBR = TRANSLATIONS["pt-BR"] as Record<string, string>;
  const enUS = TRANSLATIONS["en-US"] as Record<string, string>;

  it("sem a extensao, a frase cai no ingles hard-coded da biblioteca", () => {
    // Controle: sem isto, o teste abaixo poderia passar por acidente — se
    // `phrases` já viesse traduzido de fábrica, montar a extensão não provaria nada.
    const semExtensao = EditorState.create({});
    assert.equal(semExtensao.phrase("next"), "next");
    assert.equal(semExtensao.phrase("replace all"), "replace all");
  });

  it("com a extensao, a frase sai no idioma do aplicativo", () => {
    const estado = EditorState.create({ extensions: [rotulosDaBusca(ptBR)] });
    assert.equal(estado.phrase("next"), "Próximo");
    assert.equal(estado.phrase("previous"), "Anterior");
    assert.equal(estado.phrase("match case"), "Sensível a maiúsculas");
    assert.equal(estado.phrase("by word"), "Palavra inteira");
    assert.equal(estado.phrase("replace all"), "Substituir todos");
  });

  it("substitui o marcador $ pelo valor, como a biblioteca promete", () => {
    const estado = EditorState.create({ extensions: [rotulosDaBusca(ptBR)] });
    assert.equal(estado.phrase("replaced match on line $", 7), "substituição na linha 7");
    assert.equal(estado.phrase("replaced $ matches", 3), "3 substituições");
  });

  it("a troca de idioma substitui os rotulos sem levar a configuracao junto", () => {
    // Este e' o teste do defeito que quase foi enviado: `StateEffect.reconfigure`
    // troca a configuracao INTEIRA. Se a troca de idioma usasse ele, o campo
    // abaixo (que representa busca, keymaps, linguagem) desapareceria — e o
    // editor continuaria abrindo, quebrado sem erro.
    const vizinho = StateField.define<number>({
      create: () => 42,
      update: (valor) => valor,
    });

    let estado = EditorState.create({ extensions: [rotulosDaBusca(ptBR), vizinho] });
    assert.equal(estado.phrase("next"), "Próximo");
    assert.equal(estado.field(vizinho), 42);

    estado = estado.update({ effects: efeitoTrocarRotulos(enUS) }).state;

    assert.equal(estado.phrase("next"), "Next", "os rotulos deveriam ter trocado");
    assert.equal(estado.field(vizinho), 42, "o resto da configuracao sumiu na troca");
  });

  it("nao acumula: trocar duas vezes nao faz o valor antigo voltar a vencer", () => {
    // `appendConfig` acumularia, e `state.phrase` usa a PRIMEIRA entrada que casa
    // — o ingles continuaria ganhando. O `Compartment` reescreve o slot.
    let estado = EditorState.create({ extensions: [rotulosDaBusca(enUS)] });
    assert.equal(estado.phrase("next"), "Next");
    estado = estado.update({ effects: efeitoTrocarRotulos(ptBR) }).state;
    assert.equal(estado.phrase("next"), "Próximo");
    estado = estado.update({ effects: efeitoTrocarRotulos(enUS) }).state;
    assert.equal(estado.phrase("next"), "Next");
    estado = estado.update({ effects: efeitoTrocarRotulos(ptBR) }).state;
    assert.equal(estado.phrase("next"), "Próximo");
  });
});
