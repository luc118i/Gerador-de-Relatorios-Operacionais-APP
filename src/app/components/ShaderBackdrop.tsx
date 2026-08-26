import { useEffect, useRef } from "react";

/**
 * Fundo animado em WebGL — porta fiel do fragment shader do
 * "Copy Shader Animation Component (Community)": linhas finas e brilhantes
 * pulsando pra fora do centro, com franja cromática R/G/B, sobre fundo
 * preto. Sem depender de three.js.
 *
 * Com as props no padrão, o resultado é idêntico ao shader original.
 * As props são só calibragem opcional (usadas, por ex., no dock estreito):
 *  - `scale`  : afasta a "câmera" (mostra mais linhas numa faixa curta)
 *  - `speed`  : multiplica a velocidade (1 = ritmo original)
 *  - `wave`   : atraso propagado pela diagonal (0 = desligado, como o original)
 *  - `chroma` : intensidade da franja R/G/B (1 = original, 0 = uma cor só)
 *
 * Se o WebGL não estiver disponível ou falhar, o componente simplesmente
 * não desenha nada (nunca lança erro que derrube a árvore React).
 * Respeita `prefers-reduced-motion` (desenha um único quadro estático).
 */
export function ShaderBackdrop({
  className = "",
  scale = 1,
  speed = 1,
  wave = 0,
  chroma = 1,
  light = false,
}: {
  className?: string;
  scale?: number;
  speed?: number;
  wave?: number;
  chroma?: number;
  /** true = paleta clara (fundo quase branco, fios azuis) para telas claras. */
  light?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  const speedRef = useRef(speed);
  const waveRef = useRef(wave);
  const chromaRef = useRef(chroma);
  const lightRef = useRef(light);
  scaleRef.current = scale;
  speedRef.current = speed;
  waveRef.current = wave;
  chromaRef.current = chroma;
  lightRef.current = light;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    let disposed = false;
    let cleanupGl: (() => void) | null = null;

    // Toda a inicialização WebGL fica dentro de um try/catch: qualquer falha
    // (contexto negado, shader que não compila, GPU sem recursos) apenas
    // aborta o efeito silenciosamente, sem derrubar o React.
    try {
      const gl =
        (canvas.getContext("webgl", { antialias: true, alpha: false }) as
          | WebGLRenderingContext
          | null) ||
        (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
      if (!gl) return;

      const vertexSrc = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      // Núcleo idêntico ao shader original: 1/abs(...) gera as linhas finas,
      // length(uv) as curva, o laço j desloca R/G/B no tempo (franja cromática).
      // uScale/uWave/uChroma são identidade nos valores padrão (1 / 0 / 1).
      const fragmentSrc = `
        precision highp float;
        uniform vec2 resolution;
        uniform float time;
        uniform float uScale;
        uniform float uWave;
        uniform float uChroma;
        uniform float uLight;

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          uv *= uScale;
          float lineWidth = 0.002;

          float t = time * 0.05 - (uv.x + uv.y) * uWave;

          vec3 color = vec3(0.0);
          for (int j = 0; j < 3; j++) {
            for (int i = 0; i < 5; i++) {
              color[j] += lineWidth * float(i * i) /
                abs(fract(t - 0.01 * float(j) * uChroma + float(i) * 0.01) * 5.0 - length(uv) + mod(uv.x + uv.y, 0.2));
            }
          }

          // Paleta clara opcional: quase branco escurecido para o azul da
          // marca onde os fios passam (uLight = 1). uLight = 0 = original.
          vec3 ink = color / (1.0 + color);
          vec3 lightCol = mix(vec3(0.925, 0.942, 0.965), vec3(0.16, 0.40, 0.92), ink);

          gl_FragColor = vec4(mix(color, lightCol, uLight), 1.0);
        }
      `;

      const compile = (type: number, src: string): WebGLShader | null => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = compile(gl.VERTEX_SHADER, vertexSrc);
      const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
      const program = gl.createProgram();
      if (!vs || !fs || !program) return;

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return;
      }
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
      const lightLoc = gl.getUniformLocation(program, "uLight");

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      };
      resize();
      window.addEventListener("resize", resize);

      const onLost = (e: Event) => {
        e.preventDefault();
        cancelAnimationFrame(raf);
      };
      canvas.addEventListener("webglcontextlost", onLost as EventListener);

      const reduceMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      let time = 1.0;
      let lastT = performance.now();
      let faded = false;

      const revealSoon = () => {
        if (faded) return;
        faded = true;
        requestAnimationFrame(() => {
          if (!disposed) canvas.style.opacity = "1";
        });
      };

      const draw = () => {
        if (gl.isContextLost()) return;
        gl.uniform1f(timeLoc, time);
        gl.uniform1f(scaleLoc, scaleRef.current);
        gl.uniform1f(waveLoc, waveRef.current);
        gl.uniform1f(chromaLoc, chromaRef.current);
        gl.uniform1f(lightLoc, lightRef.current ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        revealSoon();
      };

      const render = (now: number) => {
        // Passo por segundo (independente do FPS): 3.0 = +0.05/quadro a 60fps.
        const dt = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;
        time += dt * 3.0 * speedRef.current;
        draw();
        raf = requestAnimationFrame(render);
      };

      if (reduceMotion) {
        time = 30.0;
        draw();
      } else {
        raf = requestAnimationFrame(render);
      }

      cleanupGl = () => {
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("webglcontextlost", onLost as EventListener);
        try {
          gl.deleteProgram(program);
          gl.deleteBuffer(buffer);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          /* contexto já perdido */
        }
      };
    } catch {
      // WebGL indisponível/instável: não desenha nada, mas não quebra a tela.
      return;
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanupGl?.();
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
