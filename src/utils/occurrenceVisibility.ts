import type { OccurrenceDTO } from "../domain/occurrences";

/**
 * Normaliza texto pra busca/comparação: sem acento, minúsculo, sem espaços
 * nas pontas. Casa "São Paulo" com "sao paulo".
 */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type MineInput = Pick<OccurrenceDTO, "analisadoPor" | "analisadoPorUserId">;

/**
 * Fábrica do predicado "esta ocorrência é minha" — cada analista vê só o que
 * registrou. Prioriza `analisadoPorUserId` (estável a rename/grafia); cai pro
 * nome-texto comparado contra todos os nomes que o usuário já usou
 * (`nameAliases`, ver `profileNameAliases` no AuthContext) para ocorrências
 * sem esse vínculo (importadas via GAS, ou anteriores à coluna).
 *
 * Usado por `home.tsx` e pela Central de Ocorrências. O Admin (PIN) não usa
 * este filtro — enxerga tudo.
 */
export function makeIsMine(opts: {
  userId?: string | null;
  nameAliases: Set<string>;
}) {
  return (o: MineInput): boolean =>
    o.analisadoPorUserId
      ? o.analisadoPorUserId === opts.userId
      : opts.nameAliases.has(normalizeText(o.analisadoPor ?? ""));
}
