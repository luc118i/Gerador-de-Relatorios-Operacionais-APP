/** Geometria da capa do quadro — compartilhada entre a faixa real (página) e o
 *  mini editor, pra os dois mostrarem exatamente o mesmo recorte.
 *
 *  `f` = aspectImagem / aspectFaixa (larg/alt de cada um).
 *  `zoom` 1 = preenche a faixa (mais zoom, recorte); 0 = imagem inteira. */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Fração da largura da faixa ocupada pela imagem — vira `background-size: X% auto`. */
export function coverWidthFraction(f: number, zoom: number): number {
  if (!(f > 0) || f >= 1) return 1; // imagem já é mais "larga" que a faixa
  return f + (1 - f) * clamp01(zoom);
}

/** Fração da altura da imagem que fica visível na faixa (tamanho da "janela"). */
export function coverVisibleFraction(f: number, zoom: number): number {
  return Math.min(1, f / coverWidthFraction(f, zoom));
}
