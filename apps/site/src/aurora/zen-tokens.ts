/**
 * Tokens do modo zen do palco.
 *
 * Os dois objetos abaixo são a **única fonte** dos números que o efeito usa. O
 * CSS declara as mesmas durações em custom properties (ele não importa
 * TypeScript), e o teste `zen-tokens.test.ts` compara os dois: um token trocado
 * de um lado sem o outro é divergência silenciosa, e é o tipo de coisa que só
 * aparece quando alguém acha que o efeito "está estranho".
 *
 * `ZenMotionTokens` é a ficha de motion do efeito (tempo, curva, elevação,
 * atenuação e cor). `ZenFieldTokens` é o campo de areia que o shader desenha
 * (comprimento de onda, perfil do sulco, dissipação, respiração e grão).
 *
 * Duas correções do desenho estão registradas aqui:
 *
 *  - **A saída tem a mesma duração e o mesmo peso da entrada.** A ficha original
 *    pedia 200ms de retração; na tela isso lia como corte seco. A volta é
 *    cerimônia também: 650ms, curva simétrica, sem queda brusca no primeiro
 *    quadro nem sumiço no último.
 *  - **A areia é clara.** O véu é papel washi, não breu: o entorno clareia em
 *    volta da janela escura, como uma pedra sobre areia rastelada. Quem escurece
 *    a página é a atenuação das seções, não a cor do véu.
 */

export const ZenMotionTokens = {
  timings: {
    /**
     * Espera de intenção antes de acender. A ficha pede 50ms; a decisão do
     * efeito fixa 60ms — o intervalo que o conceito admite (60–80ms) e que
     * continua curto demais para se perceber numa passagem.
     */
    dwellMs: 60,
    /** Entrada cerimoniosa: o véu, o campo e a janela chegam juntos. */
    enterMs: 650,
    /** Saída com o mesmo peso da entrada. Retração curta parece travamento. */
    exitMs: 650,
    /** Um ciclo completo de respiração das cristas (~0,11 Hz). */
    breathPeriodMs: 9000,
  },
  easings: {
    /** Desaceleração profunda e exponencial. */
    enter: [0.16, 1, 0.3, 1] as const,
    /**
     * Simétrica: lenta nas duas pontas. A curva da ficha — `cubic-bezier(0.4, 0,
     * 1, 1)` — acelera no fim e o véu desaparece com um repuxão; esta desce sem
     * degrau no primeiro quadro e sem corte no último.
     */
    exit: [0.65, 0, 0.35, 1] as const,
  },
  transform: {
    /** Deslocamento da janela no estado zen, em px. */
    modalTranslateY: -4,
    /** Crescimento da janela. Empilhada, ela não cresce. */
    modalScale: 1.012,
  },
  attenuation: {
    /** Opacidade do resto da página no estado zen. */
    backgroundOpacity: 0.15,
    /** Distância entre cristas, em px. */
    ringSpacingPx: 30,
  },
  colors: {
    /** Terracota do palco: a cor das cristas de areia. */
    sandRgb: [218, 132, 98] as const,
    /**
     * Papel washi: o véu claro e quente que envolve a janela. Escolhido para o
     * composto ficar em ~0,68 de luminância no pico — areia iluminada, nunca
     * branco de flash.
     */
    paperRgb: [218, 208, 190] as const,
  },
} as const;

export const ZenFieldTokens = {
  /** Comprimento de onda do rastelo: o mesmo espaçamento das cristas. */
  spacingPx: ZenMotionTokens.attenuation.ringSpacingPx,
  /** Perfil do sulco: base larga, crista fina. */
  profileGamma: 1.8,
  /** Distância em que o jardim se dissolve na borda da tela, em px. */
  fadePx: 360,
  /** Amplitude da respiração, em px. Quase subliminar de propósito. */
  breathPx: 2.5,
  /** Saturação do véu em volta da janela, em px. */
  washPx: 80,
  /** Opacidade do véu claro em intensidade plena. */
  washAlpha: 0.78,
  /** Amplitude tonal do relevo: o sulco é sombra e luz, não furo na cobertura. */
  ridgeRelief: 0.13,
  /** Quanto de terracota entra na crista iluminada. */
  ridgeTint: 0.16,
  /**
   * Largura da frente que varre o campo, como fração da distância até o canto
   * mais longe da viewport. Sem ela a cobertura não teria borda: chegaria de
   * uma vez, que é o que o olho lê como splash.
   */
  spreadFeather: 0.18,
  /**
   * Grão da areia: ruído contínuo de baixa amplitude no próprio véu. Não é
   * ornamento — é o que impede o campo de virar um degradê plastificado. Nunca
   * símbolos, nunca pontinhos: só textura.
   */
  grainPx: 7,
  grainAlpha: 0.06,
  /** Deriva do grão, em px por segundo: o campo respira mesmo parado no lugar. */
  grainDriftPx: 2.5,
} as const;
