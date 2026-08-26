import { useEffect, useRef } from "react";

/**
 * Fundo animado em WebGL usado nas telas de carregamento.
 *
 * Porta o fragment shader do "Copy Shader Animation Component (Community)"
 * — arcos de luz finos pulsando pra fora do centro, com franja cromática —
 * mas sem depender de three.js e com a paleta puxada pro azul da marca
 * (#3a6ee8). Respeita `prefers-reduced-motion`: nesse caso desenha um único
 * quadro estático.
 */
export function ShaderBackdrop({
  className = "",
  scale = 1,
  speed = 0.45,
  wave = 1.4,
  chroma = 0,
}: {
  className?: string;
  /** >1 afasta a câmera e mostra mais arcos (útil em faixas estreitas). */
  scale?: number;
  /** Multiplica a velocidade da animação (1 ≈ ritmo do shader original). */
  speed?: number;
  /**
   * Atraso propagado ao longo da diagonal: cada faixa começa o movimento
   * um pouco depois da anterior, criando o efeito de onda percorrendo os
   * elementos (1 → 2 → 3 → …). 0 = todas as faixas juntas.
   */
  wave?: number;
  /**
   * Intensidade da aberração cromática (franja R/G/B). 0 = linhas de uma
   * cor só, sem "choque" de cores; ~0.5 = leve; 1 = como o shader original.
   */
  chroma?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  const speedRef = useRef(speed);
  const waveRef = useRef(wave);
  const chromaRef = useRef(chroma);
  scaleRef.current = scale;
  speedRef.current = speed;
  waveRef.current = wave;
  chromaRef.current = chroma;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { antialias: true, alpha: false }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const vertexSrc = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Núcleo do shader original: 1/abs(...) gera linhas finas e brilhantes;
    // length(uv) as curva. Ajustes para tirar a sensação "brusca":
    //  1. `phase` é onda triangular (sobe e desce) no lugar de fract() —
    //     sem o salto seco no fim do ciclo;
    //  2. `delay` propaga a animação pela diagonal (uv0.x + uv0.y): cada
    //     faixa entra em movimento depois da anterior (onda 1 → 2 → 3 → …);
    //  3. o brilho de cada faixa é calculado uma vez (cinza) e só então
    //     tingido de azul. A franja R/G/B ("choque de cores") vira opcional
    //     via uChroma e fica desligada por padrão;
    //  4. tone-map `x/(1+x)`: os picos saturam suave em vez de estourar.
    const fragmentSrc = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float uScale;
      uniform float uWave;
      uniform float uChroma;

      // Onda triangular 0→1→0, contínua (sem salto no fim do ciclo).
      float tri(float x) {
        return abs(fract(x) - 0.5) * 2.0;
      }

      // Brilho acumulado das linhas para um deslocamento de tempo dado.
      float lines(vec2 uv, float t) {
        float lineWidth = 0.0022;
        float acc = 0.0;
        for (int i = 0; i < 5; i++) {
          float phase = tri(t + float(i) * 0.01);
          acc += lineWidth * float(i * i) /
            abs(phase * 4.0 - length(uv) + mod(uv.x + uv.y, 0.2));
        }
        return acc;
      }

      void main(void) {
        vec2 uv0 = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        vec2 uv = uv0 * uScale;

        // Tempo base + atraso propagado pela diagonal (independente do zoom).
        float t = time * 0.05 - (uv0.x + uv0.y) * uWave;

        float g = lines(uv, t);
        vec3 lum = vec3(g);
        if (uChroma > 0.001) {
          // Franja cromática suave: separa R e B no tempo.
          lum.r = mix(g, lines(uv, t - 0.008 * uChroma), uChroma);
          lum.b = mix(g, lines(uv, t + 0.008 * uChroma), uChroma);
        }

        vec3 col = lum * vec3(0.30, 0.55, 1.25);   // tom azul da marca
        col = col / (1.0 + col);                    // roll-off suave dos picos
        col += vec3(0.02, 0.03, 0.07);              // base escura azulada
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );
    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, "resolution");
    const timeLoc = gl.getUniformLocation(program, "time");
    const scaleLoc = gl.getUniformLocation(program, "uScale");
    const waveLoc = gl.getUniformLocation(program, "uWave");
    const chromaLoc = gl.getUniformLocation(program, "uChroma");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let time = 1.0;
    let last = performance.now();
    let faded = false;

    // Entrada suave: o canvas nasce transparente e aparece após o 1º quadro.
    const revealSoon = () => {
      if (faded) return;
      faded = true;
      requestAnimationFrame(() => {
        canvas.style.opacity = "1";
      });
    };

    const render = (now: number) => {
      // Passo por segundo (independente do FPS): 3.0 ≈ ritmo do shader
      // original a 60fps. `speed` calibra por cima disso.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt * 3.0 * speedRef.current;
      gl.uniform1f(timeLoc, time);
      gl.uniform1f(scaleLoc, scaleRef.current);
      gl.uniform1f(waveLoc, waveRef.current);
      gl.uniform1f(chromaLoc, chromaRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      revealSoon();
      raf = requestAnimationFrame(render);
    };

    if (reduceMotion) {
      time = 30.0;
      gl.uniform1f(timeLoc, time);
      gl.uniform1f(scaleLoc, scaleRef.current);
      gl.uniform1f(waveLoc, waveRef.current);
      gl.uniform1f(chromaLoc, chromaRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      revealSoon();
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        opacity: 0,
        transition: "opacity 700ms ease",
      }}
    />
  );
}
