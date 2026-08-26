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
  speed = 1,
}: {
  className?: string;
  /** >1 afasta a câmera e mostra mais arcos (útil em faixas estreitas). */
  scale?: number;
  /** Multiplica a velocidade da animação. */
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  const speedRef = useRef(speed);
  scaleRef.current = scale;
  speedRef.current = speed;

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

    // Mesmo núcleo do shader original: 1/abs(...) gera linhas finas e
    // brilhantes, length(uv) as torna concêntricas, o laço j cria a
    // aberração cromática (R/G/B com offset de tempo). No fim, multiplicamos
    // por um tint azul e somamos uma base escura azulada.
    const fragmentSrc = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float uScale;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        uv *= uScale;
        float t = time * 0.05;
        float lineWidth = 0.002;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) /
              abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0 - length(uv) + mod(uv.x + uv.y, 0.2));
          }
        }

        vec3 tint = vec3(0.35, 0.55, 1.15);       // empurra o brilho pro azul da marca
        vec3 base = vec3(0.02, 0.03, 0.07);        // fundo escuro azulado (~#0b1220)
        gl_FragColor = vec4(base + color * tint, 1.0);
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

    const render = () => {
      time += 0.05 * speedRef.current;
      gl.uniform1f(timeLoc, time);
      gl.uniform1f(scaleLoc, scaleRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };

    if (reduceMotion) {
      time = 30.0;
      gl.uniform1f(timeLoc, time);
      gl.uniform1f(scaleLoc, scaleRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      render();
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
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
