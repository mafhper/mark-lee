import { createZenMotion, cubicBezierEase, stepZenMotion, zenAtRest, zenExposure, zenFade } from "@/aurora/zen-motion";
import { blendWash, type StageWash } from "@/aurora/stage-wash";
import { ZenFieldTokens, ZenMotionTokens } from "@/aurora/zen-tokens";

/**
 * O motor gráfico do modo zen: o jardim de areia do palco.
 *
 * Uma camada só, WebGL, por pixel. Cada pixel sabe a que distância está da
 * janela do aplicativo e pinta a crista correspondente. O campo de distância é
 * exato para uma caixa de cantos arredondados — então as ranhuras acompanham a
 * silhueta do modal e só viram ovais quando se afastam dela.
 *
 * As seis decisões que o desenho impõe:
 *
 *  1. **A cobertura chega da janela para fora.** A máscara de `u_spread` cresce
 *     a partir da silhueta, com uma borda larga e suave; a frente avança em
 *     ritmo constante (o `spread` é o progresso linear, não a intensidade já
 *     suavizada). Sem isso o campo chegaria de uma vez — o que o olho lê como
 *     splash.
 *  2. **Areia clara.** O véu é papel washi com grão; o pico composto fica em
 *     ~0,68 de luminância. O contraste vem de a janela ser escura sobre um campo
 *     claro — não de apagar a tela.
 *  3. **Nada de símbolos.** A textura da areia é ruído contínuo de baixa
 *     amplitude, que ainda deriva devagar (2,5px/s). Glifos, pontos e sinais
 *     soltos saíram: a 20% de opacidade eles não leem como textura, leem como
 *     sujeira.
 *  4. **Repouso custa zero.** O laço nasce na entrada, morre quando a
 *     intensidade chega a zero e limpa o canvas. Parado, não existe quadro — só
 *     `document.hidden`, movimento reduzido e toque param antes disso.
 *  5. **30 quadros por segundo.** A deriva é lenta; metade dos quadros seria
 *     invisível e custaria o mesmo.
 *  6. **DPR limitado a 2** e **sem WebGL, sem drama**: se o contexto não subir,
 *     o motor devolve `null` e o CSS isola a view com o véu de reserva.
 *
 * A ideia do jardim é de terceiros; a implementação é nossa e a conta está toda
 * aqui, comentada — nenhuma linha de shader foi copiada.
 */

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec4 u_window;
uniform float u_radius;
uniform float u_intensity;
uniform float u_spread;
uniform float u_reach;
uniform float u_feather;
uniform float u_breath;
uniform float u_time;
uniform float u_spacing;
uniform float u_fade;
uniform float u_wash;
uniform float u_washAlpha;
uniform float u_relief;
uniform float u_tint;
uniform float u_gamma;
uniform float u_grainCell;
uniform float u_grainAlpha;
uniform float u_grainDrift;
uniform vec3 u_ink;
uniform vec3 u_sand;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

/* Distância até uma caixa de cantos arredondados: negativa dentro, zero na
 * borda, positiva fora. É a equação do campo — as cristas são as isolinhas
 * desta função, e é por isso que elas ficam equidistantes na diagonal. */
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

/* Ruído de valor com interpolação suave: grão de areia, não chuvisco de tela.
 * Quatro hashes por pixel e uma célula de ~7px — invisível como padrão, presente
 * como matéria. */
float grain(vec2 p) {
  vec2 cell = floor(p / u_grainCell);
  vec2 f = fract(p / u_grainCell);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  /* gl_FragCoord conta de baixo; o DOM conta de cima. A troca é aqui, uma vez. */
  vec2 st = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;
  float depth = sdRoundedBox(st - u_window.xy, u_window.zw, u_radius);

  if (depth <= 0.0 || u_intensity <= 0.001 || u_spread <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  /* A frente de cobertura: parte da silhueta da janela e varre até o canto mais
   * longe da viewport, chegando lá no fim da entrada. A borda é larga e suave
   * de propósito — uma frente dura andaria como um wipe, não como areia sendo
   * coberta. */
  float feather = max(24.0, u_reach * u_feather);
  float front = u_spread * (u_reach + feather);
  float coverage = 1.0 - smoothstep(front - feather, front + feather, depth);

  /* A fase recua com a entrada: as cristas chegam de dentro, não crescem. */
  float phase = (1.0 - u_intensity) * PI;
  float wave = sin((depth + u_breath) * TAU / u_spacing - phase);
  /* Perfil do sulco: base larga, crista fina — areia rastelada, não senoide. */
  float relief = sign(wave) * pow(abs(wave), u_gamma);

  /* O grão deriva devagar: o campo tem movimento próprio, sem chamar atenção. */
  vec2 drift = vec2(u_time * u_grainDrift, u_time * u_grainDrift * -0.7);
  float grit = grain(st + drift);
  float falloff = exp(-pow(depth / u_fade, 2.0));
  float carve = relief * falloff * coverage;

  /* Relevo é TOM, não furo: o campo é claro e contínuo, e o sulco é sombra e
   * luz rasante sobre ele. Fazer o relevo mexer na opacidade abria buracos
   * escuros a cada crista e o jardim virava chapa ondulada. */
  vec3 color = mix(u_ink, u_sand, u_tint * max(carve, 0.0)) * (1.0 + carve * u_relief);

  /* O véu nasce transparente na borda da janela e satura a 80px dela: a
   * silhueta do aplicativo fica preservada em vez de cortada. */
  float veil = clamp(1.0 - exp(-depth / u_wash), 0.0, 1.0) * u_intensity * coverage;
  float grainTint = 1.0 - u_grainAlpha + grit * u_grainAlpha;
  float alpha = clamp(veil * u_washAlpha, 0.0, 1.0) * coverage * grainTint;

  /* Premultiplicado: o canvas é composto sobre a página pelo compositor, e é
   * assim que ele evita aplicar o alfa duas vezes. */
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

/** 30 quadros por segundo: a deriva é lenta, o gasto pela metade. */
const FRAME_INTERVAL = 1000 / 30;

/** Centro, semi-eixos e raio do canto da janela do palco, em px de CSS. */
export interface ZenWindowBox {
  cx: number;
  cy: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
}

/** `null` = ainda não há o que desenhar. */
export type ZenBoxReader = () => ZenWindowBox | null;

export interface ZenEngine {
  /** Abre ou fecha o efeito. Idempotente. */
  setLit(lit: boolean): void;
  /** Re-mede a janela (rolagem, resize) sem trocar o estado. */
  remeasure(): void;
  /**
   * Re-tinge o wash com o tema novo. A troca anda no mesmo compasso da troca de
   * tema do palco — a janela e o campo mudam de cor juntos.
   */
  setWash(wash: StageWash): void;
  /**
   * Aborta a saída e dissolve o campo só por opacidade, sem rampa de spread.
   *
   * É a resposta à rolagem: o campo é fixo na viewport e a janela anda com a
   * página, então uma saída cerimoniosa faria o jardim passear pela tela. Sem
   * nada no ar, não faz nada.
   */
  fastExit(): void;
  destroy(): void;
}

/** A mesma conta do shader, em JS: serve para medir o alcance da frente. */
function distanceToWindow(px: number, py: number, box: ZenWindowBox): number {
  const radius = Math.max(0, Math.min(box.radius, box.halfWidth, box.halfHeight));
  const qx = Math.abs(px - box.cx) - (box.halfWidth - radius);
  const qy = Math.abs(py - box.cy) - (box.halfHeight - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Monta o motor. Devolve `null` quando não há WebGL — e aí o véu de reserva do
 * CSS fica sozinho, sem quebrar nada.
 */
export function createZenEngine(
  canvas: HTMLCanvasElement,
  readBox: ZenBoxReader,
  initialWash: StageWash,
): ZenEngine | null {
  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    }) ?? null;
  if (!gl) return null;

  const program = createProgram(gl);
  if (!program) return null;

  const buffer = gl.createBuffer();
  if (!buffer) return null;

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uResolution = uniform("u_resolution");
  const uDpr = uniform("u_dpr");
  const uWindow = uniform("u_window");
  const uRadius = uniform("u_radius");
  const uIntensity = uniform("u_intensity");
  const uSpread = uniform("u_spread");
  const uReach = uniform("u_reach");
  const uFeather = uniform("u_feather");
  const uBreath = uniform("u_breath");
  const uTime = uniform("u_time");
  const uSpacing = uniform("u_spacing");
  const uFade = uniform("u_fade");
  const uWash = uniform("u_wash");
  const uWashAlpha = uniform("u_washAlpha");
  const uRelief = uniform("u_relief");
  const uTint = uniform("u_tint");
  const uGamma = uniform("u_gamma");
  const uGrainCell = uniform("u_grainCell");
  const uGrainAlpha = uniform("u_grainAlpha");
  const uGrainDrift = uniform("u_grainDrift");
  const uInk = uniform("u_ink");
  const uSand = uniform("u_sand");

  gl.disable(gl.DEPTH_TEST);
  /* O quad cobre a viewport inteira e o shader escreve premultiplicado: não há
   * o que misturar dentro do canvas — quem compõe sobre a página é o
   * compositor do navegador. */
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * O wash do tema, interpolado no compasso da troca de tema.
   *
   * `washStartedAt` em `-Infinity` significa "já assentado": é o estado de
   * repouso e o de quem trocou de tema com o véu apagado (não há transição a
   * animar embaixo de um canvas que ninguém está vendo).
   */
  let washFrom = initialWash;
  let washTo = initialWash;
  let washStartedAt = Number.NEGATIVE_INFINITY;

  /** Fast-fade da saída: `fadeStartedAt` marca o começo; 0 é dissolvido. */
  let fadeStartedAt = Number.NEGATIVE_INFINITY;
  let fastExitRunning = false;

  const washAt = (now: number): StageWash => {
    const elapsed = now - washStartedAt;
    if (!Number.isFinite(elapsed)) return washTo;
    const duration = ZenMotionTokens.timings.themeMs;
    if (elapsed >= duration) return washTo;
    return blendWash(washFrom, washTo, cubicBezierEase(ZenMotionTokens.easings.enter, elapsed / duration));
  };

  const fadeAt = (now: number): number => zenFade(now - fadeStartedAt);

  let ratio = 1;
  let viewWidth = 0;
  let viewHeight = 0;
  let reach = 1;
  let box: ZenWindowBox | null = null;
  let state = createZenMotion();
  let lit = false;
  let frame = 0;
  let last = 0;
  let paintedAt = 0;
  let destroyed = false;

  /** Ajusta o bitmap ao tamanho atual do véu. */
  const fit = (): boolean => {
    const nextWidth = Math.round(canvas.clientWidth);
    const nextHeight = Math.round(canvas.clientHeight);
    if (!nextWidth || !nextHeight) return false;

    ratio = Math.min(window.devicePixelRatio || 1, 2);
    const bitmapWidth = Math.round(nextWidth * ratio);
    const bitmapHeight = Math.round(nextHeight * ratio);
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
    }
    gl.viewport(0, 0, bitmapWidth, bitmapHeight);

    viewWidth = nextWidth;
    viewHeight = nextHeight;
    return true;
  };

  /** O canto mais longe da janela: até onde a frente precisa chegar. */
  const fitReach = () => {
    if (!box) {
      reach = Math.hypot(viewWidth, viewHeight);
      return;
    }
    reach = Math.max(
      distanceToWindow(0, 0, box),
      distanceToWindow(viewWidth, 0, box),
      distanceToWindow(0, viewHeight, box),
      distanceToWindow(viewWidth, viewHeight, box),
    );
  };

  const clear = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const draw = (now: number) => {
    if (!box) {
      clear();
      return;
    }

    const spread = state.progress;
    const exposure = zenExposure(spread);
    const breath = Math.sin(state.breath) * ZenFieldTokens.breathPx;
    const wash = washAt(now);

    gl.useProgram(program);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uDpr, ratio);
    gl.uniform4f(uWindow, box.cx, box.cy, box.halfWidth, box.halfHeight);
    gl.uniform1f(uRadius, box.radius);
    gl.uniform1f(uIntensity, exposure);
    gl.uniform1f(uSpread, spread);
    gl.uniform1f(uReach, reach);
    gl.uniform1f(uFeather, ZenFieldTokens.spreadFeather);
    gl.uniform1f(uBreath, breath);
    gl.uniform1f(uTime, state.elapsed);
    gl.uniform1f(uSpacing, ZenFieldTokens.spacingPx);
    gl.uniform1f(uFade, ZenFieldTokens.fadePx);
    gl.uniform1f(uWash, ZenFieldTokens.washPx);
    /* A saída rápida mexe só na opacidade do véu: o resto da conta do shader
     *  fica exatamente onde estava, então o campo some sem rampa de spread. */
    gl.uniform1f(uWashAlpha, ZenFieldTokens.washAlpha * fadeAt(now));
    gl.uniform1f(uRelief, ZenFieldTokens.ridgeRelief);
    gl.uniform1f(uTint, ZenFieldTokens.ridgeTint);
    gl.uniform1f(uGamma, ZenFieldTokens.profileGamma);
    gl.uniform1f(uGrainCell, ZenFieldTokens.grainPx);
    gl.uniform1f(uGrainAlpha, ZenFieldTokens.grainAlpha);
    gl.uniform1f(uGrainDrift, ZenFieldTokens.grainDriftPx);
    gl.uniform3f(uInk, wash.ink[0] / 255, wash.ink[1] / 255, wash.ink[2] / 255);
    gl.uniform3f(uSand, wash.sand[0] / 255, wash.sand[1] / 255, wash.sand[2] / 255);

    clear();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const paint = (now: number = performance.now()) => draw(now);

  const tick = (now: number) => {
    frame = 0;
    if (destroyed) return;

    /* Saída rápida: o spread fica congelado e só a opacidade cai. Um quadro por
     *  vez (sem o passo de 30fps): são 150ms, e um degrau aqui apareceria. */
    if (fastExitRunning) {
      if (fadeAt(now) <= 0) {
        fastExitRunning = false;
        fadeStartedAt = Number.NEGATIVE_INFINITY;
        state = createZenMotion();
        clear();
        return;
      }
      paint(now);
      frame = window.requestAnimationFrame(tick);
      return;
    }

    const dt = last ? now - last : FRAME_INTERVAL;
    last = now;
    state = stepZenMotion(state, { dtMs: dt, lit });

    if (!lit && zenAtRest(state)) {
      clear();
      return;
    }

    if (now - paintedAt < FRAME_INTERVAL - 1) {
      frame = window.requestAnimationFrame(tick);
      return;
    }
    paintedAt = now;
    paint(now);
    frame = window.requestAnimationFrame(tick);
  };

  const resume = () => {
    if (frame || destroyed) return;
    last = 0;
    paintedAt = 0;
    frame = window.requestAnimationFrame(tick);
  };

  const hold = () => {
    if (!frame) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
  };

  const measure = () => {
    box = readBox();
    fitReach();
  };

  const setLit = (next: boolean) => {
    if (next === lit || destroyed) return;
    lit = next;

    if (!next) {
      /* A saída também precisa de laço: é ele que dissolve as cristas. */
      if (reduced()) {
        /* Movimento reduzido: o quadro é único, então não há o que animar e não
         *  há o que limpar — quem dissolve é a opacidade do CSS. */
        state = createZenMotion();
        return;
      }
      resume();
      return;
    }

    /* Reacender durante um fast-fade cancela a dissolução: o campo volta a
     *  crescer de onde parou, com a cor que estiver valendo. */
    fastExitRunning = false;
    fadeStartedAt = Number.NEGATIVE_INFINITY;

    if (!fit()) {
      lit = false;
      return;
    }
    measure();

    if (reduced()) {
      /* Movimento reduzido: o campo entra completo e para. Um quadro, sem laço. */
      state = { progress: 1, breath: 0, elapsed: 0 };
      paint();
      return;
    }
    state = createZenMotion();
    resume();
  };

  const fastExit = () => {
    if (destroyed) return;

    /* Nada no ar: nem aceso, nem saindo. Não há o que dissolver. */
    if (!lit && zenAtRest(state) && !fastExitRunning) return;

    lit = false;

    if (reduced()) {
      /* Movimento reduzido: sem animação — o quadro é único, então some. */
      state = createZenMotion();
      fastExitRunning = false;
      fadeStartedAt = Number.NEGATIVE_INFINITY;
      clear();
      return;
    }

    if (!fastExitRunning) {
      fastExitRunning = true;
      fadeStartedAt = performance.now();
    }
    resume();
  };

  const setWash = (next: StageWash) => {
    if (destroyed) return;
    if (
      next.ink[0] === washTo.ink[0] &&
      next.ink[1] === washTo.ink[1] &&
      next.ink[2] === washTo.ink[2] &&
      next.sand[0] === washTo.sand[0] &&
      next.sand[1] === washTo.sand[1] &&
      next.sand[2] === washTo.sand[2]
    ) {
      return;
    }

    const now = performance.now();
    /* Troca no meio de outra troca: congela o valor corrente e parte dele. */
    washFrom = washAt(now);
    washTo = next;
    washStartedAt = now;

    if (!lit) {
      /* Apagado, não há transição a animar: o próximo acendimento já sai com a
       *  cor nova. */
      washFrom = next;
      washStartedAt = Number.NEGATIVE_INFINITY;
      return;
    }

    if (reduced()) {
      /* Movimento reduzido: um quadro, sem interpolação. */
      washFrom = next;
      washStartedAt = Number.NEGATIVE_INFINITY;
      paint(now);
    }
  };

  const remeasure = () => {
    if (!lit || destroyed) return;
    if (!fit()) return;
    measure();
    if (reduced()) paint();
    else resume();
  };

  const onVisibility = () => {
    if (document.hidden) hold();
    else if (lit || fastExitRunning) resume();
  };

  document.addEventListener("visibilitychange", onVisibility);

  return {
    setLit,
    setWash,
    fastExit,
    remeasure,
    destroy: () => {
      destroyed = true;
      fastExitRunning = false;
      hold();
      document.removeEventListener("visibilitychange", onVisibility);
      clear();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      box = null;
    },
  };
}
