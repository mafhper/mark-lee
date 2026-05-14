import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CtaCopy, Locale, REPO_URL, pathFor } from "@/i18n";

interface SectionLabelProps {
  children: ReactNode;
}

export const SectionLabel = ({ children }: SectionLabelProps) => (
  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-label-foreground">
    {children}
  </span>
);

interface HeroSectionProps {
  label: string;
  title: string;
  description: string;
  mockup?: ReactNode;
}

export const HeroSection = ({ label, title, description, mockup }: HeroSectionProps) => (
  <section className="relative min-h-[calc(92svh-3.5rem)] overflow-x-clip overflow-y-visible pb-4 md:pb-8">
    <HeroSpaceBackground />
    <div className="hero-space-gradient pointer-events-none absolute inset-0" />
    <div className="container relative flex min-h-[calc(92svh-3.5rem)] flex-col justify-center pt-14 pb-0 md:pt-20">
      <div className="mx-auto max-w-6xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel>{label}</SectionLabel>
          <h1 className="mx-auto mt-4 max-w-none text-4xl font-bold leading-[1.08] tracking-tight text-gradient-hero md:text-[3.4rem] lg:whitespace-nowrap">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {description}
          </p>
        </motion.div>
      </div>
        {mockup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            whileHover={{ y: -6, scale: 1.012 }}
            className="hero-mockup-shell mx-auto mt-12 w-full max-w-4xl"
          >
            {mockup}
          </motion.div>
        )}
    </div>
  </section>
);

const vertexShaderSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.54;
    mat2 rotate = mat2(0.82, -0.57, 0.57, 0.82);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rotate * p * 2.03 + vec2(0.19, 0.07);
      amplitude *= 0.52;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 center = vec2(0.5, 0.70) + (uPointer - 0.5) * 0.025;
    vec2 p = uv - center;
    p.x *= uResolution.x / uResolution.y;

    float distanceFromCenter = length(p);
    vec2 direction = normalize(p + 0.0001);

    vec3 deep = vec3(0.015, 0.014, 0.024);
    vec3 midnight = vec3(0.025, 0.048, 0.085);
    vec3 cyan = vec3(0.03, 0.70, 0.75);
    vec3 emerald = vec3(0.02, 0.62, 0.42);
    vec3 magenta = vec3(0.82, 0.06, 0.30);
    vec3 violet = vec3(0.28, 0.12, 0.78);
    vec3 amber = vec3(0.95, 0.56, 0.16);

    float travel = uTime * 0.22;
    vec2 q = p;
    q.x += fbm(p * 1.15 + vec2(travel * 0.28, -0.12)) * 0.18;
    q.y += fbm(p.yx * 1.45 - vec2(0.18, travel * 0.22)) * 0.12;

    vec3 color = mix(deep, midnight, smoothstep(-0.38, 0.78, q.y + q.x * 0.22));
    float galaxy = smoothstep(0.78, 0.0, distanceFromCenter) * 0.18;
    color += vec3(0.20, 0.34, 0.48) * galaxy;

    float curveA = 0.18 * sin(q.x * 2.15 + travel * 1.2) + 0.08 * sin(q.x * 5.4 - travel * 0.8) - 0.03;
    float curveB = -0.22 + 0.12 * sin(q.x * 2.8 - travel * 0.9) + 0.06 * sin(q.x * 7.0 + 1.5);
    float curveC = 0.34 + 0.10 * sin(q.x * 2.1 + 2.4) - 0.05 * cos(q.x * 5.2 - travel);

    float bandA = exp(-pow(abs(q.y - curveA) / 0.18, 2.0));
    float bandB = exp(-pow(abs(q.y - curveB) / 0.23, 2.0));
    float bandC = exp(-pow(abs(q.y - curveC) / 0.28, 2.0));
    float veil = fbm(q * 2.0 + vec2(travel * 0.18, -travel * 0.08));
    float fine = fbm(q * 5.2 - vec2(travel * 0.32, travel * 0.04));

    color += mix(cyan, emerald, smoothstep(0.18, 0.88, veil)) * bandA * 0.46;
    color += mix(magenta, violet, smoothstep(0.12, 0.82, fine)) * bandB * 0.36;
    color += mix(violet, amber, smoothstep(0.24, 0.92, veil)) * bandC * 0.22;

    float distantGlow = smoothstep(0.36, 0.0, distanceFromCenter);
    color += vec3(0.92, 0.58, 0.22) * distantGlow * 0.035;
    color += cyan * smoothstep(0.72, 0.0, abs(q.x + 0.42)) * smoothstep(0.78, -0.16, q.y) * 0.035;
    color += magenta * smoothstep(0.68, 0.0, abs(q.x - 0.54)) * smoothstep(0.66, -0.28, q.y) * 0.028;

    float vignette = smoothstep(0.45, 1.28, length(uv - vec2(0.5, 0.48)));
    color *= 1.0 - vignette * 0.72;
    color = pow(color, vec3(0.92));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const compileShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const HeroSpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    try {
      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      program = gl.createProgram();
      if (!program) throw new Error("Unable to create WebGL program");
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("WebGL program link failed");
      buffer = gl.createBuffer();
      if (!buffer) throw new Error("Unable to create WebGL buffer");
    } catch {
      return;
    }
    if (!program || !buffer) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const meshProgram = program;
    const meshBuffer = buffer;
    const positionLocation = gl.getAttribLocation(meshProgram, "aPosition");
    const timeLocation = gl.getUniformLocation(meshProgram, "uTime");
    const resolutionLocation = gl.getUniformLocation(meshProgram, "uResolution");
    const pointerLocation = gl.getUniformLocation(meshProgram, "uPointer");

    gl.bindBuffer(gl.ARRAY_BUFFER, meshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(meshProgram);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (time: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      gl.useProgram(meshProgram);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.tx = event.clientX / Math.max(1, window.innerWidth);
      pointer.ty = event.clientY / Math.max(1, window.innerHeight);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      gl.deleteBuffer(meshBuffer);
      gl.deleteProgram(meshProgram);
    };
  }, []);

  return (
    <div className="hero-space-backdrop pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="hero-space-backdrop__fallback" />
      <canvas ref={canvasRef} className="hero-space-backdrop__canvas" />
    </div>
  );
};

interface FeatureRowProps {
  label: string;
  title: string;
  description: string;
  highlights?: string[];
  mockup?: ReactNode;
  reversed?: boolean;
}

export const FeatureRow = ({
  label,
  title,
  description,
  highlights,
  mockup,
  reversed,
}: FeatureRowProps) => (
  <div className={`grid items-center gap-12 md:grid-cols-2 md:gap-16 ${reversed ? "md:[direction:rtl]" : ""}`}>
    <div className={reversed ? "md:[direction:ltr]" : ""}>
      <SectionLabel>{label}</SectionLabel>
      <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
      {highlights && highlights.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
    {mockup && <div className={reversed ? "md:[direction:ltr]" : ""}>{mockup}</div>}
  </div>
);

interface PageCtaSectionProps {
  locale: Locale;
  copy: CtaCopy;
}

export const PageCtaSection = ({ locale, copy }: PageCtaSectionProps) => (
  <section className="border-t border-border/50">
    <div className="container py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-xl border border-border/50"
      >
        <div className="absolute inset-0 bg-gradient-card" />
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="relative p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{copy.title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{copy.description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={pathFor(locale, "downloads")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              {copy.primaryCta}
              <ArrowRight size={14} />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
            >
              {copy.secondaryCta}
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

interface MockupCardProps {
  title: string;
  subtitle?: string;
  tabs?: string[];
  activeTab?: number;
  children?: ReactNode;
  badge?: string;
}

export const MockupCard = ({ title, subtitle, tabs, activeTab = 0, children, badge }: MockupCardProps) => (
  <div className="mockup-card">
    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-label-foreground">{title}</span>
      </div>
      {badge && <span className="text-[11px] text-muted-foreground">{badge}</span>}
    </div>
    {subtitle && <p className="px-4 pt-2 text-xs text-muted-foreground">{subtitle}</p>}
    <div className="min-h-[140px] p-4">
      {children || (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="h-24 w-12 rounded bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </div>
      )}
    </div>
    {tabs && (
      <div className="flex gap-2 border-t border-border/50 px-4 py-2.5">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={`rounded px-2 py-0.5 text-[11px] ${
              i === activeTab ? "bg-secondary font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
    )}
  </div>
);
